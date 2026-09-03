import { EmployeeProfile } from '../models/Contract';
import { RecurringCommitment } from '../models/Deductions';

/**
 * Port representing profile and recurring payroll commitments persistence operations.
 */
export interface ProfileRepository {
  readonly getProfile: () => Promise<EmployeeProfile>;
  readonly saveProfile: (profile: EmployeeProfile) => Promise<void>;
  readonly getCommitments: () => Promise<RecurringCommitment[]>;
  readonly saveCommitment: (commitment: RecurringCommitment) => Promise<void>;
  readonly deleteCommitment: (id: string) => Promise<void>;
  readonly replaceAllCommitments: (commitments: RecurringCommitment[]) => Promise<void>;
}
