import { EmployeeProfile, NhsBandLevel } from '../models/Contract';
import { Shift, ShiftHoursBreakdown } from '../models/Shift';
import { RecurringCommitment, DeductionBreakdownItem } from '../models/Deductions';
import { PayslipSummary, PayLineItem } from '../models/Payslip';
import { GrossPayCalculator, GrossPayResult } from './GrossPayCalculator';
import { EnhancementRateCalculator } from './EnhancementRateCalculator';
import { PensionCalculator } from './PensionCalculator';
import { TaxCalculator } from './TaxCalculator';
import { NationalInsuranceCalculator } from './NationalInsuranceCalculator';
import { ShiftIntervalCalculator } from './ShiftIntervalCalculator';
import { roundCurrency, roundHours, roundHourlyRate } from '../utils/mathUtils';
import {
  getIsoWeekKey,
  formatMonthYearString,
  formatPeriodEndDate,
  formatPayDate,
  getUkTaxPeriod,
  getPaymentMonthDate,
} from '../utils/dateUtils';

interface AggregatedEnhancements {
  nightHours: number;
  nightPaidUnits: number;
  nightAmount: number;
  satHours: number;
  satPaidUnits: number;
  satAmount: number;
  sunHours: number;
  sunPaidUnits: number;
  sunAmount: number;
  bhHours: number;
  bhPaidUnits: number;
  bhAmount: number;
  actingUpHours: number;
  actingUpAmount: number;
  totalBankBasicPay: number;
}

interface OvertimeCalculationResult {
  additionalHours: number;
  additionalHoursPay: number;
  overtimeHours: number;
  overtimePay: number;
}

export class WageCalculatorService {
  /**
   * Calculates the full expected NHS wage slip summary for a given roster month.
   * Per NHS Agenda for Change payroll cycles, hours worked in month M (e.g. June)
   * are paid in month M+1 (e.g. July).
   */
  public static calculateMonthlyPayslip(
    profile: EmployeeProfile,
    shifts: Shift[],
    commitments: RecurringCommitment[],
    monthYear: Date
  ): PayslipSummary {
    const baseRates = GrossPayCalculator.calculateBaseRates(profile);
    const hoursBreakdown = this.aggregateShiftHours(shifts);
    const enhancements = this.aggregateShiftEnhancements(shifts, profile, baseRates.hourlyRate);

    const overtimeResult =
      profile.contractType === 'SUBSTANTIVE'
        ? this.calculateAdditionalAndOvertimePay(shifts, profile, baseRates.hourlyRate)
        : { additionalHours: 0, additionalHoursPay: 0, overtimeHours: 0, overtimePay: 0 };

    const payLineItems = this.buildPayLineItems(
      profile,
      baseRates,
      hoursBreakdown,
      enhancements,
      overtimeResult
    );

    const totalEnhancements = roundCurrency(
      enhancements.nightAmount +
        enhancements.satAmount +
        enhancements.sunAmount +
        enhancements.bhAmount +
        enhancements.actingUpAmount
    );

    const grossPay = roundCurrency(payLineItems.reduce((acc, item) => acc + item.amount, 0));

    // Deductions calculation
    const deductions = this.calculateDeductions(grossPay, profile, commitments);

    // Worked roster month vs. Payment month (month + 1)
    const paymentMonthDate = getPaymentMonthDate(monthYear);
    const rosterMonthString = formatMonthYearString(monthYear);
    const monthYearString = formatMonthYearString(paymentMonthDate);
    const periodEndDate = formatPeriodEndDate(paymentMonthDate);
    const payDate = formatPayDate(paymentMonthDate);
    const taxPeriod = getUkTaxPeriod(paymentMonthDate);

    return {
      monthYearString,
      rosterMonthString,
      periodEndDate,
      payDate,
      taxPeriod,
      hourlyRate: baseRates.hourlyRate,
      annualProRataSalary: baseRates.annualProRataSalary,
      monthlyBasicHours: baseRates.monthlyBasicHours,
      monthlyBasicPay: baseRates.monthlyBasicPay,
      hoursBreakdown,
      payLineItems,
      enhancementsTotal: totalEnhancements,
      grossPay,
      pensionablePay: grossPay,
      taxablePay: deductions.taxablePay,
      ...(profile.contractType === 'SUBSTANTIVE' &&
        overtimeResult.additionalHours > 0 && {
          additionalHours: overtimeResult.additionalHours,
          additionalHoursPay: overtimeResult.additionalHoursPay,
        }),
      ...(profile.contractType === 'SUBSTANTIVE' &&
        overtimeResult.overtimeHours > 0 && {
          overtimeHours: overtimeResult.overtimeHours,
          overtimePay: overtimeResult.overtimePay,
        }),
      deductionsList: deductions.deductionsList,
      totalDeductions: deductions.totalDeductions,
      netPay: roundCurrency(grossPay - deductions.totalDeductions),
    };
  }

