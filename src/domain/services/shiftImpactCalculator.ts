import { Shift, ShiftWorkType, ShiftHoursBreakdown } from '../models/Shift';
import { EmployeeProfile } from '../models/Contract';
import { NhsBandConfig, NHS_STANDARD_FTE_HOURS } from '../constants/nhsBands';
import { calculateShiftBreakdown } from './shiftIntervalCalculator';
import { calculateBaseRates } from './grossPayCalculator';
import { getIsoWeekKey } from '../utils/dateUtils';
import { roundCurrency, roundHours } from '../utils/mathUtils';

export interface ShiftGrossImpact {
  extraGrossPay: number;
  fullShiftValue: number;
  enhancementsTotal: number;
  additionalBasePay: number;
  additionalHours: number;
  overtimeHours: number;
  priorWeeklyHours: number;
  newWeeklyHours: number;
  contractedWeeklyHours: number;
  summaryText: string;
}

export interface CandidateShiftImpact {
  date: string;
  shiftType: ShiftWorkType;
  breakdown: ShiftHoursBreakdown;
  effectiveRate: number;
  bandConfig: NhsBandConfig;
  initialShiftId?: string;
}

const DEFAULT_CONTRACTED_WEEKLY_HOURS = 26.0;

const calculatePriorWeeklyHours = (
  existingShifts: Shift[],
  date: string,
  initialShiftId?: string
): number => {
  const weekKey = getIsoWeekKey(date);
  let priorWeeklyHours = 0;

  for (const shift of existingShifts) {
    if (shift.id === initialShiftId) continue;
    if (shift.shiftType === 'BANK') continue;
    if (getIsoWeekKey(shift.date) === weekKey) {
      const breakdown = shift.breakdown || calculateShiftBreakdown(shift);
      priorWeeklyHours += breakdown.totalWorkedHours;
    }
  }

  return roundHours(priorWeeklyHours);
};

/**
 * Calculates the incremental gross wage impact of a candidate shift against existing shifts
 * in the same ISO week, respecting Agenda for Change unsocial enhancements, additional hours,
 * and overtime thresholds.
 */
