import { NhsBandLevel } from './Contract';

export type ShiftPresetType =
  | 'TWILIGHT'
  | 'HALF_TWILIGHT'
  | 'MORNING'
  | 'LONG_DAY'
  | 'EVENING'
  | 'NIGHT_SHIFT'
  | 'EARLY'
  | 'LATE'
  | 'ANNUAL_LEAVE_FULL'
  | 'ANNUAL_LEAVE_HALF'
  | 'CUSTOM';

export interface ShiftPreset {
  id: ShiftPresetType;
  label: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  unpaidBreakMinutes: number;
  description: string;
}

export interface ShiftHoursBreakdown {
  totalWorkedHours: number;
  plainDayHours: number; // Mon-Fri 06:00-20:00
  nightHours: number; // Mon-Fri 20:00-06:00 (Night Duty)
  saturdayHours: number; // Saturday 00:00-24:00
  sundayHours: number; // Sunday 00:00-24:00
  bankHolidayHours: number; // UK Bank Holiday 00:00-24:00
}

export type ShiftWorkType = 'SUBSTANTIVE' | 'OVERTIME' | 'BANK' | 'ANNUAL_LEAVE';

export interface Shift {
  id: string;
  date: string; // ISO "YYYY-MM-DD"
  startTime: string; // "HH:mm" (e.g. "07:00" or "19:00")
  endTime: string; // "HH:mm" (e.g. "19:30" or "07:30")
  unpaidBreakMinutes: number;
  presetType?: ShiftPresetType;
  shiftType?: ShiftWorkType; // 'SUBSTANTIVE' (default), 'OVERTIME', 'BANK', or 'ANNUAL_LEAVE'
  overrideBand?: NhsBandLevel;
  customHourlyRate?: number;
  breakdown?: ShiftHoursBreakdown;
}
