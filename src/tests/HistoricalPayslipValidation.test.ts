import { describe, it, expect } from 'vitest';
import { WageCalculatorService } from '../domain/services/WageCalculatorService';
import { EmployeeProfile } from '../domain/models/Contract';
import { Shift } from '../domain/models/Shift';
import { RecurringCommitment } from '../domain/models/Deductions';

describe('Historical Payslip Validation - Miss Gemma Howard (July 2026)', () => {
  const gemmaProfile: EmployeeProfile = {
    employeeName: 'MISS GEMMA HOWARD',
    jobTitle: 'Admin Support Clerk',
    department: 'Emergency Depart',
    location: 'Airedale General Hospital',
    band: 'Band 2',
    contractType: 'SUBSTANTIVE',
    fullTimeSalaryFte: 25272.0,
    standardFullTimeHours: 37.5,
    contractedWeeklyHours: 26.0,
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
    { id: '1', name: '423 Car Permit P/T', amount: 9.1 },
    { id: '2', name: 'Staff Lottery', amount: 3.0 },
  ];

  it('matches July 2026 payslip gross earnings, enhancements, pension and NI to the penny', () => {
    // Shifts worked in June 2026 matching the worked unsocial hours on the 31 July 2026 payslip:
    // Night Duty: 44.00 hrs
    // Saturday: 4.00 hrs
    // Sunday: 22.50 hrs
    const sampleShifts: Shift[] = [
      {
        id: 's1',
        date: '2026-06-03',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        breakdown: {
          totalWorkedHours: 10,
          plainDayHours: 0,
          nightHours: 10,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 's2',
        date: '2026-06-08',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        breakdown: {
          totalWorkedHours: 10,
          plainDayHours: 0,
          nightHours: 10,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 's3',
        date: '2026-06-15',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        breakdown: {
          totalWorkedHours: 10,
          plainDayHours: 0,
          nightHours: 10,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 's4',
        date: '2026-06-22',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        breakdown: {
          totalWorkedHours: 10,
          plainDayHours: 0,
          nightHours: 10,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 's5',
        date: '2026-06-29',
        startTime: '20:00',
        endTime: '00:00',
        unpaidBreakMinutes: 0,
        breakdown: {
          totalWorkedHours: 4,
          plainDayHours: 0,
          nightHours: 4,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 's6',
        date: '2026-06-13', // Saturday
        startTime: '10:00',
        endTime: '14:00',
        unpaidBreakMinutes: 0,
        breakdown: {
          totalWorkedHours: 4,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 4,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 's7',
        date: '2026-06-14', // Sunday
        startTime: '08:00',
        endTime: '19:30',
        unpaidBreakMinutes: 30,
        breakdown: {
          totalWorkedHours: 11,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 0,
          sundayHours: 11,
          bankHolidayHours: 0,
        },
      },
      {
        id: 's8',
        date: '2026-06-28', // Sunday
        startTime: '07:30',
        endTime: '19:30',
        unpaidBreakMinutes: 30,
        breakdown: {
          totalWorkedHours: 11.5,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 0,
          sundayHours: 11.5,
          bankHolidayHours: 0,
        },
      },
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      gemmaProfile,
      sampleShifts,
      commitments,
      new Date(2026, 5, 1) // June 2026 (worked month) -> Paid in July 2026
    );

    // Period metadata: June shifts -> Paid 31 July 2026, Tax Period 4
    expect(result.rosterMonthString).toBe('June 2026');
    expect(result.monthYearString).toBe('July 2026');
    expect(result.payDate).toBe('31 JUL 2026');
    expect(result.periodEndDate).toBe('31 JUL 2026');
    expect(result.taxPeriod).toBe(4);

    // Hourly Rate: £12.9245
    expect(result.hourlyRate).toBe(12.9245);

    // Basic monthly pay: £1460.16
    expect(result.monthlyBasicPay).toBe(1460.16);

    // Night Duty EN: 44.00 hrs @ 41% -> £233.14
    const nightLine = result.payLineItems.find((p) => p.description === 'Night Duty EN');
    expect(nightLine?.unitsWorked).toBe(44.0);
    expect(nightLine?.paidUnits).toBe(18.04);
    expect(nightLine?.amount).toBe(233.14);

    // Saturday EN: 4.00 hrs @ 41% -> £21.20
    const satLine = result.payLineItems.find((p) => p.description === 'Saturday EN');
    expect(satLine?.unitsWorked).toBe(4.0);
    expect(satLine?.paidUnits).toBe(1.64);
    expect(satLine?.amount).toBe(21.2);

    // Sunday EN: 22.50 hrs @ 83% -> £241.35
    const sunLine = result.payLineItems.find((p) => p.description === 'Sunday EN');
    expect(sunLine?.unitsWorked).toBe(22.5);
    expect(sunLine?.paidUnits).toBe(18.68);
    expect(sunLine?.amount).toBe(241.35);

    // Total Gross Pay: £1955.85
    expect(result.grossPay).toBe(1955.85);

    // NHS Pension 6.5%: £127.13
    const pensionDeduction = result.deductionsList.find((d) => d.name.includes('NHS Pension'));
    expect(pensionDeduction?.amount).toBe(127.13);

    // NI Class 1 Category A: £72.63
    const niDeduction = result.deductionsList.find((d) => d.name.includes('NI A'));
    expect(niDeduction?.amount).toBe(72.63);

    // Car Permit: £9.10
    const carPermit = result.deductionsList.find((d) => d.name.includes('Car Permit'));
    expect(carPermit?.amount).toBe(9.1);

    // Staff Lottery: £3.00
    const lottery = result.deductionsList.find((d) => d.name.includes('Staff Lottery'));
    expect(lottery?.amount).toBe(3.0);

    // PAYE Tax (1257L Cumulative, Month 4): £156.00
    const payeDeduction = result.deductionsList.find((d) => d.name === 'PAYE');
    expect(payeDeduction?.amount).toBe(156.0);

    // Total Deductions: £367.86
    expect(result.totalDeductions).toBe(367.86);

    // Net pay exactly £1587.99
    expect(result.netPay).toBe(1587.99);
  });

  it('accurately calculates payday as last working day of month across various months', () => {
    // July shifts -> Paid August 2026 (31 Aug is Bank Holiday -> Friday 28 Aug 2026)
    const augResult = WageCalculatorService.calculateMonthlyPayslip(
      gemmaProfile,
      [],
      commitments,
      new Date(2026, 6, 1) // July 2026 worked -> Paid August 2026
    );
    expect(augResult.rosterMonthString).toBe('July 2026');
    expect(augResult.monthYearString).toBe('August 2026');
    expect(augResult.periodEndDate).toBe('31 AUG 2026');
    expect(augResult.payDate).toBe('28 AUG 2026');

    // April shifts -> Paid May 2026 (31 May is Sunday -> Friday 29 May 2026)
    const mayResult = WageCalculatorService.calculateMonthlyPayslip(
      gemmaProfile,
      [],
      commitments,
      new Date(2026, 3, 1) // April 2026 worked -> Paid May 2026
    );
    expect(mayResult.rosterMonthString).toBe('April 2026');
    expect(mayResult.monthYearString).toBe('May 2026');
    expect(mayResult.periodEndDate).toBe('31 MAY 2026');
    expect(mayResult.payDate).toBe('29 MAY 2026');

    // January shifts -> Paid February 2026 (28 Feb is Saturday -> Friday 27 Feb 2026)
    const febResult = WageCalculatorService.calculateMonthlyPayslip(
      gemmaProfile,
      [],
      commitments,
      new Date(2026, 0, 1) // January 2026 worked -> Paid February 2026
    );
    expect(febResult.rosterMonthString).toBe('January 2026');
    expect(febResult.monthYearString).toBe('February 2026');
    expect(febResult.periodEndDate).toBe('28 FEB 2026');
    expect(febResult.payDate).toBe('27 FEB 2026');
  });
});
