import { describe, expect, it } from 'vitest';
import { EmployeeProfile } from '../domain/models/Contract';
import { RecurringCommitment } from '../domain/models/Deductions';
import { PayslipYearToDate } from '../domain/models/Payslip';
import { Shift, ShiftHoursBreakdown, ShiftWorkType } from '../domain/models/Shift';
import { calculateMonthlyPayslip } from '../domain/services/wageCalculatorService';

const gemmaProfile: EmployeeProfile = {
  employeeName: 'MISS GEMMA HOWARD',
  jobTitle: 'Admin Support Clerk',
  department: 'Emergency Depart',
  location: 'Airedale General Hospital',
  band: 'Band 2',
  contractType: 'SUBSTANTIVE',
  fullTimeSalaryFte: 25_272,
  standardFullTimeHours: 37.5,
  contractedWeeklyHours: 26,
  taxCode: '1257L CUMUL',
  niCategory: 'A',
  pensionContributionRate: 0.065,
  taxOfficeName: 'W Yorkshire And Crav',
  taxOfficeRef: '072/A7150',
  niNumber: 'JR087301B',
  employeeNumber: '31580711',
  payMethod: 'BACS',
};

const commitments: RecurringCommitment[] = [
  { id: 'car', name: '423 Car Permit P/T', amount: 9.1 },
  { id: 'lottery', name: 'Staff Lottery', amount: 3 },
];

const breakdown = (category: keyof ShiftHoursBreakdown, hours: number): ShiftHoursBreakdown => ({
  totalWorkedHours: hours,
  plainDayHours: 0,
  nightHours: 0,
  saturdayHours: 0,
  sundayHours: 0,
  bankHolidayHours: 0,
  [category]: hours,
});

const shift = (
  id: string,
  date: string,
  category: keyof ShiftHoursBreakdown,
  hours: number,
  shiftType: ShiftWorkType = 'SUBSTANTIVE',
  overrides: Partial<Shift> = {}
): Shift => ({
  id,
  date,
  startTime: '08:00',
  endTime: '16:00',
  unpaidBreakMinutes: 0,
  shiftType,
  breakdown: breakdown(category, hours),
  ...overrides,
});

const deduction = (name: string, result: ReturnType<typeof calculateMonthlyPayslip>): number =>
  result.deductionsList.find((item) => item.name.startsWith(name))?.amount ?? -1;

const differenceInPennies = (actual: number, expected: number): number =>
  Math.round(Math.abs(actual - expected) * 100);

