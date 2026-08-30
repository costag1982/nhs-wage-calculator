import { NhsServiceYearsTier } from '../models/Contract';

export interface NhsLeaveTierConfig {
  tier: NhsServiceYearsTier;
  label: string;
  shortLabel: string;
  annualLeaveDays: number;
  bankHolidayDays: number;
  totalDays: number;
  description: string;
}

export const NHS_STANDARD_DAY_HOURS = 7.5;
export const NHS_STANDARD_BANK_HOLIDAYS_COUNT = 8;

export const NHS_LEAVE_TIERS: Record<NhsServiceYearsTier, NhsLeaveTierConfig> = {
  UNDER_5: {
    tier: 'UNDER_5',
    label: 'Under 5 Years Service',
    shortLabel: '< 5 Years',
    annualLeaveDays: 27,
    bankHolidayDays: NHS_STANDARD_BANK_HOLIDAYS_COUNT,
    totalDays: 35,
    description: '27 days Annual Leave + 8 General Public Holidays',
  },
  FIVE_TO_TEN: {
    tier: 'FIVE_TO_TEN',
    label: '5 to 10 Years Service',
    shortLabel: '5 – 10 Years',
    annualLeaveDays: 29,
    bankHolidayDays: NHS_STANDARD_BANK_HOLIDAYS_COUNT,
    totalDays: 37,
    description: '29 days Annual Leave + 8 General Public Holidays',
  },
  TEN_PLUS: {
    tier: 'TEN_PLUS',
    label: '10+ Years Service',
    shortLabel: '10+ Years',
    annualLeaveDays: 33,
    bankHolidayDays: NHS_STANDARD_BANK_HOLIDAYS_COUNT,
    totalDays: 41,
    description: '33 days Annual Leave + 8 General Public Holidays',
  },
};

export interface NhsLeaveYearRange {
  startYear: number;
  endYear: number;
  startDateIso: string;
  endDateIso: string;
  label: string;
}

/**
 * Returns the NHS Leave Year range (1 April to 31 March) for a given date.
 * e.g., for 2026-06-15, leave year is 2026-04-01 to 2027-03-31 (Leave Year 2026/27).
 * For 2027-02-10, leave year is 2026-04-01 to 2027-03-31 (Leave Year 2026/27).
 */
export const getNhsLeaveYearRange = (date: Date): NhsLeaveYearRange => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    startYear,
    endYear,
    startDateIso: `${startYear}-04-01`,
    endDateIso: `${endYear}-03-31`,
    label: `${startYear}/${String(endYear).slice(2)}`,
  };
};
