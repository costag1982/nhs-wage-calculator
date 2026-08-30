import { describe, it, expect } from 'vitest';
import { calculateShiftGrossImpact } from '../domain/services/shiftImpactCalculator';
import { calculateShiftBreakdown } from '../domain/services/shiftIntervalCalculator';
import { NHS_BAND_CONFIGS } from '../domain/constants/nhsBands';
import { EmployeeProfile } from '../domain/models/Contract';
import { Shift } from '../domain/models/Shift';

const testProfile: EmployeeProfile = {
  employeeName: 'TEST EMPLOYEE',
  jobTitle: 'Admin Clerk',
  department: 'Emergency',
  location: 'Hospital',
  band: 'Band 2',
  contractType: 'SUBSTANTIVE',
  fullTimeSalaryFte: 25272.0,
  standardFullTimeHours: 37.5,
  contractedWeeklyHours: 26.0,
  taxCode: '1257L',
  niCategory: 'A',
  pensionContributionRate: 0.065,
  taxOfficeName: 'HMRC',
  taxOfficeRef: '123',
  niNumber: 'AB123456C',
  employeeNumber: '1001',
  payMethod: 'BACS',
};

const band2Config = NHS_BAND_CONFIGS['Band 2'];
const hourlyRate = 12.9245;

describe('ShiftImpactCalculator', () => {
  it('should calculate annual leave with 0 extra gross pay and clear summary message', () => {
    const shift = {
      id: 'leave-1',
      date: '2026-06-08',
      startTime: '08:00',
      endTime: '15:30',
      unpaidBreakMinutes: 0,
      shiftType: 'ANNUAL_LEAVE' as const,
    };
    const breakdown = calculateShiftBreakdown(shift);

    const impact = calculateShiftGrossImpact(
      {
        date: shift.date,
        shiftType: 'ANNUAL_LEAVE',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      [],
      testProfile
    );

    expect(impact.extraGrossPay).toBe(0);
    expect(impact.enhancementsTotal).toBe(0);
    expect(impact.additionalBasePay).toBe(0);
    expect(impact.summaryText).toContain('Paid as standard monthly basic salary');
    expect(impact.summaryText).toContain('£1460.16');
  });

  it('should calculate bank shift with full value added to extraGrossPay', () => {
    const shift = {
      id: 'bank-1',
      date: '2026-06-08',
      startTime: '22:00',
      endTime: '06:00',
      unpaidBreakMinutes: 30,
      shiftType: 'BANK' as const,
    };
    const breakdown = calculateShiftBreakdown(shift);

    const impact = calculateShiftGrossImpact(
      {
        date: shift.date,
        shiftType: 'BANK',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      [],
      testProfile
    );

    expect(impact.additionalHours).toBe(7.5);
    expect(impact.enhancementsTotal).toBeGreaterThan(0);
    expect(impact.extraGrossPay).toBe(impact.fullShiftValue);
    expect(impact.summaryText).toContain('Bank Hourly Pay');
  });

  it('should calculate substantive daytime shift within weekly contracted hours with 0 extra pay', () => {
    const shift = {
      id: 'sub-1',
      date: '2026-06-08',
      startTime: '07:30',
      endTime: '15:30',
      unpaidBreakMinutes: 30,
      shiftType: 'SUBSTANTIVE' as const,
    };
    const breakdown = calculateShiftBreakdown(shift);

    const impact = calculateShiftGrossImpact(
      {
        date: shift.date,
        shiftType: 'SUBSTANTIVE',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      [],
      testProfile
    );

    expect(impact.extraGrossPay).toBe(0);
    expect(impact.additionalHours).toBe(0);
    expect(impact.overtimeHours).toBe(0);
    expect(impact.summaryText).toContain('Covered by basic monthly salary');
  });

  it('should calculate substantive night shift within contracted hours with only unsocial enhancement extra pay', () => {
    const shift = {
      id: 'sub-night',
      date: '2026-06-08',
      startTime: '22:00',
      endTime: '06:00',
      unpaidBreakMinutes: 30,
      shiftType: 'SUBSTANTIVE' as const,
    };
    const breakdown = calculateShiftBreakdown(shift);

    const impact = calculateShiftGrossImpact(
      {
        date: shift.date,
        shiftType: 'SUBSTANTIVE',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      [],
      testProfile
    );

    // 7.5h night duty at +41% for Band 2: 7.5 * (12.9245 * 0.41) = 39.74
    expect(impact.additionalHours).toBe(0);
    expect(impact.overtimeHours).toBe(0);
    expect(impact.enhancementsTotal).toBe(39.74);
    expect(impact.extraGrossPay).toBe(39.74);
    expect(impact.summaryText).toContain('unsocial premium on top of basic salary');
  });

  it('should correctly calculate additional hours and overtime when weekly hours exceed thresholds', () => {
    // 3 prior shifts in same week (2026-06-08 Mon, 2026-06-09 Tue, 2026-06-10 Wed) each 8h = 24h
    const existingShifts: Shift[] = [
      {
        id: 's1',
        date: '2026-06-08',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      },
      {
        id: 's2',
        date: '2026-06-09',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      },
      {
        id: 's3',
        date: '2026-06-10',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      },
    ];

    // Candidate shift on 2026-06-11 Thu: 16h shift (takes week from 24h to 40h)
    const candidateShift = {
      id: 's4',
      date: '2026-06-11',
      startTime: '06:00',
      endTime: '22:00',
      unpaidBreakMinutes: 0,
      shiftType: 'SUBSTANTIVE' as const,
    };
    const breakdown = calculateShiftBreakdown(candidateShift);

    const impact = calculateShiftGrossImpact(
      {
        date: candidateShift.date,
        shiftType: 'SUBSTANTIVE',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      existingShifts,
      testProfile
    );

    expect(impact.priorWeeklyHours).toBe(24);
    expect(impact.newWeeklyHours).toBe(40);
    expect(impact.additionalHours).toBe(11.5);
    expect(impact.overtimeHours).toBe(2.5);
    expect(impact.additionalBasePay).toBe(
      Math.round((11.5 * hourlyRate + 2.5 * hourlyRate * 1.5) * 100) / 100
    );
  });
});
