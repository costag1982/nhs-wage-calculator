import { describe, it, expect } from 'vitest';
import { calculateMonthlyPayslip } from '../domain/services/wageCalculatorService';
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

    const result = calculateMonthlyPayslip(
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

    // Night Duty EN: 44.00 hrs @ 41% -> 18.04 paid units @ £12.9245 = £233.16
    const nightLine = result.payLineItems.find((p) => p.description === 'Night Duty EN');
    expect(nightLine?.unitsWorked).toBe(44.0);
    expect(nightLine?.paidUnits).toBe(18.04);
    expect(nightLine?.amount).toBe(233.16);

    // Saturday EN: 4.00 hrs @ 41% -> 1.64 paid units @ £12.9245 = £21.20
    const satLine = result.payLineItems.find((p) => p.description === 'Saturday EN');
    expect(satLine?.unitsWorked).toBe(4.0);
    expect(satLine?.paidUnits).toBe(1.64);
    expect(satLine?.amount).toBe(21.2);

    // Sunday EN: 22.50 hrs @ 83% -> 18.68 paid units @ £12.9245 = £241.43
    const sunLine = result.payLineItems.find((p) => p.description === 'Sunday EN');
    expect(sunLine?.unitsWorked).toBe(22.5);
    expect(sunLine?.paidUnits).toBe(18.68);
    expect(sunLine?.amount).toBe(241.43);

    // Total Gross Pay: £1955.95 (£1460.16 + £495.79)
    expect(result.grossPay).toBe(1955.95);

    // NHS Pension 6.5%: £127.14
    const pensionDeduction = result.deductionsList.find((d) => d.name.includes('NHS Pension'));
    expect(pensionDeduction?.amount).toBe(127.14);

    // NI Class 1 Category A: £72.64
    const niDeduction = result.deductionsList.find((d) => d.name.includes('NI A'));
    expect(niDeduction?.amount).toBe(72.64);

    // Car Permit: £9.10
    const carPermit = result.deductionsList.find((d) => d.name.includes('Car Permit'));
    expect(carPermit?.amount).toBe(9.1);

    // Staff Lottery: £3.00
    const lottery = result.deductionsList.find((d) => d.name.includes('Staff Lottery'));
    expect(lottery?.amount).toBe(3.0);

    // PAYE Tax (1257L Cumulative, Month 4): £156.00
    const payeDeduction = result.deductionsList.find((d) => d.name === 'PAYE');
    expect(payeDeduction?.amount).toBe(156.0);

    // Total Deductions: £367.88
    expect(result.totalDeductions).toBe(367.88);

    // Net pay £1588.07
    expect(result.netPay).toBe(1588.07);
  });

  it('matches 30 June 2026 payslip (May 2026 roster) with 0 phantom additional hours', () => {
    // Shifts worked in May 2026:
    // Basic Pay: 112.98 hrs (£1,460.16)
    // Bank Holiday: 11.00 hrs (£118.01)
    // Night Duty: 24.50 hrs (£129.82)
    // Saturday: 15.50 hrs (£82.13)
    // Sunday: 15.50 hrs (£166.27)
    // Annual Leave: 15.00 hrs
    const mayShifts: Shift[] = [
      {
        id: 'may-bh',
        date: '2026-05-04',
        startTime: '08:00',
        endTime: '19:30',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 11,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 11,
        },
      },
      {
        id: 'may-n1',
        date: '2026-05-06',
        startTime: '22:00',
        endTime: '06:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 7.5,
          plainDayHours: 0,
          nightHours: 7.5,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-n2',
        date: '2026-05-13',
        startTime: '22:00',
        endTime: '06:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 7.5,
          plainDayHours: 0,
          nightHours: 7.5,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-n3',
        date: '2026-05-20',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 9.5,
          plainDayHours: 0,
          nightHours: 9.5,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-sat1',
        date: '2026-05-09',
        startTime: '08:00',
        endTime: '16:30',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 8,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 8,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-sat2',
        date: '2026-05-23',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 7.5,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 7.5,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-sun1',
        date: '2026-05-10',
        startTime: '08:00',
        endTime: '16:30',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 8,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 0,
          sundayHours: 8,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-sun2',
        date: '2026-05-24',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
        breakdown: {
          totalWorkedHours: 7.5,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 0,
          sundayHours: 7.5,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-al1',
        date: '2026-05-18',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'ANNUAL_LEAVE',
        breakdown: {
          totalWorkedHours: 7.5,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
      {
        id: 'may-al2',
        date: '2026-05-19',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'ANNUAL_LEAVE',
        breakdown: {
          totalWorkedHours: 7.5,
          plainDayHours: 0,
          nightHours: 0,
          saturdayHours: 0,
          sundayHours: 0,
          bankHolidayHours: 0,
        },
      },
    ];

    const result = calculateMonthlyPayslip(
      gemmaProfile,
      mayShifts,
      commitments,
      new Date(2026, 4, 1) // May 2026 -> Paid 30 June 2026
    );

    expect(result.rosterMonthString).toBe('May 2026');
    expect(result.monthYearString).toBe('June 2026');
    expect(result.payDate).toBe('30 JUN 2026');
    expect(result.periodEndDate).toBe('30 JUN 2026');
    expect(result.taxPeriod).toBe(3);

    // Basic Pay £1,460.16
    expect(result.monthlyBasicPay).toBe(1460.16);

    // Additional Hours & Overtime: MUST BE 0 / undefined (no phantom additional hours!)
    expect(result.additionalHours).toBeUndefined();
    expect(result.overtimeHours).toBeUndefined();

    // Bank Holiday ENH: 11h = £118.00 (9.13 paid units @ £12.9245)
    const bhLine = result.payLineItems.find((p) => p.description === 'Public Holiday EN');
    expect(bhLine?.amount).toBe(118.0);

    // Night Duty EN: 24.5h -> 10.05 paid units @ £12.9245 = £129.89
    const nightLine = result.payLineItems.find((p) => p.description === 'Night Duty EN');
    expect(nightLine?.amount).toBe(129.89);

    // Saturday EN: 15.5h -> 6.36 paid units @ £12.9245 = £82.20
    const satLine = result.payLineItems.find((p) => p.description === 'Saturday EN');
    expect(satLine?.amount).toBe(82.2);

    // Sunday EN: 15.5h -> 12.87 paid units @ £12.9245 = £166.34
    const sunLine = result.payLineItems.find((p) => p.description === 'Sunday EN');
    expect(sunLine?.amount).toBe(166.34);

    // AfC Absence for 15h annual leave
    expect(result.afcAbsencePay).toBeGreaterThan(0);
    const afcAbsenceLine = result.payLineItems.find((p) => p.description === 'AfC Absence');
    expect(afcAbsenceLine).toBeDefined();
    expect(afcAbsenceLine?.unitsWorked).toBe(15.0);
  });

  it('accurately calculates payday as last working day of month across various months', () => {
    // July shifts -> Paid August 2026 (31 Aug is Bank Holiday -> Friday 28 Aug 2026)
    const augResult = calculateMonthlyPayslip(
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
    const mayResult = calculateMonthlyPayslip(
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
    const febResult = calculateMonthlyPayslip(
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
