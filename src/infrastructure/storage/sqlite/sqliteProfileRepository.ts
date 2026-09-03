import { Database } from 'sql.js';
import { EmployeeProfile } from '../../../domain/models/Contract';
import { RecurringCommitment } from '../../../domain/models/Deductions';
import {
  DEFAULT_GEMMA_PROFILE,
  DEFAULT_GEMMA_COMMITMENTS,
} from '../../../domain/constants/defaultProfile';
import { ProfileRepository } from '../../../domain/ports/IProfileRepository';
import { getDb, persistToIndexedDb, saveProfileSync, saveCommitmentSync } from './sqliteClient';

export const createSqliteProfileRepository = (
  getDatabase: () => Promise<Database> = getDb
): ProfileRepository => {
  const getProfile = async (): Promise<EmployeeProfile> => {
    const db = await getDatabase();
    const res = db.exec(
      'SELECT employee_name, job_title, department, location, band, contract_type, full_time_salary_fte, standard_full_time_hours, contracted_weekly_hours, custom_hourly_rate, tax_code, ni_category, pension_contribution_rate, tax_office_name, tax_office_ref, ni_number, employee_number, pay_method, years_of_service_tier, al_carry_over_hours, afc_absence_hourly_rate, al_base_hours_override FROM employee_profile WHERE id = 1'
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
      yearsOfServiceTier: (row[18] as EmployeeProfile['yearsOfServiceTier']) || 'FIVE_TO_TEN',
      annualLeaveCarryOverHours: (row[19] as number) || 0,
      annualLeaveBaseHoursOverride:
        row[21] !== null && row[21] !== undefined
          ? (row[21] as number)
          : DEFAULT_GEMMA_PROFILE.annualLeaveBaseHoursOverride,
    };
  };

  const saveProfile = async (profile: EmployeeProfile): Promise<void> => {
    const db = await getDatabase();
    saveProfileSync(db, profile);
    await persistToIndexedDb(db);
  };

  const getCommitments = async (): Promise<RecurringCommitment[]> => {
    const db = await getDatabase();
    const res = db.exec('SELECT id, name, amount, is_pre_tax FROM recurring_commitments');
    if (!res || res.length === 0) return DEFAULT_GEMMA_COMMITMENTS;

    return res[0].values.map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
      amount: row[2] as number,
      isPreTax: Boolean(row[3]),
    }));
  };

  const saveCommitment = async (commitment: RecurringCommitment): Promise<void> => {
    const db = await getDatabase();
    saveCommitmentSync(db, commitment);
    await persistToIndexedDb(db);
  };

  const replaceAllCommitments = async (commitments: RecurringCommitment[]): Promise<void> => {
    const db = await getDatabase();
    db.run('DELETE FROM recurring_commitments');
    for (const comm of commitments) {
      saveCommitmentSync(db, comm);
    }
    await persistToIndexedDb(db);
  };

  const deleteCommitment = async (id: string): Promise<void> => {
    const db = await getDatabase();
    db.run('DELETE FROM recurring_commitments WHERE id = ?', [id]);
    await persistToIndexedDb(db);
  };

  return {
    getProfile,
    saveProfile,
    getCommitments,
    saveCommitment,
    deleteCommitment,
    replaceAllCommitments,
  };
};

export const sqliteProfileRepository = createSqliteProfileRepository();
