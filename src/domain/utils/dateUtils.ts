import { isBankHoliday } from '../constants/bankHolidays';

/**
 * Pure date manipulation and formatting utilities for NHS rostering and payroll.
 */

/**
 * Formats a Date object as an ISO date string ("YYYY-MM-DD") using UTC values.
 */
export function formatDateIso(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats numeric year, month (1-12), and day parts into an ISO date string ("YYYY-MM-DD").
 */
export function formatDateIsoParts(year: number, month1To12: number, day: number): string {
  const y = year;
  const m = String(month1To12).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a new Date with a given number of days added (using UTC).
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Returns the last calendar day of the month for the given date.
 */
export function getEndOfMonthDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Returns the exact last working day of the month for NHS payroll
 * (excluding Saturdays, Sundays, and official UK statutory bank holidays).
 */
export function getLastWorkingDayOfMonth(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed month
  // Start from the last calendar day of the month
  const current = new Date(year, month + 1, 0);

  while (current.getMonth() === month) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isoDateStr = formatDateIsoParts(
      current.getFullYear(),
      current.getMonth() + 1,
      current.getDate()
    );
    const isHoliday = isBankHoliday(isoDateStr);

    if (!isWeekend && !isHoliday) {
      return current;
    }

    current.setDate(current.getDate() - 1);
  }

  return current;
}

/**
 * Returns the Date representing the 1st of the payment month (1 calendar month after the worked month).
 * Handles year boundaries cleanly (e.g. December -> January of next year).
 */
export function getPaymentMonthDate(workedMonth: Date): Date {
  return new Date(workedMonth.getFullYear(), workedMonth.getMonth() + 1, 1);
}

/**
 * Returns an ISO 8601 week key (e.g. "2026-W35") for a given date string ("YYYY-MM-DD").
 * Weeks start on Monday per ISO standard.
 */
export function getIsoWeekKey(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay() || 7; // Sun=0 → 7
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const millisecondsPerDay = 86_400_000;
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / millisecondsPerDay + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Formats a Date object into human-readable month and year (e.g. "July 2026") in British English.
 */
export function formatMonthYearString(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Formats the period end date string for the NHS ESR payslip (e.g. "31 JUL 2026").
 */
export function formatPeriodEndDate(monthYear: Date): string {
  const endOfMonth = getEndOfMonthDate(monthYear);
  const day = endOfMonth.getDate();
  const monthShort = endOfMonth.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const year = endOfMonth.getFullYear();
  return `${day} ${monthShort} ${year}`;
}

/**
 * Formats the exact BACS payday (last working day of the month) for NHS payroll (e.g. "31 JUL 2026", "28 AUG 2026").
 */
export function formatPayDate(monthYear: Date): string {
  const lastWorkingDay = getLastWorkingDayOfMonth(monthYear);
  const day = lastWorkingDay.getDate();
  const monthShort = lastWorkingDay.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const year = lastWorkingDay.getFullYear();
  return `${day} ${monthShort} ${year}`;
}

/**
 * Computes the UK tax period number (Month 1 = April, Month 4 = July, Month 12 = March).
 */
export function getUkTaxPeriod(monthYear: Date): number {
  const calendarMonth = monthYear.getMonth(); // 0 = Jan, 3 = Apr, 6 = Jul
  return calendarMonth >= 3 ? calendarMonth - 2 : calendarMonth + 10;
}
