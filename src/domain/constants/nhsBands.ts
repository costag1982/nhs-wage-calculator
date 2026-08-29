import { NhsBandLevel } from '../models/Contract';

export interface NhsBandConfig {
  band: NhsBandLevel;
  defaultFteSalary: number;
  nightEnhancementRate: number; // e.g. 0.41 (+41%)
  saturdayEnhancementRate: number; // e.g. 0.41 (+41%)
  sundayAndHolidayEnhancementRate: number; // e.g. 0.83 (+83%)
}

export const NHS_BAND_CONFIGS: Record<NhsBandLevel, NhsBandConfig> = {
  'Band 2': {
    band: 'Band 2',
    defaultFteSalary: 25272.0,
    nightEnhancementRate: 0.41,
    saturdayEnhancementRate: 0.41,
    sundayAndHolidayEnhancementRate: 0.83,
  },
  'Band 3': {
    band: 'Band 3',
    defaultFteSalary: 26500.0,
    nightEnhancementRate: 0.41,
    saturdayEnhancementRate: 0.41,
    sundayAndHolidayEnhancementRate: 0.83,
  },
  'Band 4': {
    band: 'Band 4',
    defaultFteSalary: 28407.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 5': {
    band: 'Band 5',
    defaultFteSalary: 31034.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 6': {
    band: 'Band 6',
    defaultFteSalary: 38400.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 7': {
    band: 'Band 7',
    defaultFteSalary: 47126.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 8a': {
    band: 'Band 8a',
    defaultFteSalary: 55000.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 8b': {
    band: 'Band 8b',
    defaultFteSalary: 65000.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 8c': {
    band: 'Band 8c',
    defaultFteSalary: 77000.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 8d': {
    band: 'Band 8d',
    defaultFteSalary: 92000.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  'Band 9': {
    band: 'Band 9',
    defaultFteSalary: 110000.0,
    nightEnhancementRate: 0.3,
    saturdayEnhancementRate: 0.3,
    sundayAndHolidayEnhancementRate: 0.6,
  },
  Custom: {
    band: 'Custom',
    defaultFteSalary: 25272.0,
    nightEnhancementRate: 0.41,
    saturdayEnhancementRate: 0.41,
    sundayAndHolidayEnhancementRate: 0.83,
  },
};

/**
 * NHS Electronic Staff Record standard weekly divisor constant:
 * 52.143 weeks per year (365 / 7)
 * 37.5 standard full-time hours = 1,955.3625 annual hours
 */
export const NHS_ANNUAL_WEEKS = 52.142857; // 365 / 7
export const NHS_STANDARD_FTE_HOURS = 37.5;
