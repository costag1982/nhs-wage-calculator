export type NhsBandLevel =
  | 'Band 2'
  | 'Band 3'
  | 'Band 4'
  | 'Band 5'
  | 'Band 6'
  | 'Band 7'
  | 'Band 8a'
  | 'Band 8b'
  | 'Band 8c'
  | 'Band 8d'
  | 'Band 9'
  | 'Custom';

export type ContractType = 'SUBSTANTIVE' | 'BANK_HOURLY';

export type NhsServiceYearsTier = 'UNDER_5' | 'FIVE_TO_TEN' | 'TEN_PLUS';

export interface EmployeeProfile {
  employeeName: string;
  jobTitle: string;
  department: string;
  location: string;
  band: NhsBandLevel;
  contractType: ContractType;
  fullTimeSalaryFte: number; // Standard annual full-time salary (e.g. £25,272.00)
  standardFullTimeHours: number; // Standard full-time weekly hours (typically 37.5)
  contractedWeeklyHours: number; // Contracted part-time or full-time hours (e.g. 26.0)
  customHourlyRate?: number; // If override specified
  yearsOfServiceTier?: NhsServiceYearsTier; // NHS continuous service tier for AfC Section 13 annual leave
  annualLeaveCarryOverHours?: number; // Hours carried forward from previous leave year
  taxCode: string; // e.g. "1257L CUMUL", "BR"
  niCategory: string; // e.g. "A"
  pensionContributionRate: number; // e.g. 0.065 (6.5%)
  afcAbsenceHourlyRateOverride?: number; // Payroll-provided historical average, where known
  taxOfficeName: string;
  taxOfficeRef: string;
  niNumber: string;
  employeeNumber: string;
  payMethod: string;
}