describe('Gemma Howard ESR payslip regression fixtures', () => {
  it('reproduces the 30 June 2026 payslip', () => {
    const previousYearToDate: PayslipYearToDate = {
      grossPay: 3_639.88,
      taxablePay: 3_390.68,
      taxPaid: 258.8,
      niPay: 3_639.88,
      niContributions: 123.51,
      pensionablePay: 3_833.74,
      pensionContributions: 249.2,
    };
    const shifts = [
      shift('bh', '2026-05-04', 'bankHolidayHours', 11),
      shift('night', '2026-05-10', 'nightHours', 24.5),
      shift('sat', '2026-05-16', 'saturdayHours', 15.5),
      shift('sun', '2026-05-17', 'sundayHours', 15.5),
      shift('leave', '2026-05-20', 'plainDayHours', 15, 'ANNUAL_LEAVE'),
    ];
    const result = calculateMonthlyPayslip(
      { ...gemmaProfile, afcAbsenceHourlyRateOverride: 34.52 / 15 },
      shifts,
      commitments,
      new Date(2026, 4, 1),
      { previousYearToDate }
    );

    expect(result.monthlyBasicPay).toBe(1_460.16);
    expect(result.payLineItems.find((item) => item.description === 'AfC Absence')?.amount).toBe(
      34.52
    );
    expect(differenceInPennies(result.grossPay, 1_990.91)).toBeLessThanOrEqual(1);
    expect(differenceInPennies(result.taxablePay, 1_861.5)).toBeLessThanOrEqual(1);
    expect(deduction('PAYE', result)).toBe(162.6);
    expect(deduction('NI A', result)).toBe(75.43);
    expect(deduction('NHS Pension', result)).toBe(129.41);
    expect(differenceInPennies(result.netPay, 1_611.37)).toBeLessThanOrEqual(1);
  });

  it('reconciles the 31 July 2026 payslip within the hidden ESR precision', () => {
    const previousYearToDate: PayslipYearToDate = {
      grossPay: 5_630.79,
      taxablePay: 5_252.18,
      taxPaid: 421.4,
      niPay: 5_630.79,
      niContributions: 198.94,
      pensionablePay: 5_824.65,
      pensionContributions: 378.61,
    };
    const shifts = [
      shift('night', '2026-06-10', 'nightHours', 44),
      shift('sat', '2026-06-13', 'saturdayHours', 4),
      shift('sun', '2026-06-14', 'sundayHours', 22.5),
    ];
    const result = calculateMonthlyPayslip(
      gemmaProfile,
      shifts,
      commitments,
      new Date(2026, 5, 1),
      { previousYearToDate }
    );

    expect(
      differenceInPennies(
        result.payLineItems.find((item) => item.description === 'Night Duty EN')?.amount ?? 0,
        233.14
      )
    ).toBeLessThanOrEqual(2);
    expect(result.payLineItems.find((item) => item.description === 'Saturday EN')?.amount).toBe(
      21.2
    );
    expect(
      differenceInPennies(
        result.payLineItems.find((item) => item.description === 'Sunday EN')?.amount ?? 0,
        241.35
      )
    ).toBeLessThanOrEqual(2);
    expect(differenceInPennies(result.grossPay, 1_955.85)).toBeLessThanOrEqual(4);
    expect(deduction('PAYE', result)).toBe(156);
    expect(deduction('NI A', result)).toBe(72.63);
    expect(deduction('NHS Pension', result)).toBe(127.13);
    expect(differenceInPennies(result.netPay, 1_587.99)).toBeLessThanOrEqual(4);
  });

  it('reproduces the 28 August 2026 payslip including local bank and holiday rates', () => {
    const previousYearToDate: PayslipYearToDate = {
      grossPay: 7_586.64,
      taxablePay: 7_080.9,
      taxPaid: 577.4,
      niPay: 7_586.64,
      niContributions: 271.57,
      pensionablePay: 7_780.5,
      pensionContributions: 505.74,
    };
    const shifts = [
      shift('night', '2026-07-08', 'nightHours', 69.5),
      shift('sat', '2026-07-11', 'saturdayHours', 20.5),
      shift('sun', '2026-07-12', 'sundayHours', 14),
      shift('bank-weekday', '2026-07-20', 'plainDayHours', 3, 'BANK', {
        customHourlyRate: 12.92,
        holidayPayHourlyRate: 1.56,
      }),
      shift('bank-sunday', '2026-07-26', 'sundayHours', 5.5, 'BANK', {
        overrideBand: 'Band 3',
        customHourlyRate: 14.05,
        customEnhancementHourlyRate: 15.75,
        holidayPayHourlyRate: 1.7,
      }),
    ];
    const augustCommitments = commitments.map((item) =>
      item.id === 'car' ? { ...item, amount: 9.45 } : item
    );
    const result = calculateMonthlyPayslip(
      gemmaProfile,
      shifts,
      augustCommitments,
      new Date(2026, 6, 1),
      { previousYearToDate }
    );

    expect(differenceInPennies(result.grossPay, 2_277.14)).toBeLessThanOrEqual(3);
    expect(differenceInPennies(result.taxablePay, 2_129.13)).toBeLessThanOrEqual(3);
    expect(deduction('PAYE', result)).toBe(216.2);
    expect(deduction('NI A', result)).toBe(98.33);
    expect(differenceInPennies(deduction('NHS Pension', result), 148.01)).toBeLessThanOrEqual(1);
    expect(differenceInPennies(result.netPay, 1_802.15)).toBeLessThanOrEqual(3);
    expect(result.yearToDate.taxPaid).toBe(793.6);
  });
});
