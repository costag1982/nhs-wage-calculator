/**
 * @deprecated This module is retained for backward compatibility during architectural transition.
 * Use the Ports in `src/domain/ports/` and Adapters in `src/infrastructure/storage/sqlite/` instead.
 */
import { Shift } from '../models/Shift';
import { EmployeeProfile } from '../models/Contract';
import { RecurringCommitment } from '../models/Deductions';
import {
  getDb,
  exportDatabaseBinary,
  importDatabaseBinary,
} from '../../infrastructure/storage/sqlite/sqliteClient';
import { sqliteRotaRepository } from '../../infrastructure/storage/sqlite/sqliteRotaRepository';
import { sqliteProfileRepository } from '../../infrastructure/storage/sqlite/sqliteProfileRepository';

export { getDb, exportDatabaseBinary, importDatabaseBinary };

// ==========================================
// SHIFTS CRUD (Delegated to RotaRepository)
// ==========================================
export const getAllShifts = (): Promise<Shift[]> => sqliteRotaRepository.getAllShifts();
export const saveShift = (shift: Shift): Promise<void> => sqliteRotaRepository.saveShift(shift);
export const deleteShift = (id: string): Promise<void> => sqliteRotaRepository.deleteShift(id);
export const clearMonthShifts = (monthPrefix: string): Promise<void> =>
  sqliteRotaRepository.clearMonthShifts(monthPrefix);
export const replaceAllShifts = (shifts: Shift[]): Promise<void> =>
  sqliteRotaRepository.replaceAllShifts(shifts);

// ==========================================
// PROFILE & COMMITMENTS (Delegated to ProfileRepository)
// ==========================================
export const getProfile = (): Promise<EmployeeProfile> => sqliteProfileRepository.getProfile();
export const saveProfile = (profile: EmployeeProfile): Promise<void> =>
  sqliteProfileRepository.saveProfile(profile);
export const getCommitments = (): Promise<RecurringCommitment[]> =>
  sqliteProfileRepository.getCommitments();
export const saveCommitment = (commitment: RecurringCommitment): Promise<void> =>
  sqliteProfileRepository.saveCommitment(commitment);
export const replaceAllCommitments = (commitments: RecurringCommitment[]): Promise<void> =>
  sqliteProfileRepository.replaceAllCommitments(commitments);
export const deleteCommitment = (id: string): Promise<void> =>
  sqliteProfileRepository.deleteCommitment(id);

// ==========================================
// DATA PAYLOAD SYNC
// ==========================================
export const exportFullDataPayload = async (): Promise<{
  version: number;
  lastModified: string;
  profile: EmployeeProfile;
  commitments: RecurringCommitment[];
  shifts: Shift[];
}> => {
  const [profile, commitments, shifts] = await Promise.all([
    sqliteProfileRepository.getProfile(),
    sqliteProfileRepository.getCommitments(),
    sqliteRotaRepository.getAllShifts(),
  ]);

  const lastModified =
    (typeof window !== 'undefined' && localStorage.getItem('nhs_last_local_mutation')) ||
    new Date(0).toISOString();

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
  if (payload.profile) {
    await sqliteProfileRepository.saveProfile(payload.profile);
  }
  if (payload.commitments) {
    await sqliteProfileRepository.replaceAllCommitments(payload.commitments);
  }
  if (payload.shifts) {
    await sqliteRotaRepository.replaceAllShifts(payload.shifts);
  }
  if (payload.lastModified && typeof window !== 'undefined') {
    localStorage.setItem('nhs_last_local_mutation', payload.lastModified);
  }
};
