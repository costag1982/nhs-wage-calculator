import { EmployeeProfile, NhsServiceYearsTier } from '../models/Contract';
import { Shift } from '../models/Shift';
import {
  NHS_LEAVE_TIERS,
  NHS_STANDARD_DAY_HOURS,
  getNhsLeaveYearRange,
} from '../constants/annualLeave';
import { NHS_STANDARD_FTE_HOURS } from '../constants/nhsBands';
import { calculateShiftBreakdown } from './shiftIntervalCalculator';
import { roundHours } from '../utils/mathUtils';

export interface AnnualLeaveEntitlement {
  tier: NhsServiceYearsTier;
  tierLabel: string;
  annualLeaveDays: number;
  bankHolidayDays: number;
  totalDays: number;
  baseHours: number;
  annualLeaveHours: number;
  bankHolidayHours: number;
  carryOverHours: number;
  totalEntitlementHours: number;
}

export interface AnnualLeaveEpisode {
  id: string;
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string; // ISO "YYYY-MM-DD"
  formattedDateRange: string; // e.g. "02 Apr 2026 - 08 Apr 2026"
  daysCount: number; // Inclusive calendar day count (e.g. 7 days)
  totalHours: number;
  status: 'APPROVED' | 'REQUESTED' | 'REJECTED' | 'TAKEN';
  shiftIds: string[];
}

export interface AnnualLeaveBalanceSummary {
  entitlement: AnnualLeaveEntitlement;
  leaveYearLabel: string;
  leaveYearStart: string;
  leaveYearEnd: string;
  countdownText: string;
  requestedHours: number;
  approvedHours: number;
  takenHours: number;
  remainingHours: number;
  takenYearToDateHours: number;
  takenThisMonthHours: number;
  episodes: AnnualLeaveEpisode[];
  approvedEpisodesCount: number;
  rejectedEpisodesCount: number;
}

/**
 * Formats a date range into standard UK readable string (e.g. "02 Apr 2026 - 08 Apr 2026").
 */
export const formatEpisodeDateRange = (startDateStr: string, endDateStr: string): string => {
  const parse = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  const start = parse(startDateStr);
  const end = parse(endDateStr);

  const formatPart = (d: Date) => {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };

  if (startDateStr === endDateStr) {
    return formatPart(start);
  }
  return `${formatPart(start)} - ${formatPart(end)}`;
};

/**
 * Calculates human-readable countdown to the end of the leave year (e.g. "Entitlement ends in 6 months and 28 days").
 */
export const calculateLeaveYearCountdown = (fromDate: Date, endDate: Date): string => {
  if (fromDate > endDate) {
    return 'Entitlement period has ended';
  }

  const fromYear = fromDate.getFullYear();
  const fromMonth = fromDate.getMonth();
  const fromDay = fromDate.getDate();

  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endDay = endDate.getDate();

  let months = (endYear - fromYear) * 12 + (endMonth - fromMonth);
  let days = endDay - fromDay;

  if (days < 0) {
    months -= 1;
    // Get days in the previous month before endMonth
    const prevMonthDays = new Date(endYear, endMonth, 0).getDate();
    days += prevMonthDays;
  }

  const parts: string[] = [];
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  }
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }

  return `Entitlement ends in ${parts.join(' and ')}`;
};

/**
 * Calculates NHS Agenda for Change Section 13 pro-rata annual leave entitlement in hours.
 */