  public static aggregateShiftHours(shifts: Shift[]): ShiftHoursBreakdown {
    const total: ShiftHoursBreakdown = {
      totalWorkedHours: 0,
      plainDayHours: 0,
      nightHours: 0,
      saturdayHours: 0,
      sundayHours: 0,
      bankHolidayHours: 0,
    };

    for (const shift of shifts) {
      const breakdown = shift.breakdown || ShiftIntervalCalculator.calculateBreakdown(shift);
      total.totalWorkedHours += breakdown.totalWorkedHours;
      total.plainDayHours += breakdown.plainDayHours;
      total.nightHours += breakdown.nightHours;
      total.saturdayHours += breakdown.saturdayHours;
      total.sundayHours += breakdown.sundayHours;
      total.bankHolidayHours += breakdown.bankHolidayHours;
    }

    return {
      totalWorkedHours: roundHours(total.totalWorkedHours),
      plainDayHours: roundHours(total.plainDayHours),
      nightHours: roundHours(total.nightHours),
      saturdayHours: roundHours(total.saturdayHours),
      sundayHours: roundHours(total.sundayHours),
      bankHolidayHours: roundHours(total.bankHolidayHours),
    };
  }

  private static aggregateShiftEnhancements(
    shifts: Shift[],
    profile: EmployeeProfile,
    baseHourlyRate: number
  ): AggregatedEnhancements {
    const agg: AggregatedEnhancements = {
      nightHours: 0,
      nightPaidUnits: 0,
      nightAmount: 0,
      satHours: 0,
      satPaidUnits: 0,
      satAmount: 0,
      sunHours: 0,
      sunPaidUnits: 0,
      sunAmount: 0,
      bhHours: 0,
      bhPaidUnits: 0,
      bhAmount: 0,
      actingUpHours: 0,
      actingUpAmount: 0,
      totalBankBasicPay: 0,
    };

    // Group shifts by (band, rate) to aggregate monthly worked hours per rate group
    const groups = new Map<
      string,
      {
        band: NhsBandLevel;
        rate: number;
        breakdown: ShiftHoursBreakdown;
      }
    >();

    for (const shift of shifts) {
      const breakdown = shift.breakdown || ShiftIntervalCalculator.calculateBreakdown(shift);
      const shiftBand = shift.overrideBand || profile.band;
      const shiftRate =
        shift.customHourlyRate ??
        (shift.overrideBand
          ? GrossPayCalculator.getHourlyRateForBand(shift.overrideBand)
          : baseHourlyRate);

      if (profile.contractType === 'BANK_HOURLY') {
        agg.totalBankBasicPay += breakdown.totalWorkedHours * shiftRate;
      } else if (shiftRate > baseHourlyRate) {
        const diff = shiftRate - baseHourlyRate;
        agg.actingUpHours += breakdown.totalWorkedHours;
        agg.actingUpAmount += breakdown.totalWorkedHours * diff;
      }

      const key = `${shiftBand}_${shiftRate}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          band: shiftBand,
          rate: shiftRate,
          breakdown: {
            totalWorkedHours: 0,
            plainDayHours: 0,
            nightHours: 0,
            saturdayHours: 0,
            sundayHours: 0,
            bankHolidayHours: 0,
          },
        };
        groups.set(key, group);
      }

      group.breakdown.totalWorkedHours += breakdown.totalWorkedHours;
      group.breakdown.plainDayHours += breakdown.plainDayHours;
      group.breakdown.nightHours += breakdown.nightHours;
      group.breakdown.saturdayHours += breakdown.saturdayHours;
      group.breakdown.sundayHours += breakdown.sundayHours;
      group.breakdown.bankHolidayHours += breakdown.bankHolidayHours;
    }

    for (const group of groups.values()) {
      const { payLineItems: groupEnhancements } = EnhancementRateCalculator.calculateEnhancements(
        group.band,
        group.rate,
        group.breakdown
      );

      for (const item of groupEnhancements) {
        if (item.description === 'Night Duty EN') {
          agg.nightHours += item.unitsWorked;
          agg.nightPaidUnits += item.paidUnits;
          agg.nightAmount += item.amount;
        } else if (item.description === 'Saturday EN') {
          agg.satHours += item.unitsWorked;
          agg.satPaidUnits += item.paidUnits;
          agg.satAmount += item.amount;
        } else if (item.description === 'Sunday EN') {
          agg.sunHours += item.unitsWorked;
          agg.sunPaidUnits += item.paidUnits;
          agg.sunAmount += item.amount;
        } else if (item.description === 'Public Holiday EN') {
          agg.bhHours += item.unitsWorked;
          agg.bhPaidUnits += item.paidUnits;
          agg.bhAmount += item.amount;
        }
      }
    }

    agg.nightHours = roundHours(agg.nightHours);
    agg.nightPaidUnits = roundHours(agg.nightPaidUnits);
    agg.nightAmount = roundCurrency(agg.nightAmount);
    agg.satHours = roundHours(agg.satHours);
    agg.satPaidUnits = roundHours(agg.satPaidUnits);
    agg.satAmount = roundCurrency(agg.satAmount);
    agg.sunHours = roundHours(agg.sunHours);
    agg.sunPaidUnits = roundHours(agg.sunPaidUnits);
    agg.sunAmount = roundCurrency(agg.sunAmount);
    agg.bhHours = roundHours(agg.bhHours);
    agg.bhPaidUnits = roundHours(agg.bhPaidUnits);
    agg.bhAmount = roundCurrency(agg.bhAmount);

    return agg;
  }

  private static buildPayLineItems(
    profile: EmployeeProfile,
    baseRates: GrossPayResult,
    hoursBreakdown: ShiftHoursBreakdown,
    enhancements: AggregatedEnhancements,
    overtimeResult: OvertimeCalculationResult
  ): PayLineItem[] {
    const payLineItems: PayLineItem[] = [];

    // Substantive basic pay
    if (profile.contractType === 'SUBSTANTIVE') {
      payLineItems.push({
        description: 'Basic Pay',
        unitsWorked: baseRates.monthlyBasicHours,
        paidUnits: baseRates.monthlyBasicHours,
        rate: baseRates.hourlyRate,
        amount: baseRates.monthlyBasicPay,
      });

      if (overtimeResult.additionalHoursPay > 0) {
        payLineItems.push({
          description: 'Additional Hours',
          unitsWorked: overtimeResult.additionalHours,
          paidUnits: overtimeResult.additionalHours,
          rate: baseRates.hourlyRate,
          amount: roundCurrency(overtimeResult.additionalHoursPay),
        });
      }

      if (overtimeResult.overtimePay > 0) {
        payLineItems.push({
          description: 'Overtime (1.5×)',
          unitsWorked: overtimeResult.overtimeHours,
          paidUnits: overtimeResult.overtimeHours,
          rate: roundHourlyRate(baseRates.hourlyRate * 1.5),
          amount: roundCurrency(overtimeResult.overtimePay),
        });
      }
    }

    // Bank hourly basic pay
    if (profile.contractType === 'BANK_HOURLY') {
      payLineItems.push({
        description: 'Basic Hourly Pay',
        unitsWorked: hoursBreakdown.totalWorkedHours,
        paidUnits: hoursBreakdown.totalWorkedHours,
        rate: baseRates.hourlyRate,
        amount: roundCurrency(enhancements.totalBankBasicPay),
      });
    } else if (enhancements.actingUpAmount > 0) {
      payLineItems.push({
        description: 'Higher Band / Acting Up Allowance',
        unitsWorked: roundHours(enhancements.actingUpHours),
        paidUnits: roundHours(enhancements.actingUpHours),
        rate: roundHourlyRate(enhancements.actingUpAmount / enhancements.actingUpHours),
        amount: roundCurrency(enhancements.actingUpAmount),
      });
    }

    // Enhancements
    if (enhancements.nightAmount > 0) {
      payLineItems.push({
        description: 'Night Duty EN',
        unitsWorked: roundHours(enhancements.nightHours),
        paidUnits: roundHours(enhancements.nightPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(enhancements.nightAmount),
      });
    }

    if (enhancements.satAmount > 0) {
      payLineItems.push({
        description: 'Saturday EN',
        unitsWorked: roundHours(enhancements.satHours),
        paidUnits: roundHours(enhancements.satPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(enhancements.satAmount),
      });
    }

    if (enhancements.sunAmount > 0) {
      payLineItems.push({
        description: 'Sunday EN',
        unitsWorked: roundHours(enhancements.sunHours),
        paidUnits: roundHours(enhancements.sunPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(enhancements.sunAmount),
      });
    }

    if (enhancements.bhAmount > 0) {
      payLineItems.push({
        description: 'Public Holiday EN',
        unitsWorked: roundHours(enhancements.bhHours),
        paidUnits: roundHours(enhancements.bhPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(enhancements.bhAmount),
      });
    }

    return payLineItems;
  }

  private static calculateDeductions(
    grossPay: number,
    profile: EmployeeProfile,
    commitments: RecurringCommitment[]
  ): { taxablePay: number; deductionsList: DeductionBreakdownItem[]; totalDeductions: number } {
    const pensionAmount = PensionCalculator.calculateContribution(
      grossPay,
      profile.pensionContributionRate
    );

    // Net pay arrangement for pension gives pre-tax deduction
    const taxablePay = Math.max(0, roundCurrency(grossPay - pensionAmount));
    const payeTax = TaxCalculator.calculateMonthlyPaye(taxablePay, profile.taxCode);
    const nationalInsurance = NationalInsuranceCalculator.calculateClass1CategoryA(grossPay);

    const deductionsList: DeductionBreakdownItem[] = [
      { name: 'PAYE', amount: payeTax },
      { name: `NI ${profile.niCategory || 'A'}`, amount: nationalInsurance },
      {
        name: `NHS Pension ${(profile.pensionContributionRate * 100).toFixed(1)}%`,
        amount: pensionAmount,
      },
    ];

    for (const commitment of commitments) {
      deductionsList.push({
        name: commitment.name,
        amount: roundCurrency(commitment.amount),
        isPreTax: commitment.isPreTax,
      });
    }

    const totalDeductions = roundCurrency(
      deductionsList.reduce((acc, item) => acc + item.amount, 0)
    );

    return { taxablePay, deductionsList, totalDeductions };
  }

  /**
   * Groups shifts by ISO week and calculates additional hours and overtime
   * pay owed on top of basic contracted pay, per NHS AfC Section 3.
   *
   * - Additional hours: hours above contracted weekly hrs up to FTE threshold → plain time (1.0×)
   * - Overtime: hours above FTE threshold (Bands 1–7 only) → time-and-a-half (1.5×)
   * - Bands 8a–9: all excess hours paid at plain time; no 1.5× premium
   */
  private static calculateAdditionalAndOvertimePay(
    shifts: Shift[],
    profile: EmployeeProfile,
    hourlyRate: number
  ): OvertimeCalculationResult {
    const weekMap = new Map<string, number>();
    for (const shift of shifts) {
      const breakdown = shift.breakdown || ShiftIntervalCalculator.calculateBreakdown(shift);
      const weekKey = getIsoWeekKey(shift.date);
      weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + breakdown.totalWorkedHours);
    }

    const contractedWeekly = profile.contractedWeeklyHours;
    const fteThreshold = profile.standardFullTimeHours;

    const overtimeEligibleBands = ['Band 2', 'Band 3', 'Band 4', 'Band 5', 'Band 6', 'Band 7'];
    const isOvertimeEligible = overtimeEligibleBands.includes(profile.band);

    let totalAdditionalHours = 0;
    let totalOvertimeHours = 0;

    for (const [, weeklyHours] of weekMap) {
      if (weeklyHours <= contractedWeekly) continue;

      if (isOvertimeEligible) {
        const additionalCap = Math.max(0, fteThreshold - contractedWeekly);
        const additionalThisWeek = Math.min(weeklyHours - contractedWeekly, additionalCap);
        const overtimeThisWeek = Math.max(0, weeklyHours - fteThreshold);
        totalAdditionalHours += additionalThisWeek;
        totalOvertimeHours += overtimeThisWeek;
      } else {
        totalAdditionalHours += weeklyHours - contractedWeekly;
      }
    }

    const additionalHours = roundHours(totalAdditionalHours);
    const overtimeHours = roundHours(totalOvertimeHours);

    return {
      additionalHours,
      additionalHoursPay: roundCurrency(additionalHours * hourlyRate),
      overtimeHours,
      overtimePay: roundCurrency(overtimeHours * hourlyRate * 1.5),
    };
  }
}
