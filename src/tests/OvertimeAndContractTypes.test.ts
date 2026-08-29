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
});
