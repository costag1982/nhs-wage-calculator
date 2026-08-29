import { Shift, ShiftHoursBreakdown } from '../models/Shift';
import { isBankHoliday } from '../constants/bankHolidays';
import { roundHours } from '../utils/mathUtils';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const NIGHT_END_MINUTE = 6 * MINUTES_PER_HOUR; // 06:00
const NIGHT_START_MINUTE = 20 * MINUTES_PER_HOUR; // 20:00

interface MinuteSlice {
  isBankHoliday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  isNight: boolean; // Weekday between 20:00 and 06:00
  isPlainDay: boolean; // Weekday between 06:00 and 20:00
}

/**
 * Calculates the exact breakdown of hours for an NHS shift across:
 * - Plain Day (Mon-Fri 06:00 - 20:00)
 * - Night Duty (Mon-Fri 20:00 - 06:00)
 * - Saturday (00:00 - 24:00)
 * - Sunday (00:00 - 24:00)
 * - Public / Bank Holiday (00:00 - 24:00)
 *
 * Adheres to Single Responsibility Principle (Robert C. Martin).
 */
export class ShiftIntervalCalculator {
  public static calculateBreakdown(shift: Shift): ShiftHoursBreakdown {
    const { date, startTime, endTime, unpaidBreakMinutes = 0 } = shift;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startTotalMinutes = startHour * MINUTES_PER_HOUR + startMin;
    let endTotalMinutes = endHour * MINUTES_PER_HOUR + endMin;

    // Handle shift crossing midnight
    const isOvernight = endTotalMinutes <= startTotalMinutes;
    if (isOvernight) {
      endTotalMinutes += MINUTES_PER_DAY;
    }

    const totalRawMinutes = endTotalMinutes - startTotalMinutes;
    const paidMinutes = Math.max(0, totalRawMinutes - unpaidBreakMinutes);
    const breakRatio = totalRawMinutes > 0 ? paidMinutes / totalRawMinutes : 0;

    let bankHolidayMinutes = 0;
    let sundayMinutes = 0;
    let saturdayMinutes = 0;
    let nightMinutes = 0;
    let plainDayMinutes = 0;

    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    for (let currentMinute = startTotalMinutes; currentMinute < endTotalMinutes; currentMinute++) {
      const slice = this.classifyMinute(startDate, currentMinute);

      if (slice.isBankHoliday) {
        bankHolidayMinutes++;
      } else if (slice.isSunday) {
        sundayMinutes++;
      } else if (slice.isSaturday) {
        saturdayMinutes++;
      } else if (slice.isNight) {
        nightMinutes++;
      } else {
        plainDayMinutes++;
      }
    }

    // Apply break ratio evenly across slices to maintain proportionality
    return {
      totalWorkedHours: roundHours(paidMinutes / MINUTES_PER_HOUR),
      plainDayHours: roundHours((plainDayMinutes * breakRatio) / MINUTES_PER_HOUR),
      nightHours: roundHours((nightMinutes * breakRatio) / MINUTES_PER_HOUR),
      saturdayHours: roundHours((saturdayMinutes * breakRatio) / MINUTES_PER_HOUR),
      sundayHours: roundHours((sundayMinutes * breakRatio) / MINUTES_PER_HOUR),
      bankHolidayHours: roundHours((bankHolidayMinutes * breakRatio) / MINUTES_PER_HOUR),
    };
  }

  private static classifyMinute(startDate: Date, minuteOffsetFromStartOfDay: number): MinuteSlice {
    const dayOffset = Math.floor(minuteOffsetFromStartOfDay / MINUTES_PER_DAY);
    const minuteInDay = minuteOffsetFromStartOfDay % MINUTES_PER_DAY;

    const currentDate = new Date(startDate.getTime());
    currentDate.setUTCDate(currentDate.getUTCDate() + dayOffset);

    const dateIsoString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    if (isBankHoliday(dateIsoString)) {
      return {
        isBankHoliday: true,
        isSunday: false,
        isSaturday: false,
        isNight: false,
        isPlainDay: false,
      };
    }

    if (dayOfWeek === 0) {
      return {
        isBankHoliday: false,
        isSunday: true,
        isSaturday: false,
        isNight: false,
        isPlainDay: false,
      };
    }

    if (dayOfWeek === 6) {
      return {
        isBankHoliday: false,
        isSunday: false,
        isSaturday: true,
        isNight: false,
        isPlainDay: false,
      };
    }

    // Weekdays (Monday to Friday):
    // Night is 20:00 to 06:00
    const isNightTime = minuteInDay < NIGHT_END_MINUTE || minuteInDay >= NIGHT_START_MINUTE;

    return {
      isBankHoliday: false,
      isSunday: false,
      isSaturday: false,
      isNight: isNightTime,
      isPlainDay: !isNightTime,
    };
  }
}