export const calculateAnnualLeaveEntitlement = (
  profile: EmployeeProfile
): AnnualLeaveEntitlement => {
  const fteHours = profile.standardFullTimeHours || NHS_STANDARD_FTE_HOURS;
  const contractedHours = profile.contractedWeeklyHours || fteHours;
  const tierKey = profile.yearsOfServiceTier || 'UNDER_5';
  const tierConfig = NHS_LEAVE_TIERS[tierKey] || NHS_LEAVE_TIERS.UNDER_5;
  const carryOver = profile.annualLeaveCarryOverHours || 0;

  let baseHours: number;
  let annualLeaveHours: number;
  let bankHolidayHours: number;

  if (
    profile.annualLeaveBaseHoursOverride !== undefined &&
    profile.annualLeaveBaseHoursOverride > 0
  ) {
    baseHours = profile.annualLeaveBaseHoursOverride;
    // Proportional split between AL and BH according to tier days
    const totalDays = tierConfig.totalDays;
    annualLeaveHours = roundHours(baseHours * (tierConfig.annualLeaveDays / totalDays));
    bankHolidayHours = roundHours(baseHours - annualLeaveHours);
  } else {
    // Pro-rata hours formula per NHS AfC Section 13.4:
    // (Contracted Weekly Hours / 37.5) * (Days * 7.5)
    const proRataRatio = contractedHours / fteHours;
    annualLeaveHours = roundHours(
      proRataRatio * (tierConfig.annualLeaveDays * NHS_STANDARD_DAY_HOURS)
    );
    bankHolidayHours = roundHours(
      proRataRatio * (tierConfig.bankHolidayDays * NHS_STANDARD_DAY_HOURS)
    );
    baseHours = roundHours(annualLeaveHours + bankHolidayHours);
  }

  const totalEntitlementHours = roundHours(baseHours + carryOver);

  return {
    tier: tierKey,
    tierLabel: tierConfig.label,
    annualLeaveDays: tierConfig.annualLeaveDays,
    bankHolidayDays: tierConfig.bankHolidayDays,
    totalDays: tierConfig.totalDays,
    baseHours,
    annualLeaveHours,
    bankHolidayHours,
    carryOverHours: carryOver,
    totalEntitlementHours,
  };
};

/**
 * Groups consecutive annual leave shifts into human-friendly leave episodes.
 */
export const groupShiftsIntoEpisodes = (
  leaveShifts: Shift[],
  referenceIsoDate: string
): AnnualLeaveEpisode[] => {
  if (leaveShifts.length === 0) return [];

  // Sort ascending by date
  const sorted = [...leaveShifts].sort((a, b) => a.date.localeCompare(b.date));
  const episodes: AnnualLeaveEpisode[] = [];

  let currentBatch: Shift[] = [sorted[0]];

  const getEffectiveStatus = (shift: Shift): 'APPROVED' | 'REQUESTED' | 'REJECTED' | 'TAKEN' => {
    if (shift.status === 'REJECTED') return 'REJECTED';
    if (shift.status === 'REQUESTED') return 'REQUESTED';
    return shift.date <= referenceIsoDate ? 'TAKEN' : 'APPROVED';
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevDate = new Date(`${prev.date}T00:00:00`);
    const currDate = new Date(`${curr.date}T00:00:00`);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    const prevStatus = getEffectiveStatus(prev);
    const currStatus = getEffectiveStatus(curr);

    // Group if within 1 day (consecutive) and same status
    if (diffDays <= 1 && prevStatus === currStatus) {
      currentBatch.push(curr);
    } else {
      episodes.push(createEpisodeFromBatch(currentBatch, prevStatus));
      currentBatch = [curr];
    }
  }

  if (currentBatch.length > 0) {
    episodes.push(createEpisodeFromBatch(currentBatch, getEffectiveStatus(currentBatch[0])));
  }

  return episodes;
};

const createEpisodeFromBatch = (
  batch: Shift[],
  status: 'APPROVED' | 'REQUESTED' | 'REJECTED' | 'TAKEN'
): AnnualLeaveEpisode => {
  const startDate = batch[0].date;
  const endDate = batch[batch.length - 1].date;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const totalHours = roundHours(
    batch.reduce((sum, s) => {
      const breakdown = s.breakdown || calculateShiftBreakdown(s);
      return sum + breakdown.totalWorkedHours;
    }, 0)
  );

  return {
    id: `ep-${startDate}-${endDate}-${status}`,
    startDate,
    endDate,
    formattedDateRange: formatEpisodeDateRange(startDate, endDate),
    daysCount,
    totalHours,
    status,
    shiftIds: batch.map((s) => s.id),
  };
};