export const calculateShiftGrossImpact = (
  candidate: CandidateShiftImpact,
  existingShifts: Shift[] = [],
  profile?: EmployeeProfile,
  fallbackContractedWeekly: number = DEFAULT_CONTRACTED_WEEKLY_HOURS
): ShiftGrossImpact => {
  const { shiftType, breakdown, effectiveRate, bandConfig, initialShiftId, date } = candidate;
  const contractedWeekly = profile?.contractedWeeklyHours ?? fallbackContractedWeekly;
  const fteHours = profile?.standardFullTimeHours ?? NHS_STANDARD_FTE_HOURS;

  const totalWorked = breakdown.totalWorkedHours;
  const nightTopUp = breakdown.nightHours * (effectiveRate * bandConfig.nightEnhancementRate);
  const satTopUp = breakdown.saturdayHours * (effectiveRate * bandConfig.saturdayEnhancementRate);
  const sunTopUp =
    breakdown.sundayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);
  const bhTopUp =
    breakdown.bankHolidayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);
  const rawEnhancementsTotal = nightTopUp + satTopUp + sunTopUp + bhTopUp;
  const rawFullShiftValue = totalWorked * effectiveRate + rawEnhancementsTotal;

  // Case 1: Annual Leave
  if (shiftType === 'ANNUAL_LEAVE') {
    const basicPayFormatted = profile
      ? `£${calculateBaseRates(profile).monthlyBasicPay.toFixed(2)}`
      : 'basic salary';
    return {
      extraGrossPay: 0,
      fullShiftValue: 0,
      enhancementsTotal: 0,
      additionalBasePay: 0,
      additionalHours: 0,
      overtimeHours: 0,
      priorWeeklyHours: 0,
      newWeeklyHours: 0,
      contractedWeeklyHours: contractedWeekly,
      summaryText: `Paid as standard monthly basic salary (${basicPayFormatted})`,
    };
  }

  // Case 2: Bank Shift (paid entirely on top of substantive salary)
  if (shiftType === 'BANK') {
    const rawBasicBankPay = totalWorked * effectiveRate;
    return {
      extraGrossPay: roundCurrency(rawFullShiftValue),
      fullShiftValue: roundCurrency(rawFullShiftValue),
      enhancementsTotal: roundCurrency(rawEnhancementsTotal),
      additionalBasePay: roundCurrency(rawBasicBankPay),
      additionalHours: totalWorked,
      overtimeHours: 0,
      priorWeeklyHours: 0,
      newWeeklyHours: 0,
      contractedWeeklyHours: contractedWeekly,
      summaryText: `Bank Hourly Pay (+£${roundCurrency(rawBasicBankPay).toFixed(2)}${
        rawEnhancementsTotal > 0
          ? ` + £${roundCurrency(rawEnhancementsTotal).toFixed(2)} enhancements`
          : ''
      })`,
    };
  }

  // Case 3: Standard Substantive Roster Shift (Covered by Basic Salary)
  if (shiftType === 'SUBSTANTIVE') {
    const enhancementsTotal = roundCurrency(rawEnhancementsTotal);
    const summaryText =
      enhancementsTotal > 0
        ? `+£${enhancementsTotal.toFixed(2)} unsocial enhancements on top of basic salary`
        : 'Covered by basic monthly salary';

    return {
      extraGrossPay: enhancementsTotal,
      fullShiftValue: roundCurrency(rawFullShiftValue),
      enhancementsTotal,
      additionalBasePay: 0,
      additionalHours: 0,
      overtimeHours: 0,
      priorWeeklyHours: 0,
      newWeeklyHours: 0,
      contractedWeeklyHours: contractedWeekly,
      summaryText,
    };
  }

  // Case 4: Extra / Overtime Shift (Worked on top of contracted roster)
  const priorWeeklyHours = calculatePriorWeeklyHours(existingShifts, date, initialShiftId);
  const newWeeklyHours = roundHours(priorWeeklyHours + totalWorked);
  const startHour = priorWeeklyHours;
  const endHour = newWeeklyHours;

  const isOvertimeEligible =
    !profile?.band ||
    ['Band 2', 'Band 3', 'Band 4', 'Band 5', 'Band 6', 'Band 7'].includes(profile.band);

  let additionalHours = 0;
  let overtimeHours = 0;

  if (isOvertimeEligible) {
    additionalHours = roundHours(
      Math.max(0, Math.min(endHour, fteHours) - Math.min(startHour, fteHours))
    );
    overtimeHours = roundHours(Math.max(0, endHour - Math.max(startHour, fteHours)));
  } else {
    additionalHours = totalWorked;
  }

  const rawAdditionalBasePay =
    additionalHours * effectiveRate + overtimeHours * (effectiveRate * 1.5);
  const rawExtraGrossPay = rawEnhancementsTotal + rawAdditionalBasePay;

  const extraGrossPay = roundCurrency(rawExtraGrossPay);
  const enhancementsTotal = roundCurrency(rawEnhancementsTotal);
  const additionalBasePay = roundCurrency(rawAdditionalBasePay);
  const fullShiftValue = roundCurrency(rawFullShiftValue);

  const summaryParts: string[] = [];
  if (additionalBasePay > 0) {
    summaryParts.push(`+£${additionalBasePay.toFixed(2)} extra pay`);
  }
  if (enhancementsTotal > 0) {
    summaryParts.push(`£${enhancementsTotal.toFixed(2)} unsocial enhancements`);
  }
  const summaryText = summaryParts.length > 0 ? summaryParts.join(' + ') : 'Extra shift';

  return {
    extraGrossPay,
    fullShiftValue,
    enhancementsTotal,
    additionalBasePay,
    additionalHours,
    overtimeHours,
    priorWeeklyHours,
    newWeeklyHours,
    contractedWeeklyHours: contractedWeekly,
    summaryText,
  };
};
