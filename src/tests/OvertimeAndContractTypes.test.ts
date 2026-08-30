import { describe, it, expect } from 'vitest';
import { WageCalculatorService } from '../domain/services/WageCalculatorService';
import { GrossPayCalculator } from '../domain/services/GrossPayCalculator';
import { EmployeeProfile } from '../domain/models/Contract';
import { Shift } from '../domain/models/Shift';

describe('Overtime, Additional Hours & Contract Types (AfC Section 3)', () => {
  const baseProfile: EmployeeProfile = {
    employeeName: 'TEST EMPLOYEE',
    jobTitle: 'Healthcare Assistant',
    department: 'Acute Medical Unit',
    location: 'Hospital',
    band: 'Band 2',
    contractType: 'SUBSTANTIVE',
    fullTimeSalaryFte: 25272.0, // £12.9245/hr
    standardFullTimeHours: 37.5,
    contractedWeeklyHours: 26.0,
    taxCode: '1257L',
    niCategory: 'A',
    pensionContributionRate: 0.065,
    taxOfficeName: 'HMRC',
    taxOfficeRef: '123/A',
    niNumber: 'AB123456C',
    employeeNumber: '1001',
    payMethod: 'BACS',
  };

  it('calculates GrossPayCalculator base rates correctly for part-time employee', () => {
    const baseRates = GrossPayCalculator.calculateBaseRates(baseProfile);
    expect(baseRates.hourlyRate).toBe(12.9245);
    expect(baseRates.annualProRataSalary).toBe(17521.92);
    expect(baseRates.monthlyBasicPay).toBe(1460.16);
    expect(baseRates.monthlyBasicHours).toBe(112.98);
  });

  it('calculates Additional Hours at plain time (1.0x) when weekly hours exceed contracted but remain under FTE 37.5h', () => {
    // 26h contracted. 4x 7.5h shifts = 30.0h in Week 27 (2026-07-06 to 2026-07-09)
    // Excess = 30.0 - 26.0 = 4.0h Additional Hours @ plain time (£12.9245/hr = £51.70)
    const shifts: Shift[] = [
      { id: '1', date: '2026-07-06', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '2', date: '2026-07-07', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '3', date: '2026-07-08', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '4', date: '2026-07-09', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      baseProfile,
      shifts,
      [],
      new Date(2026, 6, 1)
    );

    expect(result.additionalHours).toBe(4.0);
    expect(result.additionalHoursPay).toBe(51.7);
    expect(result.overtimeHours).toBeUndefined();
    expect(result.overtimePay).toBeUndefined();

    const additionalLine = result.payLineItems.find((p) => p.description === 'Additional Hours');
    expect(additionalLine).toBeDefined();
    expect(additionalLine?.amount).toBe(51.7);
  });

  it('calculates Overtime at 1.5x when weekly hours exceed FTE 37.5h for eligible Bands (Band 2-7)', () => {
    // 26h contracted. 6x 7.5h shifts = 45.0h in Week 27 (Mon-Sat)
    // Additional hours (26.0 to 37.5) = 11.5h @ 1.0x = £148.63
    // Overtime hours (37.5 to 45.0) = 7.5h @ 1.5x (£19.3868/hr) = £145.40
    const shifts: Shift[] = [
      { id: '1', date: '2026-07-06', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '2', date: '2026-07-07', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '3', date: '2026-07-08', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '4', date: '2026-07-09', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '5', date: '2026-07-10', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '6', date: '2026-07-11', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      baseProfile,
      shifts,
      [],
      new Date(2026, 6, 1)
    );

    expect(result.additionalHours).toBe(11.5);
    expect(result.additionalHoursPay).toBe(148.63);
    expect(result.overtimeHours).toBe(7.5);
    expect(result.overtimePay).toBe(145.4);

    const overtimeLine = result.payLineItems.find((p) => p.description === 'Overtime (1.5×)');
    expect(overtimeLine).toBeDefined();
    expect(overtimeLine?.rate).toBe(19.3868);
    expect(overtimeLine?.amount).toBe(145.4);
  });

  it('pays all excess hours at plain time (1.0x) for senior staff (Band 8a and above)', () => {
    const band8aProfile: EmployeeProfile = {
      ...baseProfile,
      band: 'Band 8a',
      fullTimeSalaryFte: 55000.0, // £28.1278/hr
      contractedWeeklyHours: 37.5,
    };

    // 45 hours worked (7.5h excess over contracted 37.5h)
    const shifts: Shift[] = [
      { id: '1', date: '2026-07-06', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '2', date: '2026-07-07', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '3', date: '2026-07-08', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '4', date: '2026-07-09', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '5', date: '2026-07-10', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
      { id: '6', date: '2026-07-11', startTime: '08:00', endTime: '16:00', unpaidBreakMinutes: 30 },
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      band8aProfile,
      shifts,
      [],
      new Date(2026, 6, 1)
    );

    // Band 8a has no 1.5x overtime, only plain time additional hours
    expect(result.additionalHours).toBe(7.5);
    expect(result.additionalHoursPay).toBe(210.96);
    expect(result.overtimeHours).toBeUndefined();
    expect(result.overtimePay).toBeUndefined();
  });

  it('excludes Bank shifts from substantive 26h additional-hours calculation preventing pay overstatement', () => {
    // Substantive employee with 26.0h weekly contract
    // Week 27: 26.0h substantive shifts (2x 10h + 1x 6h) + 1x 10h Bank shift (total 36.0h worked)
    // Bank shift must NOT trigger 10.0h Additional Hours on substantive contract
    const shifts: Shift[] = [
      {
        id: '1',
        date: '2026-07-06',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 10h Night
      {
        id: '2',
        date: '2026-07-07',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 10h Night
      {
        id: '3',
        date: '2026-07-08',
        startTime: '08:00',
        endTime: '14:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 6h Day
      {
        id: '4',
        date: '2026-07-09',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        shiftType: 'BANK',
      }, // 10h Bank Night
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      baseProfile,
      shifts,
      [],
      new Date(2026, 6, 1)
    );

    // Substantive additional hours and overtime must be 0 (not 10.0h)
    expect(result.additionalHours).toBeUndefined();
    expect(result.additionalHoursPay).toBeUndefined();
    expect(result.overtimeHours).toBeUndefined();
    expect(result.overtimePay).toBeUndefined();

    // Basic Pay: £1,460.16 (covers 26h/wk contracted)
    const basicPayItem = result.payLineItems.find((p) => p.description === 'Basic Pay');
    expect(basicPayItem).toBeDefined();
    expect(basicPayItem?.amount).toBe(1460.16);

    // Bank Basic Pay: 10.0h * £12.9245 = £129.25
    const bankHourlyItem = result.payLineItems.find((p) =>
      p.description.includes('Bank Basic Pay')
    );
    expect(bankHourlyItem).toBeDefined();
    expect(bankHourlyItem?.unitsWorked).toBe(10.0);
    expect(bankHourlyItem?.amount).toBe(129.25);

    // Bank Night Duty EN: 10h * 0.41 = 4.1h @ £12.9245 = £52.99
    // Substantive Night Duty EN: 20h * 0.41 = 8.2h @ £12.9245 = £105.98
    const substantiveNightItem = result.payLineItems.find((p) => p.description === 'Night Duty EN');
    expect(substantiveNightItem).toBeDefined();
    expect(substantiveNightItem?.unitsWorked).toBe(20.0);
    expect(substantiveNightItem?.amount).toBe(105.98);

    const bankNightItem = result.payLineItems.find((p) => p.description === 'Bank Night Duty EN');
    expect(bankNightItem).toBeDefined();
    expect(bankNightItem?.unitsWorked).toBe(10.0);
    expect(bankNightItem?.amount).toBe(52.99);

    // Gross Pay: £1460.16 (Basic) + £105.98 (Substantive Night) + £129.25 (Bank Basic) + £52.99 (Bank Night) = £1,748.38
    expect(result.grossPay).toBe(1748.38);
  });

  it('calculates substantive additional hours strictly from substantive shifts when mixed with bank shifts', () => {
    // 26.0h contracted.
    // Substantive worked: 4x 7.5h = 30.0h in Week 27 (4.0h substantive excess over 26.0h)
    // Bank worked: 1x 10.0h in Week 27
    // Total hours in week = 40.0h (which exceeds FTE 37.5h if bank were mistakenly included!)
    // Expected:
    // - Substantive Additional Hours: exactly 4.0h @ 1.0x (30h - 26h) = £51.70
    // - Substantive Overtime: 0h (substantive hours 30h <= 37.5h FTE threshold; bank must NOT trigger 1.5x overtime)
    // - Bank Basic Pay: 10.0h @ £12.9245 = £129.25
    const shifts: Shift[] = [
      {
        id: '1',
        date: '2026-07-06',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: '2',
        date: '2026-07-07',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: '3',
        date: '2026-07-08',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: '4',
        date: '2026-07-09',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: '5',
        date: '2026-07-10',
        startTime: '20:00',
        endTime: '06:00',
        unpaidBreakMinutes: 0,
        shiftType: 'BANK',
      }, // 10.0h Bank Night
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      baseProfile,
      shifts,
      [],
      new Date(2026, 6, 1)
    );

    // Substantive Additional Hours: strictly 4.0h
    expect(result.additionalHours).toBe(4.0);
    expect(result.additionalHoursPay).toBe(51.7);

    // Substantive Overtime: MUST be undefined / 0
    expect(result.overtimeHours).toBeUndefined();
    expect(result.overtimePay).toBeUndefined();

    // Bank Basic Pay: 10.0h
    const bankItem = result.payLineItems.find((p) => p.description.includes('Bank Basic Pay'));
    expect(bankItem).toBeDefined();
    expect(bankItem?.unitsWorked).toBe(10.0);
    expect(bankItem?.amount).toBe(129.25);
  });

  it('calculates Bank Hourly contract type correctly based on actual worked hours only', () => {
    const bankProfile: EmployeeProfile = {
      ...baseProfile,
      contractType: 'BANK_HOURLY',
    };

    // 2x 10h night shifts = 20h worked
    const shifts: Shift[] = [
      { id: '1', date: '2026-07-06', startTime: '20:00', endTime: '06:00', unpaidBreakMinutes: 0 },
      { id: '2', date: '2026-07-07', startTime: '20:00', endTime: '06:00', unpaidBreakMinutes: 0 },
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      bankProfile,
      shifts,
      [],
      new Date(2026, 6, 1)
    );

    // No monthly substantive basic pay
    const basicPayItem = result.payLineItems.find((p) => p.description === 'Basic Pay');
    expect(basicPayItem).toBeUndefined();

    // Basic Hourly Pay: 20h * £12.9245 = £258.49
    const hourlyPayItem = result.payLineItems.find((p) => p.description === 'Basic Hourly Pay');
    expect(hourlyPayItem).toBeDefined();
    expect(hourlyPayItem?.amount).toBe(258.49);

    // Night Duty EN: 20h * 0.41 = 8.2h @ £12.9245 = £105.98
    const nightItem = result.payLineItems.find((p) => p.description === 'Night Duty EN');
    expect(nightItem).toBeDefined();
    expect(nightItem?.amount).toBe(105.98);

    expect(result.grossPay).toBe(364.47);
  });

  it('correctly processes July dataset: excludes bank shifts from 26h additional hours (14.5h) and substantive Sunday EN (14.0h)', () => {
    // Base Band 2 rate = £12.9245, Band 3 rate = £14.05 (or custom rate / GrossPayCalculator)
    const band3HourlyRate = 14.05;

    const julyShifts: Shift[] = [
      // Week 1 (6–12 July): 36.0h substantive (e.g. 4x 7.5h + 6.0h Sunday on 12 July)
      {
        id: 'w1-1',
        date: '2026-07-06',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w1-2',
        date: '2026-07-07',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w1-3',
        date: '2026-07-08',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w1-4',
        date: '2026-07-09',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w1-sun',
        date: '2026-07-12',
        startTime: '08:00',
        endTime: '14:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 6.0h Sunday

      // Week 2 (13–19 July):
      // Substantive: 3x 7.5h = 22.5h (< 26.0h -> 0 additional hours)
      {
        id: 'w2-1',
        date: '2026-07-13',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w2-2',
        date: '2026-07-15',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w2-3',
        date: '2026-07-17',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      // Bank shifts in Week 2:
      {
        id: 'w2-bnk-14',
        date: '2026-07-14',
        startTime: '17:00',
        endTime: '20:00',
        unpaidBreakMinutes: 0,
        shiftType: 'BANK',
      }, // 3.0h Bank (Band 2)
      {
        id: 'w2-bnk-19',
        date: '2026-07-19',
        startTime: '08:00',
        endTime: '13:30',
        unpaidBreakMinutes: 0,
        shiftType: 'BANK',
        overrideBand: 'Band 3',
        customHourlyRate: band3HourlyRate,
      }, // 5.5h Bank Sunday (Band 3)

      // Week 3 (20–26 July): 30.5h substantive (3x 7.5h + 8.0h Sunday on 26 July -> 4.5h additional)
      {
        id: 'w3-1',
        date: '2026-07-20',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w3-2',
        date: '2026-07-22',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w3-3',
        date: '2026-07-24',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w3-sun',
        date: '2026-07-26',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 8.0h Sunday

      // Week 4 (27–31 July): 22.5h substantive (3x 7.5h -> 0 additional)
      {
        id: 'w4-1',
        date: '2026-07-27',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w4-2',
        date: '2026-07-29',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
      {
        id: 'w4-3',
        date: '2026-07-31',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
        shiftType: 'SUBSTANTIVE',
      }, // 7.5h
    ];

    const result = WageCalculatorService.calculateMonthlyPayslip(
      baseProfile,
      julyShifts,
      [],
      new Date(2026, 6, 1) // July 2026
    );

    // 1. Substantive Additional Hours: strictly 14.5h (10.0h + 0h + 4.5h + 0h)
    expect(result.additionalHours).toBe(14.5);
    expect(result.additionalHoursPay).toBe(187.41);
    expect(result.overtimeHours).toBeUndefined();

    // 2. Substantive Sunday EN: strictly 14.0h (6h on 12 July + 8h on 26 July)
    const substantiveSundayItem = result.payLineItems.find((p) => p.description === 'Sunday EN');
    expect(substantiveSundayItem).toBeDefined();
    expect(substantiveSundayItem?.unitsWorked).toBe(14.0);
    expect(substantiveSundayItem?.paidUnits).toBe(11.62); // 14h * 0.83 = 11.62h
    expect(substantiveSundayItem?.amount).toBe(150.18); // 11.62 * 12.9245 = 150.18

    // 3. No Acting Up Allowance (Band 3 was worked as a Bank shift, not substantive acting up)
    const actingUpItem = result.payLineItems.find(
      (p) => p.description === 'Higher Band / Acting Up Allowance'
    );
    expect(actingUpItem).toBeUndefined();

    // 4. Bank Basic Pay
    const bankBand3Item = result.payLineItems.find((p) =>
      p.description.includes('Bank Basic Pay (Band 3)')
    );
    expect(bankBand3Item).toBeDefined();
    expect(bankBand3Item?.unitsWorked).toBe(5.5);
    expect(bankBand3Item?.rate).toBe(14.05);
    expect(bankBand3Item?.amount).toBe(77.28);

    const bankBand2Item = result.payLineItems.find((p) => p.description === 'Bank Basic Pay');
    expect(bankBand2Item).toBeDefined();
    expect(bankBand2Item?.unitsWorked).toBe(3.0);
    expect(bankBand2Item?.amount).toBe(38.77);

    // 5. Bank Sunday Enhancement
    const bankSundayItem = result.payLineItems.find((p) => p.description === 'Bank Sunday EN');
    expect(bankSundayItem).toBeDefined();
    expect(bankSundayItem?.unitsWorked).toBe(5.5);
    expect(bankSundayItem?.paidUnits).toBe(4.56); // roundHours(5.5 * 0.83) = 4.56
    expect(bankSundayItem?.amount).toBe(64.07); // 4.56 * 14.05 = 64.07
  });
});
