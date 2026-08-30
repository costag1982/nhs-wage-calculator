import { describe, it, expect } from 'vitest';
import {
  isBankHoliday,
  getBankHolidayTitle,
  getBankHolidaysForYear,
} from '../domain/constants/bankHolidays';

describe('UK England & Wales Bank Holidays Engine (Clean Code Tests)', () => {
  describe("1. New Year's Day Statutory & Substitute Rules", () => {
    it("observes New Year's Day on Jan 1 when falling on a weekday", () => {
      expect(isBankHoliday('2025-01-01')).toBe(true);
      expect(getBankHolidayTitle('2025-01-01')).toBe("New Year's Day");

      expect(isBankHoliday('2026-01-01')).toBe(true);
      expect(getBankHolidayTitle('2026-01-01')).toBe("New Year's Day");
    });

    it('rolls over to Monday Jan 3 when Jan 1 falls on a Saturday (e.g. 2022)', () => {
      expect(isBankHoliday('2022-01-01')).toBe(false);
      expect(isBankHoliday('2022-01-03')).toBe(true);
      expect(getBankHolidayTitle('2022-01-03')).toBe("New Year's Day (Substitute Day)");
    });

    it('rolls over to Monday Jan 2 when Jan 1 falls on a Sunday (e.g. 2023)', () => {
      expect(isBankHoliday('2023-01-01')).toBe(false);
      expect(isBankHoliday('2023-01-02')).toBe(true);
      expect(getBankHolidayTitle('2023-01-02')).toBe("New Year's Day (Substitute Day)");
    });
  });

  describe('2. Easter-Dependent Holidays (Good Friday & Easter Monday)', () => {
    it('computes Good Friday and Easter Monday for early Easter (2024: Easter March 31)', () => {
      expect(isBankHoliday('2024-03-29')).toBe(true);
      expect(getBankHolidayTitle('2024-03-29')).toBe('Good Friday');

      expect(isBankHoliday('2024-04-01')).toBe(true);
      expect(getBankHolidayTitle('2024-04-01')).toBe('Easter Monday');
    });

    it('computes Good Friday and Easter Monday for mid Easter (2026: Easter April 5)', () => {
      expect(isBankHoliday('2026-04-03')).toBe(true);
      expect(getBankHolidayTitle('2026-04-03')).toBe('Good Friday');

      expect(isBankHoliday('2026-04-06')).toBe(true);
      expect(getBankHolidayTitle('2026-04-06')).toBe('Easter Monday');
    });

    it('computes Good Friday and Easter Monday for late Easter (2025: Easter April 20)', () => {
      expect(isBankHoliday('2025-04-18')).toBe(true);
      expect(getBankHolidayTitle('2025-04-18')).toBe('Good Friday');

      expect(isBankHoliday('2025-04-21')).toBe(true);
      expect(getBankHolidayTitle('2025-04-21')).toBe('Easter Monday');
    });
  });

  describe('3. May and August Statutory Bank Holidays', () => {
    it('calculates Early May Bank Holiday as the first Monday of May', () => {
      expect(isBankHoliday('2025-05-05')).toBe(true);
      expect(getBankHolidayTitle('2025-05-05')).toBe('Early May Bank Holiday');

      expect(isBankHoliday('2026-05-04')).toBe(true);
      expect(getBankHolidayTitle('2026-05-04')).toBe('Early May Bank Holiday');

      expect(isBankHoliday('2027-05-03')).toBe(true);
      expect(getBankHolidayTitle('2027-05-03')).toBe('Early May Bank Holiday');
    });

    it('calculates Spring Bank Holiday as the last Monday of May', () => {
      expect(isBankHoliday('2025-05-26')).toBe(true);
      expect(getBankHolidayTitle('2025-05-26')).toBe('Spring Bank Holiday');

      expect(isBankHoliday('2026-05-25')).toBe(true);
      expect(getBankHolidayTitle('2026-05-25')).toBe('Spring Bank Holiday');

      expect(isBankHoliday('2027-05-31')).toBe(true);
      expect(getBankHolidayTitle('2027-05-31')).toBe('Spring Bank Holiday');
    });

    it('calculates Summer Bank Holiday as the last Monday of August', () => {
      expect(isBankHoliday('2025-08-25')).toBe(true);
      expect(getBankHolidayTitle('2025-08-25')).toBe('Summer Bank Holiday');

      expect(isBankHoliday('2026-08-31')).toBe(true);
      expect(getBankHolidayTitle('2026-08-31')).toBe('Summer Bank Holiday');

      expect(isBankHoliday('2027-08-30')).toBe(true);
      expect(getBankHolidayTitle('2027-08-30')).toBe('Summer Bank Holiday');
    });
  });

  describe('4. Christmas & Boxing Day Statutory & Substitute Rules', () => {
    it('handles Friday Christmas (2020: Christmas Friday, Boxing Day Saturday -> substitute Monday 28th)', () => {
      expect(isBankHoliday('2020-12-25')).toBe(true);
      expect(getBankHolidayTitle('2020-12-25')).toBe('Christmas Day');

      expect(isBankHoliday('2020-12-26')).toBe(false); // Saturday
      expect(isBankHoliday('2020-12-28')).toBe(true);
      expect(getBankHolidayTitle('2020-12-28')).toBe('Boxing Day (Substitute Day)');
    });

    it('handles Saturday Christmas (2021 & 2027: Christmas observed Mon 27th, Boxing Day observed Tue 28th)', () => {
      expect(isBankHoliday('2021-12-25')).toBe(false);
      expect(isBankHoliday('2021-12-26')).toBe(false);
      expect(isBankHoliday('2021-12-27')).toBe(true);
      expect(getBankHolidayTitle('2021-12-27')).toBe('Christmas Day (Substitute Day)');
      expect(isBankHoliday('2021-12-28')).toBe(true);
      expect(getBankHolidayTitle('2021-12-28')).toBe('Boxing Day (Substitute Day)');
    });

    it('handles Sunday Christmas (2022: Christmas observed Mon 26th, Boxing Day observed Tue 27th)', () => {
      expect(isBankHoliday('2022-12-25')).toBe(false);
      expect(isBankHoliday('2022-12-26')).toBe(true);
      expect(getBankHolidayTitle('2022-12-26')).toBe('Christmas Day (Substitute Day)');
      expect(isBankHoliday('2022-12-27')).toBe(true);
      expect(getBankHolidayTitle('2022-12-27')).toBe('Boxing Day (Substitute Day)');
    });

    it('handles Midweek Christmas (2025: Thursday 25th, Friday 26th)', () => {
      expect(isBankHoliday('2025-12-25')).toBe(true);
      expect(getBankHolidayTitle('2025-12-25')).toBe('Christmas Day');
      expect(isBankHoliday('2025-12-26')).toBe(true);
      expect(getBankHolidayTitle('2025-12-26')).toBe('Boxing Day');
    });
  });

  describe('5. Full Year Retrieval and Edge Cases', () => {
    it('returns exactly 8 statutory bank holidays sorted chronologically for any year', () => {
      const holidays2026 = getBankHolidaysForYear(2026);
      expect(holidays2026).toHaveLength(8);

      // Verify ascending order
      for (let i = 0; i < holidays2026.length - 1; i++) {
        expect(holidays2026[i].date < holidays2026[i + 1].date).toBe(true);
      }
    });

    it('returns false and null for regular non-holiday working days', () => {
      expect(isBankHoliday('2026-07-09')).toBe(false);
      expect(getBankHolidayTitle('2026-07-09')).toBeNull();

      expect(isBankHoliday('2026-02-14')).toBe(false);
      expect(getBankHolidayTitle('2026-02-14')).toBeNull();
    });

    it('safely handles empty or malformed inputs without throwing exceptions', () => {
      expect(isBankHoliday('')).toBe(false);
      expect(isBankHoliday('invalid-date')).toBe(false);
      expect(getBankHolidayTitle('')).toBeNull();
      expect(getBankHolidayTitle('not-a-date')).toBeNull();
    });
  });
});
