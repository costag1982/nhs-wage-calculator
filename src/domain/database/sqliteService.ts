import initSqlJs, { Database } from 'sql.js';
import { Shift } from '../models/Shift';
import { EmployeeProfile } from '../models/Contract';
import { RecurringCommitment } from '../models/Deductions';
import { DEFAULT_GEMMA_PROFILE, DEFAULT_GEMMA_COMMITMENTS } from '../../hooks/useContractSettings';
import { DEFAULT_GEMMA_JUNE_SHIFTS } from '../constants/defaultShifts';

const IDB_NAME = 'nhs_wage_calc_sqlite_idb';
const IDB_STORE = 'sqlite_store';
const IDB_KEY = 'sqlite_db_binary';

class SqliteStorage {
  private static db: Database | null = null;
  private static initPromise: Promise<Database> | null = null;

  public static async getDb(): Promise<Database> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
      });

      const savedBinary = await this.loadFromIndexedDb();
      if (savedBinary) {
        try {
          this.db = new SQL.Database(savedBinary);
        } catch (e) {
          console.warn('Failed to load existing SQLite database from IndexedDB, creating new.', e);
          this.db = new SQL.Database();
        }
      } else {
        this.db = new SQL.Database();
      }

      this.initializeSchema(this.db);
      return this.db;
    })();

    return this.initPromise;
  }

  private static initializeSchema(db: Database) {
    db.run(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        unpaid_break_minutes INTEGER NOT NULL,
        preset_type TEXT,
        override_band TEXT,
        custom_hourly_rate REAL
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

    // Check if profile exists, if not seed with default Gemma profile
    const profileRes = db.exec('SELECT COUNT(*) as count FROM employee_profile');
    const profileCount = profileRes[0]?.values[0]?.[0] as number;
    if (!profileCount) {
      this.saveProfileSync(db, DEFAULT_GEMMA_PROFILE);
    }

    // Check if commitments exist, if not seed with default commitments
    const commRes = db.exec('SELECT COUNT(*) as count FROM recurring_commitments');
    const commCount = commRes[0]?.values[0]?.[0] as number;
    if (!commCount) {
      for (const comm of DEFAULT_GEMMA_COMMITMENTS) {
        this.saveCommitmentSync(db, comm);
      }
    }

    // Check if shifts exist, if not seed with default June 2026 shifts
    const shiftRes = db.exec('SELECT COUNT(*) as count FROM shifts');
    const shiftCount = shiftRes[0]?.values[0]?.[0] as number;
    if (!shiftCount) {
      for (const shift of DEFAULT_GEMMA_JUNE_SHIFTS) {
        db.run(
          'INSERT INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            shift.id,
            shift.date,
            shift.startTime,
            shift.endTime,
            shift.unpaidBreakMinutes,
            shift.presetType || null,
            shift.overrideBand || null,
            shift.customHourlyRate ?? null,
          ]
        );
      }
    }

    this.persistToIndexedDb(db);
  }

  // ==========================================
  // SHIFTS CRUD
  // ==========================================
  public static async getAllShifts(): Promise<Shift[]> {
    const db = await this.getDb();
    const res = db.exec(
      'SELECT id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate FROM shifts ORDER BY date ASC'
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
        overrideBand: rowObj.override_band
          ? (rowObj.override_band as Shift['overrideBand'])
          : undefined,
        customHourlyRate: rowObj.custom_hourly_rate
          ? (rowObj.custom_hourly_rate as number)
          : undefined,
      };
    });
  }

  public static async saveShift(shift: Shift): Promise<void> {
    const db = await this.getDb();
    db.run(
      'INSERT OR REPLACE INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        shift.id,
        shift.date,
        shift.startTime,
        shift.endTime,
        shift.unpaidBreakMinutes,
        shift.presetType || null,
        shift.overrideBand || null,
        shift.customHourlyRate ?? null,
      ]
    );
    await this.persistToIndexedDb(db);
  }

  public static async deleteShift(id: string): Promise<void> {
    const db = await this.getDb();
    db.run('DELETE FROM shifts WHERE id = ?', [id]);
    await this.persistToIndexedDb(db);
  }

  public static async clearMonthShifts(monthPrefix: string): Promise<void> {
    const db = await this.getDb();
    db.run('DELETE FROM shifts WHERE date LIKE ?', [`${monthPrefix}%`]);
    await this.persistToIndexedDb(db);
  }

  public static async replaceAllShifts(shifts: Shift[]): Promise<void> {
    const db = await this.getDb();
    db.run('DELETE FROM shifts');
    for (const shift of shifts) {
      db.run(
        'INSERT INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          shift.id,
          shift.date,
          shift.startTime,
          shift.endTime,
          shift.unpaidBreakMinutes,
          shift.presetType || null,
          shift.overrideBand || null,
          shift.customHourlyRate ?? null,
        ]
      );
    }
    await this.persistToIndexedDb(db);
  }

  // ==========================================
  // EMPLOYEE PROFILE CRUD
  // ==========================================
  public static async getProfile(): Promise<EmployeeProfile> {
    const db = await this.getDb();
    const res = db.exec(
      'SELECT employee_name, job_title, department, location, band, contract_type, full_time_salary_fte, standard_full_time_hours, contracted_weekly_hours, custom_hourly_rate, tax_code, ni_category, pension_contribution_rate, tax_office_name, tax_office_ref, ni_number, employee_number, pay_method FROM employee_profile WHERE id = 1'
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
    };
  }

  public static async saveProfile(profile: EmployeeProfile): Promise<void> {
    const db = await this.getDb();
    this.saveProfileSync(db, profile);
    await this.persistToIndexedDb(db);
  }

  private static saveProfileSync(db: Database, profile: EmployeeProfile) {
    db.run(
      `INSERT OR REPLACE INTO employee_profile (
        id, employee_name, job_title, department, location, band, contract_type,
        full_time_salary_fte, standard_full_time_hours, contracted_weekly_hours,
        custom_hourly_rate, tax_code, ni_category, pension_contribution_rate,
        tax_office_name, tax_office_ref, ni_number, employee_number, pay_method
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );
  }

  // ==========================================
  // RECURRING COMMITMENTS CRUD
  // ==========================================
  public static async getCommitments(): Promise<RecurringCommitment[]> {
    const db = await this.getDb();
    const res = db.exec('SELECT id, name, amount, is_pre_tax FROM recurring_commitments');
    if (!res || res.length === 0) return DEFAULT_GEMMA_COMMITMENTS;

    return res[0].values.map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
      amount: row[2] as number,
      isPreTax: Boolean(row[3]),
    }));
  }

  public static async saveCommitment(commitment: RecurringCommitment): Promise<void> {
    const db = await this.getDb();
    this.saveCommitmentSync(db, commitment);
    await this.persistToIndexedDb(db);
  }

  private static saveCommitmentSync(db: Database, commitment: RecurringCommitment) {
    db.run(
      'INSERT OR REPLACE INTO recurring_commitments (id, name, amount, is_pre_tax) VALUES (?, ?, ?, ?)',
      [commitment.id, commitment.name, commitment.amount, commitment.isPreTax ? 1 : 0]
    );
  }

  public static async deleteCommitment(id: string): Promise<void> {
    const db = await this.getDb();
    db.run('DELETE FROM recurring_commitments WHERE id = ?', [id]);
    await this.persistToIndexedDb(db);
  }

  // ==========================================
  // EXPORT / IMPORT .SQLITE BINARY FILE
  // ==========================================
  public static async exportDatabaseBinary(): Promise<Uint8Array> {
    const db = await this.getDb();
    return db.export();
  }

  public static async importDatabaseBinary(binaryData: ArrayBuffer): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
    });
    this.db = new SQL.Database(new Uint8Array(binaryData));
    this.initializeSchema(this.db);
    await this.persistToIndexedDb(this.db);
  }

  // ==========================================
  // INDEXEDDB BINARY PERSISTENCE
  // ==========================================
  private static openIdb(): Promise<IDBDatabase> {
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
  }

  private static async persistToIndexedDb(db: Database): Promise<void> {
    try {
      const binary = db.export();
      const idb = await this.openIdb();
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(binary, IDB_KEY);
    } catch (e) {
      console.error('Failed to save SQLite binary to IndexedDB', e);
    }
  }

  private static async loadFromIndexedDb(): Promise<Uint8Array | null> {
    try {
      const idb = await this.openIdb();
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
  }
}

export { SqliteStorage };
