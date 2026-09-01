import initSqlJs, { Database } from 'sql.js';
import { Shift } from '../models/Shift';
import { EmployeeProfile } from '../models/Contract';
import { RecurringCommitment } from '../models/Deductions';
import { DEFAULT_GEMMA_PROFILE, DEFAULT_GEMMA_COMMITMENTS } from '../../hooks/useContractSettings';
import { DEFAULT_GEMMA_JUNE_SHIFTS } from '../constants/defaultShifts';

const IDB_NAME = 'nhs_wage_calc_sqlite_idb';
const IDB_STORE = 'sqlite_store';
const IDB_KEY = 'sqlite_db_binary';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

const openIdb = (): Promise<IDBDatabase> => {
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

const persistToIndexedDb = async (db: Database): Promise<void> => {
  try {
    const binary = db.export();
    const idb = await openIdb();
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(binary, IDB_KEY);
  } catch (e) {
    console.error('Failed to save SQLite binary to IndexedDB', e);
  }
};

const loadFromIndexedDb = async (): Promise<Uint8Array | null> => {
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

const saveProfileSync = (db: Database, profile: EmployeeProfile): void => {
  db.run(
    `INSERT OR REPLACE INTO employee_profile (
      id, employee_name, job_title, department, location, band, contract_type,
      full_time_salary_fte, standard_full_time_hours, contracted_weekly_hours,
      custom_hourly_rate, tax_code, ni_category, pension_contribution_rate,
      tax_office_name, tax_office_ref, ni_number, employee_number, pay_method,
      years_of_service_tier, al_carry_over_hours, afc_absence_hourly_rate
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      profile.yearsOfServiceTier || 'UNDER_5',
      profile.annualLeaveCarryOverHours || 0,
      profile.afcAbsenceHourlyRateOverride ?? null,
    ]
  );
};

const saveCommitmentSync = (db: Database, commitment: RecurringCommitment): void => {
  db.run(
    'INSERT OR REPLACE INTO recurring_commitments (id, name, amount, is_pre_tax) VALUES (?, ?, ?, ?)',
    [commitment.id, commitment.name, commitment.amount, commitment.isPreTax ? 1 : 0]
  );
};

const initializeSchema = (db: Database): void => {
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

// ==========================================
// SHIFTS CRUD
// ==========================================
export const getAllShifts = async (): Promise<Shift[]> => {
  const db = await getDb();
  const res = db.exec(
    'SELECT id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate, shift_type, unpaid_break_start_time, custom_enhancement_hourly_rate, holiday_pay_hourly_rate FROM shifts ORDER BY date ASC'
  );
  if (!res || res.length === 0) return [];

  const columns = res[0].columns;
  const values = res[0].values;

  return values.map((row) => {
    const rowObj: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      rowObj[col] = row[idx];
    });
    return {
      id: rowObj.id as string,
      date: rowObj.date as string,
      startTime: rowObj.start_time as string,
      endTime: rowObj.end_time as string,
      unpaidBreakMinutes: (rowObj.unpaid_break_minutes as number) || 0,
      presetType: rowObj.preset_type as Shift['presetType'],
      shiftType: (rowObj.shift_type as Shift['shiftType']) || 'SUBSTANTIVE',
      overrideBand: rowObj.override_band
        ? (rowObj.override_band as Shift['overrideBand'])
        : undefined,
      customHourlyRate: rowObj.custom_hourly_rate
        ? (rowObj.custom_hourly_rate as number)
        : undefined,
      unpaidBreakStartTime: rowObj.unpaid_break_start_time
        ? (rowObj.unpaid_break_start_time as string)
        : undefined,
      customEnhancementHourlyRate: rowObj.custom_enhancement_hourly_rate
        ? (rowObj.custom_enhancement_hourly_rate as number)
        : undefined,
      holidayPayHourlyRate: rowObj.holiday_pay_hourly_rate
        ? (rowObj.holiday_pay_hourly_rate as number)
        : undefined,
    };
  });
};

export const saveShift = async (shift: Shift): Promise<void> => {
  const db = await getDb();
  db.run(
    'INSERT OR REPLACE INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate, shift_type, unpaid_break_start_time, custom_enhancement_hourly_rate, holiday_pay_hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
  await persistToIndexedDb(db);
};

export const deleteShift = async (id: string): Promise<void> => {
  const db = await getDb();
  db.run('DELETE FROM shifts WHERE id = ?', [id]);
  await persistToIndexedDb(db);
};

export const clearMonthShifts = async (monthPrefix: string): Promise<void> => {
  const db = await getDb();
  db.run('DELETE FROM shifts WHERE date LIKE ?', [`${monthPrefix}%`]);
  await persistToIndexedDb(db);
};

export const replaceAllShifts = async (shifts: Shift[]): Promise<void> => {
  const db = await getDb();
  db.run('DELETE FROM shifts');
  for (const shift of shifts) {
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
  await persistToIndexedDb(db);
};

// ==========================================
// EMPLOYEE PROFILE CRUD
// ==========================================
export const getProfile = async (): Promise<EmployeeProfile> => {
  const db = await getDb();
  const res = db.exec(
    'SELECT employee_name, job_title, department, location, band, contract_type, full_time_salary_fte, standard_full_time_hours, contracted_weekly_hours, custom_hourly_rate, tax_code, ni_category, pension_contribution_rate, tax_office_name, tax_office_ref, ni_number, employee_number, pay_method, years_of_service_tier, al_carry_over_hours, afc_absence_hourly_rate FROM employee_profile WHERE id = 1'
  );
  if (!res || res.length === 0 || res[0].values.length === 0) {
    return DEFAULT_GEMMA_PROFILE;
  }

  const row = res[0].values[0];
  return {
    employeeName: row[0] as string,
    jobTitle: row[1] as string,
    department: row[2] as string,
    location: row[3] as string,
    band: row[4] as EmployeeProfile['band'],
    contractType: row[5] as EmployeeProfile['contractType'],
    fullTimeSalaryFte: row[6] as number,
    standardFullTimeHours: row[7] as number,
    contractedWeeklyHours: row[8] as number,
    customHourlyRate: row[9] ? (row[9] as number) : undefined,
    taxCode: row[10] as string,
    niCategory: row[11] as string,
    pensionContributionRate: row[12] as number,
    taxOfficeName: row[13] as string,
    taxOfficeRef: row[14] as string,
    niNumber: row[15] as string,
    employeeNumber: row[16] as string,
    payMethod: row[17] as string,
    yearsOfServiceTier: (row[18] as EmployeeProfile['yearsOfServiceTier']) || 'UNDER_5',
    annualLeaveCarryOverHours: (row[19] as number) || 0,
    afcAbsenceHourlyRateOverride: row[20] ? (row[20] as number) : undefined,
  };
};

export const saveProfile = async (profile: EmployeeProfile): Promise<void> => {
  const db = await getDb();
  saveProfileSync(db, profile);
  await persistToIndexedDb(db);
};

// ==========================================
// RECURRING COMMITMENTS CRUD
// ==========================================
export const getCommitments = async (): Promise<RecurringCommitment[]> => {
  const db = await getDb();
  const res = db.exec('SELECT id, name, amount, is_pre_tax FROM recurring_commitments');
  if (!res || res.length === 0) return DEFAULT_GEMMA_COMMITMENTS;

  return res[0].values.map((row) => ({
    id: row[0] as string,
    name: row[1] as string,
    amount: row[2] as number,
    isPreTax: Boolean(row[3]),
  }));
};

export const saveCommitment = async (commitment: RecurringCommitment): Promise<void> => {
  const db = await getDb();
  saveCommitmentSync(db, commitment);
  await persistToIndexedDb(db);
};

export const replaceAllCommitments = async (commitments: RecurringCommitment[]): Promise<void> => {
  const db = await getDb();
  db.run('DELETE FROM recurring_commitments');
  for (const comm of commitments) {
    saveCommitmentSync(db, comm);
  }
  await persistToIndexedDb(db);
};

export const deleteCommitment = async (id: string): Promise<void> => {
  const db = await getDb();
  db.run('DELETE FROM recurring_commitments WHERE id = ?', [id]);
  await persistToIndexedDb(db);
};

// ==========================================
// FULL JSON DATA STORE EXPORT / IMPORT
// ==========================================
export const exportFullDataPayload = async (): Promise<{
  version: number;
  lastModified: string;
  profile: EmployeeProfile;
  commitments: RecurringCommitment[];
  shifts: Shift[];
}> => {
  const [profile, commitments, shifts] = await Promise.all([
    getProfile(),
    getCommitments(),
    getAllShifts(),
  ]);

  const lastModified = localStorage.getItem('nhs_last_local_mutation') || new Date().toISOString();

  return {
    version: 1,
    lastModified,
    profile,
    commitments,
    shifts,
  };
};

export const importFullDataPayload = async (payload: {
  version: number;
  lastModified?: string;
  profile?: EmployeeProfile;
  commitments?: RecurringCommitment[];
  shifts?: Shift[];
}): Promise<void> => {
  const db = await getDb();
  if (payload.profile) {
    saveProfileSync(db, payload.profile);
  }
  if (payload.commitments) {
    db.run('DELETE FROM recurring_commitments');
    for (const comm of payload.commitments) {
      saveCommitmentSync(db, comm);
    }
  }
  if (payload.shifts) {
    db.run('DELETE FROM shifts');
    for (const shift of payload.shifts) {
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
  if (payload.lastModified) {
    localStorage.setItem('nhs_last_local_mutation', payload.lastModified);
  }
  await persistToIndexedDb(db);
};

// ==========================================
// EXPORT / IMPORT .SQLITE BINARY FILE
// ==========================================
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
