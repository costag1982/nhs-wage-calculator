import { describe, it, expect } from 'vitest';
import { calculateMonthlyPayslip } from '../domain/services/wageCalculatorService';
import { EmployeeProfile } from '../domain/models/Contract';
import { Shift } from '../domain/models/Shift';

describe('Per-Shift Pay Band Override & Acting Up Calculations', () => {
  const band2Profile: EmployeeProfile = {
    employeeName: 'MISS GEMMA HOWARD',
    jobTitle: 'Admin Support Clerk',
    department: 'Emergency Depart',
    location: 'Airedale General Hospital',
    band: 'Band 2',
    contractType: 'SUBSTANTIVE',
    fullTimeSalaryFte: 25272.0, // £12.9245/hr
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

  it('calculates acting up allowance and higher enhancements when a Band 2 employee works a Band 3 shift', () => {
    // 1x 7.5h Morning shift at Band 3 (£13.5525/hr)
    const band3Shift: Shift = {
      id: 'shift-band3-morning',
      date: '2026-07-07',
      startTime: '07:30',
      endTime: '15:30',
      unpaidBreakMinutes: 30, // 7.5h
      overrideBand: 'Band 3',
    };

    const payslip = calculateMonthlyPayslip(band2Profile, [band3Shift], [], new Date(2026, 6, 1));

    // Basic pay should be standard Band 2 monthly basic pay (£1,460.16)
    const basicPayItem = payslip.payLineItems.find((p) => p.description === 'Basic Pay');
    expect(basicPayItem).toBeDefined();
    expect(basicPayItem?.amount).toBe(1460.16);

    // Higher Band / Acting Up Allowance should be added for the 7.5h difference
    // Band 3 rate (£13.5525) - Band 2 rate (£12.9245) = £0.628/hr * 7.5h = £4.71
    const actingUpItem = payslip.payLineItems.find(
      (p) => p.description === 'Higher Band / Acting Up Allowance'
    );
    expect(actingUpItem).toBeDefined();
    expect(actingUpItem?.unitsWorked).toBe(7.5);
    expect(actingUpItem?.amount).toBe(4.71);

    // Gross pay includes basic pay + acting up allowance
    expect(payslip.grossPay).toBe(1464.87);
  });

  it('calculates Band 3 night enhancements at the higher Band 3 hourly rate', () => {
    // 1x 10h Night Duty at Band 3 (£13.5525/hr, +41% enhancement)
    const band3NightShift: Shift = {
      id: 'shift-band3-night',
      date: '2026-07-06',
      startTime: '20:00',
      endTime: '06:00',
      unpaidBreakMinutes: 0, // 10h night
      overrideBand: 'Band 3',
    };

    const payslip = calculateMonthlyPayslip(
      band2Profile,
      [band3NightShift],
      [],
      new Date(2026, 6, 1)
    );

    // Night enhancement: 10h * 0.41 = 4.10 units @ Band 3 rate (£13.5525/hr) = £55.57
    const nightItem = payslip.payLineItems.find((p) => p.description === 'Night Duty EN');
    expect(nightItem).toBeDefined();
    expect(nightItem?.unitsWorked).toBe(10);
    expect(nightItem?.amount).toBe(55.57);
  });
});
