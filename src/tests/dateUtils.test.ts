import { describe, it, expect } from 'vitest';
import {
  formatDateIso,
  formatDateIsoParts,
  addDays,
  getEndOfMonthDate,
  getLastWorkingDayOfMonth,
  getPaymentMonthDate,
  getIsoWeekKey,
  formatMonthYearString,
  formatPeriodEndDate,
  formatPayDate,
  getUkTaxPeriod,
  getIsoWeekNumber,
  formatDateBritish,
  getShiftDateRange,
} from '../domain/utils/dateUtils';

describe('dateUtils', () => {
  describe('formatDateIso', () => {
    it('formats UTC dates as YYYY-MM-DD', () => {
      const date = new Date(Date.UTC(2026, 6, 9));
      expect(formatDateIso(date)).toBe('2026-07-09');
    });
  });

  describe('formatDateIsoParts', () => {
    it('formats numeric components with zero-padding', () => {
      expect(formatDateIsoParts(2026, 7, 5)).toBe('2026-07-05');
      expect(formatDateIsoParts(2026, 12, 25)).toBe('2026-12-25');
    });
  });

  describe('addDays', () => {
    it('correctly adds positive and negative days', () => {
      const date = new Date(Date.UTC(2026, 6, 1));
      const nextDay = addDays(date, 5);
      expect(formatDateIso(nextDay)).toBe('2026-07-06');

      const prevDay = addDays(date, -2);
      expect(formatDateIso(prevDay)).toBe('2026-06-29');
    });
  });

  describe('getEndOfMonthDate', () => {
    it('computes last day of month including leap years', () => {
      expect(getEndOfMonthDate(new Date(2026, 6, 1)).getDate()).toBe(31); // July 31
      expect(getEndOfMonthDate(new Date(2026, 1, 1)).getDate()).toBe(28); // Feb 2026 (non-leap)
      expect(getEndOfMonthDate(new Date(2024, 1, 1)).getDate()).toBe(29); // Feb 2024 (leap year)
    });
  });

  describe('getPaymentMonthDate', () => {
    it('advances worked month to the next payment month (e.g. June -> July)', () => {
      const juneWorked = new Date(2026, 5, 1); // June 2026
      const julyPaid = getPaymentMonthDate(juneWorked);
      expect(julyPaid.getFullYear()).toBe(2026);
      expect(julyPaid.getMonth()).toBe(6); // July (0-indexed 6)
      expect(formatMonthYearString(julyPaid)).toBe('July 2026');
    });

    it('handles year boundary rollover correctly (e.g. December -> January next year)', () => {
      const decWorked = new Date(2026, 11, 1); // December 2026
      const janPaid = getPaymentMonthDate(decWorked);
      expect(janPaid.getFullYear()).toBe(2027);
      expect(janPaid.getMonth()).toBe(0); // January 2027
      expect(formatMonthYearString(janPaid)).toBe('January 2027');
    });
  });

  describe('getIsoWeekKey', () => {
    it('returns ISO week string starting on Monday', () => {
      expect(getIsoWeekKey('2026-07-01')).toBe('2026-W27');
      expect(getIsoWeekKey('2026-07-06')).toBe('2026-W28');
    });
  });

  describe('formatMonthYearString', () => {
    it('formats in British English', () => {
      const date = new Date(2026, 6, 1);
      expect(formatMonthYearString(date)).toBe('July 2026');
    });
  });

  describe('formatPeriodEndDate', () => {
    it('formats uppercase short month for NHS ESR payslip', () => {
      const date = new Date(2026, 6, 1);
      expect(formatPeriodEndDate(date)).toBe('31 JUL 2026');
    });
  });

  describe('getLastWorkingDayOfMonth and formatPayDate', () => {
    it('returns 31 July 2026 when last day is Friday', () => {
      const date = new Date(2026, 6, 1); // July 2026
      const lastWorkingDay = getLastWorkingDayOfMonth(date);
      expect(lastWorkingDay.getDate()).toBe(31);
      expect(lastWorkingDay.getDay()).toBe(5); // Friday
      expect(formatPayDate(date)).toBe('31 JUL 2026');
    });

    it('rolls back from Bank Holiday Monday to preceding Friday (August 2026)', () => {
      // 31 Aug 2026 is Summer Bank Holiday Monday -> moves back to Friday 28 Aug 2026
      const date = new Date(2026, 7, 1); // August 2026
      const lastWorkingDay = getLastWorkingDayOfMonth(date);
      expect(lastWorkingDay.getDate()).toBe(28);
      expect(lastWorkingDay.getDay()).toBe(5); // Friday
      expect(formatPayDate(date)).toBe('28 AUG 2026');
    });

    it('rolls back from Sunday to preceding Friday (May 2026)', () => {
      // 31 May 2026 is Sunday -> moves back to Friday 29 May 2026
      const date = new Date(2026, 4, 1); // May 2026
      const lastWorkingDay = getLastWorkingDayOfMonth(date);
      expect(lastWorkingDay.getDate()).toBe(29);
      expect(lastWorkingDay.getDay()).toBe(5); // Friday
      expect(formatPayDate(date)).toBe('29 MAY 2026');
    });

    it('rolls back from Saturday to preceding Friday (February 2026)', () => {
      // 28 Feb 2026 is Saturday -> moves back to Friday 27 Feb 2026
      const date = new Date(2026, 1, 1); // Feb 2026
      const lastWorkingDay = getLastWorkingDayOfMonth(date);
      expect(lastWorkingDay.getDate()).toBe(27);
      expect(lastWorkingDay.getDay()).toBe(5); // Friday
      expect(formatPayDate(date)).toBe('27 FEB 2026');
    });

    it('rolls back past Easter weekend and Good Friday (March 2024)', () => {
      // 31 Mar 2024 is Easter Sunday, 29 Mar is Good Friday -> moves back to Thursday 28 Mar 2024
      const date = new Date(2024, 2, 1); // March 2024
      const lastWorkingDay = getLastWorkingDayOfMonth(date);
      expect(lastWorkingDay.getDate()).toBe(28);
      expect(lastWorkingDay.getDay()).toBe(4); // Thursday
      expect(formatPayDate(date)).toBe('28 MAR 2024');
    });
  });

  describe('getUkTaxPeriod', () => {
    it('calculates tax month from April = Month 1 to March = Month 12', () => {
      expect(getUkTaxPeriod(new Date(2026, 3, 1))).toBe(1); // April = 1
      expect(getUkTaxPeriod(new Date(2026, 6, 1))).toBe(4); // July = 4
      expect(getUkTaxPeriod(new Date(2026, 11, 1))).toBe(9); // December = 9
      expect(getUkTaxPeriod(new Date(2026, 0, 1))).toBe(10); // January = 10
      expect(getUkTaxPeriod(new Date(2026, 2, 1))).toBe(12); // March = 12
    });
  });

  describe('getIsoWeekNumber', () => {
    it('returns ISO week number (1-53)', () => {
      expect(getIsoWeekNumber('2026-06-06')).toBe(23);
      expect(getIsoWeekNumber('2026-07-01')).toBe(27);
      expect(getIsoWeekNumber('2026-01-01')).toBe(1);
    });
  });

  describe('formatDateBritish', () => {
    it('formats ISO string with weekday, day, month and year', () => {
      expect(formatDateBritish('2026-06-06')).toBe('Sat 6 Jun 2026');
      expect(formatDateBritish('2026-06-06', { includeYear: false, includeWeekday: true })).toBe(
        'Sat 6 Jun'
      );
    });
  });

  describe('getShiftDateRange', () => {
    it('handles daytime shifts with same start and end dates', () => {
      const result = getShiftDateRange('2026-06-02', '07:30', '15:30');
      expect(result.isOvernight).toBe(false);
      expect(result.startDateIso).toBe('2026-06-02');
      expect(result.endDateIso).toBe('2026-06-02');
      expect(result.formattedStartDate).toBe('Tue 2 Jun 2026');
      expect(result.formattedEndDate).toBe('Tue 2 Jun 2026');
    });

    it('correctly handles overnight twilight shifts crossing midnight into next day', () => {
      const result = getShiftDateRange('2026-06-06', '22:00', '06:00');
      expect(result.isOvernight).toBe(true);
      expect(result.startDateIso).toBe('2026-06-06');
      expect(result.endDateIso).toBe('2026-06-07');
      expect(result.formattedStartDate).toBe('Sat 6 Jun 2026');
      expect(result.formattedEndDate).toBe('Sun 7 Jun 2026');
    });

    it('handles month/year boundary for overnight shift (e.g. 31 Dec -> 1 Jan)', () => {
      const result = getShiftDateRange('2026-12-31', '20:00', '08:00');
      expect(result.isOvernight).toBe(true);
      expect(result.startDateIso).toBe('2026-12-31');
      expect(result.endDateIso).toBe('2027-01-01');
      expect(result.formattedStartDate).toBe('Thu 31 Dec 2026');
      expect(result.formattedEndDate).toBe('Fri 1 Jan 2027');
    });
  });
});
