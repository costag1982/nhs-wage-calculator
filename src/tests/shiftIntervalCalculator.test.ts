import { describe, it, expect } from 'vitest';
import { calculateShiftBreakdown } from '../domain/services/shiftIntervalCalculator';
import { calculateShiftGrossImpact } from '../domain/services/shiftImpactCalculator';
import { NHS_BAND_CONFIGS } from '../domain/constants/nhsBands';
import { Shift } from '../domain/models/Shift';
import { EmployeeProfile } from '../domain/models/Contract';

describe('ShiftIntervalCalculator', () => {
  it('correctly calculates daytime hours on a standard weekday', () => {
    const shift: Shift = {
      id: '1',
      date: '2026-07-01', // Wednesday
      startTime: '08:00',
      endTime: '16:00',
      unpaidBreakMinutes: 30,
    };

    const breakdown = calculateShiftBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(7.5);
    expect(breakdown.plainDayHours).toBe(7.5);
    expect(breakdown.nightHours).toBe(0);
    expect(breakdown.saturdayHours).toBe(0);
    expect(breakdown.sundayHours).toBe(0);
    expect(breakdown.bankHolidayHours).toBe(0);
  });

  it('applies the whole-shift night enhancement when more than half is in the night window', () => {
    // Wednesday 19:00 to Thursday 07:30 (12.5 hrs gross, 30m break = 12h paid)
    // 19:00 - 20:00 (1h plain)
    // 20:00 - 06:00 (10h night)
    // 06:00 - 07:30 (1.5h plain)
    // More than half is between 20:00 and 06:00, so AfC 2.13 covers the whole paid shift.
    const shift: Shift = {
      id: '2',
      date: '2026-07-01', // Wednesday
      startTime: '19:00',
      endTime: '07:30',
      unpaidBreakMinutes: 30,
    };

    const breakdown = calculateShiftBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(12);
    expect(breakdown.nightHours).toBe(12);
    expect(breakdown.plainDayHours).toBe(0);
    expect(breakdown.saturdayHours).toBe(0);
    expect(breakdown.sundayHours).toBe(0);
  });

  it('places an explicit break in the correct pay category at a Friday/Saturday boundary', () => {
    const breakdown = calculateShiftBreakdown({
      id: 'boundary-break',
      date: '2026-07-17',
      startTime: '22:00',
      endTime: '06:00',
      unpaidBreakMinutes: 30,
      unpaidBreakStartTime: '02:00',
    });

    expect(breakdown.totalWorkedHours).toBe(7.5);
    expect(breakdown.nightHours).toBe(2);
    expect(breakdown.saturdayHours).toBe(5.5);
  });

  it('correctly identifies Saturday hours for weekend shifts', () => {
    const shift: Shift = {
      id: '3',
      date: '2026-07-04', // Saturday
      startTime: '07:00',
      endTime: '19:30',
      unpaidBreakMinutes: 60,
    };

    const breakdown = calculateShiftBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(11.5);
    expect(breakdown.saturdayHours).toBe(11.5);
    expect(breakdown.plainDayHours).toBe(0);
    expect(breakdown.nightHours).toBe(0);
  });

  it('correctly identifies Sunday hours', () => {
    const shift: Shift = {
      id: '4',
      date: '2026-07-05', // Sunday
      startTime: '07:00',
      endTime: '19:30',
      unpaidBreakMinutes: 60,
    };

    const breakdown = calculateShiftBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(11.5);
    expect(breakdown.sundayHours).toBe(11.5);
    expect(breakdown.saturdayHours).toBe(0);
  });

  it('correctly classifies a UK Bank Holiday as public holiday hours', () => {
    const shift: Shift = {
      id: '5',
      date: '2026-08-31', // Summer Bank Holiday 2026
      startTime: '08:00',
      endTime: '20:00',
      unpaidBreakMinutes: 60,
    };

    const breakdown = calculateShiftBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(11);
    expect(breakdown.bankHolidayHours).toBe(11);
    expect(breakdown.plainDayHours).toBe(0);
  });
});

