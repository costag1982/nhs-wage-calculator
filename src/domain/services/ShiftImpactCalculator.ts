import { Shift, ShiftWorkType, ShiftHoursBreakdown } from '../models/Shift';
import { EmployeeProfile } from '../models/Contract';
import { NhsBandConfig, NHS_STANDARD_FTE_HOURS } from '../constants/nhsBands';
import { ShiftIntervalCalculator } from './ShiftIntervalCalculator';
import { GrossPayCalculator } from './GrossPayCalculator';
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

export const calculateShiftGrossImpact = (
  candidate: CandidateShiftImpact,
  existingShifts: Shift[] = [],
  profile?: EmployeeProfile,
  fallbackContractedWeekly: number = 26.0
): ShiftGrossImpact => {
  return ShiftImpactCalculator.calculate(
    candidate,
    existingShifts,
    profile,
    fallbackContractedWeekly
  );
};

const DEFAULT_CONTRACTED_WEEKLY_HOURS = 26.0;

export class ShiftImpactCalculator {
  /**
   * Calculates the incremental gross wage impact of a candidate shift against existing shifts
   * in the same ISO week, respecting Agenda for Change unsocial enhancements, additional hours,
   * and overtime thresholds.
   */
  public static calculate(
    candidate: CandidateShiftImpact,
    existingShifts: Shift[] = [],
    profile?: EmployeeProfile,
    fallbackContractedWeekly: number = DEFAULT_CONTRACTED_WEEKLY_HOURS
  ): ShiftGrossImpact {
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
        ? `£${GrossPayCalculator.calculateBaseRates(profile).monthlyBasicPay.toFixed(2)}`
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

    // Case 3: Substantive Shift
    const priorWeeklyHours = this.calculatePriorWeeklyHours(existingShifts, date, initialShiftId);

    const newWeeklyHours = roundHours(priorWeeklyHours + totalWorked);
    const startHour = priorWeeklyHours;
    const endHour = newWeeklyHours;

    // Hours in contracted to FTE range (plain time 1.0x)
    const additionalHours = roundHours(
      Math.max(0, Math.min(endHour, fteHours) - Math.max(startHour, contractedWeekly))
    );
    // Hours above FTE threshold (overtime 1.5x)
    const overtimeHours = roundHours(Math.max(0, endHour - Math.max(startHour, fteHours)));

    const rawAdditionalBasePay =
      additionalHours * effectiveRate + overtimeHours * (effectiveRate * 1.5);
    const rawExtraGrossPay = rawEnhancementsTotal + rawAdditionalBasePay;

    const extraGrossPay = roundCurrency(rawExtraGrossPay);
    const enhancementsTotal = roundCurrency(rawEnhancementsTotal);
    const additionalBasePay = roundCurrency(rawAdditionalBasePay);
    const fullShiftValue = roundCurrency(rawFullShiftValue);

    const summaryText = this.buildSubstantiveSummaryText({
      extraGrossPay,
      additionalBasePay,
      enhancementsTotal,
      totalWorked,
      contractedWeekly,
    });

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
  }

  private static calculatePriorWeeklyHours(
    existingShifts: Shift[],
    date: string,
    initialShiftId?: string
  ): number {
    const weekKey = getIsoWeekKey(date);
    let priorWeeklyHours = 0;

    for (const shift of existingShifts) {
      if (shift.id === initialShiftId) continue;
      if (shift.shiftType === 'BANK') continue;
      if (getIsoWeekKey(shift.date) === weekKey) {
        const breakdown = shift.breakdown || ShiftIntervalCalculator.calculateBreakdown(shift);
        priorWeeklyHours += breakdown.totalWorkedHours;
      }
    }

    return roundHours(priorWeeklyHours);
  }

  private static buildSubstantiveSummaryText(params: {
    extraGrossPay: number;
    additionalBasePay: number;
    enhancementsTotal: number;
    totalWorked: number;
    contractedWeekly: number;
  }): string {
    const { extraGrossPay, additionalBasePay, enhancementsTotal, totalWorked, contractedWeekly } =
      params;

    if (extraGrossPay === 0) {
      return `Covered by basic monthly salary (fulfils ${totalWorked}h of ${contractedWeekly}h weekly threshold)`;
    }
    if (additionalBasePay === 0 && enhancementsTotal > 0) {
      return `+£${enhancementsTotal.toFixed(2)} unsocial premium on top of basic salary`;
    }
    if (additionalBasePay > 0 && enhancementsTotal === 0) {
      return `+£${additionalBasePay.toFixed(
        2
      )} additional hours (exceeds ${contractedWeekly}h threshold)`;
    }
    return `+£${additionalBasePay.toFixed(2)} additional hours + £${enhancementsTotal.toFixed(
      2
    )} unsocial premium`;
  }
}