/**
 * Calculates the full leave balance (taken vs approved vs requested vs remaining)
 * for the NHS leave year containing referenceDate.
 */
export const calculateAnnualLeaveBalance = (
  profile: EmployeeProfile,
  allShifts: Shift[],
  referenceDate: Date
): AnnualLeaveBalanceSummary => {
  const entitlement = calculateAnnualLeaveEntitlement(profile);
  const leaveYear = getNhsLeaveYearRange(referenceDate);

  const refYear = referenceDate.getFullYear();
  const refMonth = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const refDay = String(referenceDate.getDate()).padStart(2, '0');
  const referenceIsoDate = `${refYear}-${refMonth}-${refDay}`;
  const monthPrefix = `${refYear}-${refMonth}`;

  const leaveYearEndDate = new Date(`${leaveYear.endDateIso}T23:59:59`);
  const countdownText = calculateLeaveYearCountdown(referenceDate, leaveYearEndDate);

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let totalApprovedInYear = 0;
  let pastTakenInYear = 0;
  let futureApprovedInYear = 0;
  let takenThisMonth = 0;
  let requestedHours = 0;

  const leaveShiftsInYear: Shift[] = [];

  for (const shift of allShifts) {
    if (shift.shiftType !== 'ANNUAL_LEAVE') continue;

    if (shift.date >= leaveYear.startDateIso && shift.date <= leaveYear.endDateIso) {
      leaveShiftsInYear.push(shift);

      const breakdown = shift.breakdown || calculateShiftBreakdown(shift);
      const leaveDuration = breakdown.totalWorkedHours;

      if (shift.status === 'REJECTED') {
        // Rejected leave does not deduct from balance
        continue;
      }

      if (shift.status === 'REQUESTED') {
        requestedHours += leaveDuration;
      } else {
        totalApprovedInYear += leaveDuration;
        if (shift.date <= todayIso) {
          pastTakenInYear += leaveDuration;
        } else {
          futureApprovedInYear += leaveDuration;
        }
      }

      if (shift.date.startsWith(monthPrefix) && shift.status !== 'REQUESTED') {
        takenThisMonth += leaveDuration;
      }
    }
  }

  const takenYearToDateHours = roundHours(totalApprovedInYear);
  const takenThisMonthHours = roundHours(takenThisMonth);
  const roundedRequestedHours = roundHours(requestedHours);
  const roundedApprovedHours = roundHours(futureApprovedInYear);
  const roundedTakenHours = roundHours(pastTakenInYear);

  // Remaining balance = totalEntitlement - takenYearToDate - requested
  const remainingHours = roundHours(
    Math.max(0, entitlement.totalEntitlementHours - takenYearToDateHours - roundedRequestedHours)
  );

  const episodes = groupShiftsIntoEpisodes(leaveShiftsInYear, referenceIsoDate);

  const approvedEpisodesCount = episodes.filter(
    (e) => e.status === 'APPROVED' || e.status === 'TAKEN'
  ).length;
  const rejectedEpisodesCount = episodes.filter((e) => e.status === 'REJECTED').length;

  return {
    entitlement,
    leaveYearLabel: leaveYear.label,
    leaveYearStart: leaveYear.startDateIso,
    leaveYearEnd: leaveYear.endDateIso,
    countdownText,
    requestedHours: roundedRequestedHours,
    approvedHours: roundedApprovedHours,
    takenHours: roundedTakenHours,
    remainingHours,
    takenYearToDateHours,
    takenThisMonthHours,
    episodes,
    approvedEpisodesCount,
    rejectedEpisodesCount,
  };
};