describe('calculateShiftGrossImpact', () => {
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
  const band2Config = NHS_BAND_CONFIGS['Band 2'];
  const hourlyRate = 12.9245;

  it('reports £0.00 extra gross pay for a standard daytime shift within 26h weekly contracted threshold', () => {
    const breakdown = calculateShiftBreakdown({
      id: 'preview',
      date: '2026-06-03', // Wednesday
      startTime: '07:30',
      endTime: '15:30',
      unpaidBreakMinutes: 30,
    });

    const impact = calculateShiftGrossImpact(
      {
        date: '2026-06-03',
        shiftType: 'SUBSTANTIVE',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      [], // No prior shifts this week
      gemmaProfile
    );

    expect(impact.extraGrossPay).toBe(0);
    expect(impact.enhancementsTotal).toBe(0);
    expect(impact.additionalBasePay).toBe(0);
    expect(impact.summaryText).toContain('Covered by basic monthly salary');
  });

  it('reports exact unsocial enhancement (+£39.74) for a twilight night shift within 26h weekly contracted threshold', () => {
    const breakdown = calculateShiftBreakdown({
      id: 'preview',
      date: '2026-06-04', // Thursday
      startTime: '22:00',
      endTime: '06:00',
      unpaidBreakMinutes: 30,
    }); // 7.5h all night

    const impact = calculateShiftGrossImpact(
      {
        date: '2026-06-04',
        shiftType: 'SUBSTANTIVE',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      [], // 0 prior hours
      gemmaProfile
    );

    // 7.5h * 12.9245 * 0.41 = £39.7428 -> ~£39.74
    expect(impact.enhancementsTotal).toBeCloseTo(39.74, 2);
    expect(impact.additionalBasePay).toBe(0);
    expect(impact.extraGrossPay).toBeCloseTo(39.74, 2);
    expect(impact.summaryText).toContain('unsocial enhancements on top of basic salary');
  });

  it('reports both additional hours pay and night enhancement (+£136.68 total) when extra OVERTIME shift is worked', () => {
    // 26h already worked earlier this week (e.g. Mon, Tue, Wed)
    const priorShifts: Shift[] = [
      {
        id: 's1',
        date: '2026-06-01', // Mon
        startTime: '08:00',
        endTime: '17:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 9h
      {
        id: 's2',
        date: '2026-06-02', // Tue
        startTime: '08:00',
        endTime: '17:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 9h
      {
        id: 's3',
        date: '2026-06-03', // Wed
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 0,
        shiftType: 'SUBSTANTIVE',
      }, // 8h (Total 26h)
    ];

    const breakdown = calculateShiftBreakdown({
      id: 'preview',
      date: '2026-06-04', // Thursday
      startTime: '22:00',
      endTime: '06:00',
      unpaidBreakMinutes: 30,
      shiftType: 'OVERTIME',
    }); // 7.5h night

    const impact = calculateShiftGrossImpact(
      {
        date: '2026-06-04',
        shiftType: 'OVERTIME',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      priorShifts,
      gemmaProfile
    );

    // 7.5h * 12.9245 (base additional hours) = £96.93
    expect(impact.additionalBasePay).toBeCloseTo(96.93, 2);
    // 7.5h * (12.9245 * 0.41) = £39.74
    expect(impact.enhancementsTotal).toBeCloseTo(39.74, 2);
    // Total extra = 96.93 + 39.74 = £136.68
    expect(impact.extraGrossPay).toBeCloseTo(136.68, 2);
    expect(impact.summaryText).toContain('extra pay');
    expect(impact.summaryText).toContain('unsocial enhancements');
  });

  it('reports the full shift value for Bank shifts regardless of weekly hours', () => {
    const breakdown = calculateShiftBreakdown({
      id: 'preview',
      date: '2026-06-04',
      startTime: '22:00',
      endTime: '06:00',
      unpaidBreakMinutes: 30,
      shiftType: 'BANK',
    });

    const impact = calculateShiftGrossImpact(
      {
        date: '2026-06-04',
        shiftType: 'BANK',
        breakdown,
        effectiveRate: hourlyRate,
        bandConfig: band2Config,
      },
      [],
      gemmaProfile
    );

    expect(impact.extraGrossPay).toBeCloseTo(136.68, 2);
    expect(impact.summaryText).toContain('Bank Hourly Pay');
  });
});
