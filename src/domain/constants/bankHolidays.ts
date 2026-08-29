import { formatDateIso, addDays } from '../utils/dateUtils';

export interface BankHoliday {
  date: string; // "YYYY-MM-DD"
  title: string;
}

/**
 * Computes Easter Sunday using the Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 * Accurate for all years in the Gregorian calendar (1583 to 4099+).
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Finds the first Monday on or after a given day in a month.
 */
function getFirstMonday(year: number, monthZeroIndexed: number): string {
  const date = new Date(Date.UTC(year, monthZeroIndexed, 1));
  while (date.getUTCDay() !== 1) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return formatDateIso(date);
}

/**
 * Finds the last Monday in a given month.
 */
function getLastMonday(year: number, monthZeroIndexed: number): string {
  // Start from last day of month
  const date = new Date(Date.UTC(year, monthZeroIndexed + 1, 0));
  while (date.getUTCDay() !== 1) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return formatDateIso(date);
}

// In-memory cache for year-to-holidays mapping
const yearHolidayCache = new Map<number, BankHoliday[]>();

/**
 * Computes all official England & Wales statutory bank holidays for any given year.
 */
export function getBankHolidaysForYear(year: number): BankHoliday[] {
  if (yearHolidayCache.has(year)) {
    return yearHolidayCache.get(year)!;
  }

  const holidays: BankHoliday[] = [];

  // 1. New Year's Day (Jan 1) with weekend substitute rule
  const nyd = new Date(Date.UTC(year, 0, 1));
  if (nyd.getUTCDay() === 6) {
    // Saturday -> Monday Jan 3
    holidays.push({ date: `${year}-01-03`, title: "New Year's Day (Substitute Day)" });
  } else if (nyd.getUTCDay() === 0) {
    // Sunday -> Monday Jan 2
    holidays.push({ date: `${year}-01-02`, title: "New Year's Day (Substitute Day)" });
  } else {
    holidays.push({ date: `${year}-01-01`, title: "New Year's Day" });
  }

  // 2. Good Friday & Easter Monday (calculated from Easter Sunday)
  const easterSunday = getEasterSunday(year);
  holidays.push({ date: formatDateIso(addDays(easterSunday, -2)), title: 'Good Friday' });
  holidays.push({ date: formatDateIso(addDays(easterSunday, 1)), title: 'Easter Monday' });

  // 3. Early May Bank Holiday (First Monday of May)
  holidays.push({ date: getFirstMonday(year, 4), title: 'Early May Bank Holiday' });

  // 4. Spring Bank Holiday (Last Monday of May)
  holidays.push({ date: getLastMonday(year, 4), title: 'Spring Bank Holiday' });

  // 5. Summer Bank Holiday (Last Monday of August)
  holidays.push({ date: getLastMonday(year, 7), title: 'Summer Bank Holiday' });

  // 6. Christmas Day & Boxing Day with weekend substitute rules
  const xmass = new Date(Date.UTC(year, 11, 25));
  const xmassDayOfWeek = xmass.getUTCDay();

  if (xmassDayOfWeek === 5) {
    // Friday: Christmas on Friday 25th, Boxing Day on Saturday -> Monday 28th
    holidays.push({ date: `${year}-12-25`, title: 'Christmas Day' });
    holidays.push({ date: `${year}-12-28`, title: 'Boxing Day (Substitute Day)' });
  } else if (xmassDayOfWeek === 6) {
    // Saturday: Christmas observed Mon 27th, Boxing Day observed Tue 28th
    holidays.push({ date: `${year}-12-27`, title: 'Christmas Day (Substitute Day)' });
    holidays.push({ date: `${year}-12-28`, title: 'Boxing Day (Substitute Day)' });
  } else if (xmassDayOfWeek === 0) {
    // Sunday: Christmas observed Mon 26th, Boxing Day observed Tue 27th
    holidays.push({ date: `${year}-12-26`, title: 'Christmas Day (Substitute Day)' });
    holidays.push({ date: `${year}-12-27`, title: 'Boxing Day (Substitute Day)' });
  } else {
    // Weekday
    holidays.push({ date: `${year}-12-25`, title: 'Christmas Day' });
    holidays.push({ date: `${year}-12-26`, title: 'Boxing Day' });
  }

  // Sort chronologically
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  yearHolidayCache.set(year, holidays);
  return holidays;
}

/**
 * Checks if a given ISO date string ("YYYY-MM-DD") is a UK England & Wales Bank Holiday.
 */
export function isBankHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  const year = parseInt(dateStr.substring(0, 4), 10);
  if (isNaN(year)) return false;
  const holidays = getBankHolidaysForYear(year);
  return holidays.some((h) => h.date === dateStr);
}

/**
 * Returns the formal title of the UK Bank Holiday for a given date string, or null if not a holiday.
 */
export function getBankHolidayTitle(dateStr: string): string | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.substring(0, 4), 10);
  if (isNaN(year)) return null;
  const holidays = getBankHolidaysForYear(year);
  const match = holidays.find((h) => h.date === dateStr);
  return match ? match.title : null;
}
