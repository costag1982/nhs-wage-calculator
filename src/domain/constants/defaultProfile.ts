import { EmployeeProfile } from '../models/Contract';
import { RecurringCommitment } from '../models/Deductions';

/**
 * Baseline contract and employment details for Miss Gemma Howard (Band 2 Admin Support Clerk).
 */
export const DEFAULT_GEMMA_PROFILE: EmployeeProfile = {
  employeeName: 'MISS GEMMA HOWARD',
  jobTitle: 'Admin Support Clerk',
  department: 'Emergency Depart',
  location: 'Airedale General Hospital',
  band: 'Band 2',
  contractType: 'SUBSTANTIVE',
  fullTimeSalaryFte: 25272.0,
  standardFullTimeHours: 37.5,
  contractedWeeklyHours: 26.0,
  yearsOfServiceTier: 'UNDER_5',
  annualLeaveCarryOverHours: 0,
  taxCode: '1257L CUMUL',
  niCategory: 'A',
  pensionContributionRate: 0.065,
  taxOfficeName: 'W Yorkshire And Crav',
  taxOfficeRef: '072/A7150',
  niNumber: 'JR087301B',
  employeeNumber: '31580711',
  payMethod: 'BACS',
};

/**
 * Baseline payroll recurring deductions (parking permit and staff lottery).
 */
export const DEFAULT_GEMMA_COMMITMENTS: RecurringCommitment[] = [
  { id: '1', name: '423 Car Permit P/T', amount: 9.1 },
  { id: '2', name: 'Staff Lottery', amount: 3.0 },
];
