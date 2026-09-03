import initSqlJs, { Database } from 'sql.js';
import { EmployeeProfile } from '../../../domain/models/Contract';
import { RecurringCommitment } from '../../../domain/models/Deductions';
import {
  DEFAULT_GEMMA_PROFILE,
  DEFAULT_GEMMA_COMMITMENTS,
} from '../../../domain/constants/defaultProfile';
import { DEFAULT_GEMMA_JUNE_SHIFTS } from '../../../domain/constants/defaultShifts';

const IDB_NAME = 'nhs_wage_calc_sqlite_idb';
const IDB_STORE = 'sqlite_store';
const IDB_KEY = 'sqlite_db_binary';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

export const openIdb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const persistToIndexedDb = async (db: Database): Promise<void> => {
  try {
    const binary = db.export();
    const idb = await openIdb();
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(binary, IDB_KEY);
  } catch (e) {
    console.error('Failed to save SQLite binary to IndexedDB', e);
  }
};

export const loadFromIndexedDb = async (): Promise<Uint8Array | null> => {
  try {
    const idb = await openIdb();
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        if (req.result instanceof Uint8Array) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const saveProfileSync = (db: Database, profile: EmployeeProfile): void => {
  db.run(
    `INSERT OR REPLACE INTO employee_profile (
      id, employee_name, job_title, department, location, band, contract_type,
      full_time_salary_fte, standard_full_time_hours, contracted_weekly_hours,
      custom_hourly_rate, tax_code, ni_category, pension_contribution_rate,
      tax_office_name, tax_office_ref, ni_number, employee_number, pay_method,
      years_of_service_tier, al_carry_over_hours, afc_absence_hourly_rate, al_base_hours_override
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.employeeName,
      profile.jobTitle,
      profile.department,
      profile.location,
      profile.band,
      profile.contractType,
      profile.fullTimeSalaryFte,
      profile.standardFullTimeHours,
      profile.contractedWeeklyHours,
      profile.customHourlyRate ?? null,
      profile.taxCode,
      profile.niCategory,
      profile.pensionContributionRate,
      profile.taxOfficeName,
      profile.taxOfficeRef,
      profile.niNumber,
      profile.employeeNumber,
      profile.payMethod,
      profile.yearsOfServiceTier || 'FIVE_TO_TEN',
      profile.annualLeaveCarryOverHours || 0,
      profile.afcAbsenceHourlyRateOverride ?? null,
      profile.annualLeaveBaseHoursOverride ?? null,
    ]
  );
};

export const saveCommitmentSync = (db: Database, commitment: RecurringCommitment): void => {
  db.run(
    'INSERT OR REPLACE INTO recurring_commitments (id, name, amount, is_pre_tax) VALUES (?, ?, ?, ?)',
    [commitment.id, commitment.name, commitment.amount, commitment.isPreTax ? 1 : 0]
  );
};

export const initializeSchema = (db: Database): void => {
  db.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      unpaid_break_minutes INTEGER NOT NULL,
      preset_type TEXT,
      override_band TEXT,
      custom_hourly_rate REAL,
      shift_type TEXT,
      unpaid_break_start_time TEXT,
      custom_enhancement_hourly_rate REAL,
      holiday_pay_hourly_rate REAL
    );

    CREATE TABLE IF NOT EXISTS employee_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      employee_name TEXT,
      job_title TEXT,
      department TEXT,
      location TEXT,
      band TEXT,
      contract_type TEXT,
      full_time_salary_fte REAL,
      standard_full_time_hours REAL,
      contracted_weekly_hours REAL,
      custom_hourly_rate REAL,
      tax_code TEXT,
      ni_category TEXT,
      pension_contribution_rate REAL,
      tax_office_name TEXT,
      tax_office_ref TEXT,
      ni_number TEXT,
      employee_number TEXT,
      pay_method TEXT
    );

    CREATE TABLE IF NOT EXISTS recurring_commitments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      is_pre_tax INTEGER DEFAULT 0
    );
  `);

  // Safe column migrations for existing SQLite databases
  try {
    db.run('ALTER TABLE shifts ADD COLUMN override_band TEXT');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE shifts ADD COLUMN custom_hourly_rate REAL');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE shifts ADD COLUMN shift_type TEXT');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE shifts ADD COLUMN unpaid_break_start_time TEXT');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE shifts ADD COLUMN custom_enhancement_hourly_rate REAL');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE shifts ADD COLUMN holiday_pay_hourly_rate REAL');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE shifts ADD COLUMN status TEXT');
  } catch {
    // Column already exists
  }
  try {
    db.run("ALTER TABLE employee_profile ADD COLUMN years_of_service_tier TEXT DEFAULT 'UNDER_5'");
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE employee_profile ADD COLUMN al_carry_over_hours REAL DEFAULT 0');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE employee_profile ADD COLUMN afc_absence_hourly_rate REAL');
  } catch {
    // Column already exists
  }
  try {
    db.run('ALTER TABLE employee_profile ADD COLUMN al_base_hours_override REAL');
  } catch {
    // Column already exists
  }

  // Check if profile exists, if not seed with default Gemma profile
  const profileRes = db.exec('SELECT COUNT(*) as count FROM employee_profile');
  const profileCount = profileRes[0]?.values[0]?.[0] as number;
  if (!profileCount) {
    saveProfileSync(db, DEFAULT_GEMMA_PROFILE);
  }

  // Check if commitments exist, if not seed with default commitments
  const commRes = db.exec('SELECT COUNT(*) as count FROM recurring_commitments');
  const commCount = commRes[0]?.values[0]?.[0] as number;
  if (!commCount) {
    for (const comm of DEFAULT_GEMMA_COMMITMENTS) {
      saveCommitmentSync(db, comm);
    }
  }

  // Check if shifts exist, if not seed with default June 2026 shifts
  const shiftRes = db.exec('SELECT COUNT(*) as count FROM shifts');
  const shiftCount = shiftRes[0]?.values[0]?.[0] as number;
  if (!shiftCount) {
    for (const shift of DEFAULT_GEMMA_JUNE_SHIFTS) {
      db.run(
        'INSERT INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate, shift_type, unpaid_break_start_time, custom_enhancement_hourly_rate, holiday_pay_hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          shift.id,
          shift.date,
          shift.startTime,
          shift.endTime,
          shift.unpaidBreakMinutes,
          shift.presetType || null,
          shift.overrideBand || null,
          shift.customHourlyRate ?? null,
          shift.shiftType || 'SUBSTANTIVE',
          shift.unpaidBreakStartTime ?? null,
          shift.customEnhancementHourlyRate ?? null,
          shift.holidayPayHourlyRate ?? null,
        ]
      );
    }
  }

  persistToIndexedDb(db);
};

export const getDb = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
    });

    const savedBinary = await loadFromIndexedDb();
    if (savedBinary) {
      try {
        dbInstance = new SQL.Database(savedBinary);
      } catch (e) {
        console.warn('Failed to load existing SQLite database from IndexedDB, creating new.', e);
        dbInstance = new SQL.Database();
      }
    } else {
      dbInstance = new SQL.Database();
    }

    initializeSchema(dbInstance);
    return dbInstance;
  })();

  return initPromise;
};

export const exportDatabaseBinary = async (): Promise<Uint8Array> => {
  const db = await getDb();
  return db.export();
};

export const importDatabaseBinary = async (binaryData: ArrayBuffer): Promise<void> => {
  const SQL = await initSqlJs({
    locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
  });
  dbInstance = new SQL.Database(new Uint8Array(binaryData));
  initializeSchema(dbInstance);
  await persistToIndexedDb(dbInstance);
};

/**
 * Resets db instance (useful for test isolation).
 */
export const resetDbInstanceForTesting = (): void => {
  dbInstance = null;
  initPromise = null;
};
