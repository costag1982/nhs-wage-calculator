import { describe, it, expect } from 'vitest';
import { ShiftIntervalCalculator } from '../domain/services/ShiftIntervalCalculator';
import { Shift } from '../domain/models/Shift';

describe('ShiftIntervalCalculator', () => {
  it('correctly calculates daytime hours on a standard weekday', () => {
    const shift: Shift = {
      id: '1',
      date: '2026-07-01', // Wednesday
      startTime: '08:00',
      endTime: '16:00',
      unpaidBreakMinutes: 30,
    };

    const breakdown = ShiftIntervalCalculator.calculateBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(7.5);
    expect(breakdown.plainDayHours).toBe(7.5);
    expect(breakdown.nightHours).toBe(0);
    expect(breakdown.saturdayHours).toBe(0);
    expect(breakdown.sundayHours).toBe(0);
    expect(breakdown.bankHolidayHours).toBe(0);
  });

  it('correctly splits weekday overnight shift crossing midnight into plain and night hours', () => {
    // Wednesday 19:00 to Thursday 07:30 (12.5 hrs gross, 30m break = 12h paid)
    // 19:00 - 20:00 (1h plain)
    // 20:00 - 06:00 (10h night)
    // 06:00 - 07:30 (1.5h plain)
    // Gross: 2.5h plain, 10h night. Net with 30m break: 2.4h plain, 9.6h night
    const shift: Shift = {
      id: '2',
      date: '2026-07-01', // Wednesday
      startTime: '19:00',
      endTime: '07:30',
      unpaidBreakMinutes: 30,
    };

    const breakdown = ShiftIntervalCalculator.calculateBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(12);
    expect(breakdown.nightHours).toBe(9.6);
    expect(breakdown.plainDayHours).toBe(2.4);
    expect(breakdown.saturdayHours).toBe(0);
    expect(breakdown.sundayHours).toBe(0);
  });

  it('correctly identifies Saturday hours for weekend shifts', () => {
    const shift: Shift = {
      id: '3',
      date: '2026-07-04', // Saturday
      startTime: '07:00',
      endTime: '19:30',
      unpaidBreakMinutes: 60,
    };

    const breakdown = ShiftIntervalCalculator.calculateBreakdown(shift);

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

    const breakdown = ShiftIntervalCalculator.calculateBreakdown(shift);

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

    const breakdown = ShiftIntervalCalculator.calculateBreakdown(shift);

    expect(breakdown.totalWorkedHours).toBe(11);
    expect(breakdown.bankHolidayHours).toBe(11);
    expect(breakdown.plainDayHours).toBe(0);
  });
});
