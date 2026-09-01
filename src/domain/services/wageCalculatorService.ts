import { EmployeeProfile } from '../models/Contract';
import { Shift, ShiftHoursBreakdown } from '../models/Shift';
import { RecurringCommitment, DeductionBreakdownItem } from '../models/Deductions';
import { PayslipSummary, PayLineItem, PayslipYearToDate } from '../models/Payslip';
import { calculateBaseRates, getHourlyRateForBand, GrossPayResult } from './grossPayCalculator';
import { calculateEnhancements } from './enhancementRateCalculator';
import { calculatePensionContribution } from './pensionCalculator';
import { calculatePaye } from './taxCalculator';
import { calculateClass1CategoryA } from './nationalInsuranceCalculator';
import { calculateShiftBreakdown } from './shiftIntervalCalculator';
import { roundCurrency, roundHours, roundHourlyRate } from '../utils/mathUtils';
import {
  getIsoWeekKey,
  formatMonthYearString,
  formatPeriodEndDate,
  formatPayDate,
  getUkTaxPeriod,
  getPaymentMonthDate,
} from '../utils/dateUtils';

interface SubstantiveEnhancements {
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
}

interface BankCalculationResult {
  payLineItems: PayLineItem[];
  totalBasicPay: number;
  totalEnhancementAmount: number;
  totalHours: number;
}

interface OvertimeCalculationResult {
  additionalHours: number;
  additionalHoursPay: number;
  overtimeHours: number;
  overtimePay: number;
}

export interface PayrollCalculationContext {
  allShifts?: Shift[];
  previousYearToDate?: PayslipYearToDate;
}

const EMPTY_YEAR_TO_DATE: PayslipYearToDate = {
  grossPay: 0,
  taxablePay: 0,
  taxPaid: 0,
  niPay: 0,
  niContributions: 0,
  pensionablePay: 0,
  pensionContributions: 0,
};

export const aggregateShiftHours = (shifts: Shift[]): ShiftHoursBreakdown => {
  const total: ShiftHoursBreakdown = {
    totalWorkedHours: 0,
    plainDayHours: 0,
    nightHours: 0,
    saturdayHours: 0,
    sundayHours: 0,
    bankHolidayHours: 0,
  };

  for (const shift of shifts) {
    const breakdown = shift.breakdown || calculateShiftBreakdown(shift);
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
};

const getEmptyEnhancements = (): SubstantiveEnhancements => ({
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
});

const aggregateSubstantiveEnhancements = (
  substantiveShifts: Shift[],
  profile: EmployeeProfile,
  baseHourlyRate: number
): SubstantiveEnhancements => {
  const agg = getEmptyEnhancements();
  for (const shift of substantiveShifts) {
    const breakdown = shift.breakdown || calculateShiftBreakdown(shift);
    const band = shift.overrideBand || profile.band;
    const rate =
      shift.customHourlyRate ??
      (shift.overrideBand ? getHourlyRateForBand(shift.overrideBand) : baseHourlyRate);

    if (rate > baseHourlyRate) {
      agg.actingUpHours += breakdown.totalWorkedHours;
      agg.actingUpAmount += breakdown.totalWorkedHours * (rate - baseHourlyRate);
    }

    const { payLineItems: groupEnhancements } = calculateEnhancements(band, rate, breakdown);

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
  agg.actingUpHours = roundHours(agg.actingUpHours);
  agg.actingUpAmount = roundCurrency(agg.actingUpAmount);

  return agg;
};

const aggregateBankPay = (
  bankShifts: Shift[],
  profile: EmployeeProfile,
  baseHourlyRate: number
): BankCalculationResult => {
  if (bankShifts.length === 0) {
    return {
      payLineItems: [],
      totalBasicPay: 0,
      totalEnhancementAmount: 0,
      totalHours: 0,
    };
  }

  const payLineItems: PayLineItem[] = [];
  const appendPayLineItem = (item: PayLineItem): void => {
    const existing = payLineItems.find(
      (candidate) => candidate.description === item.description && candidate.rate === item.rate
    );
    if (!existing) {
      payLineItems.push(item);
      return;
    }
    existing.unitsWorked = roundHours(existing.unitsWorked + item.unitsWorked);
    existing.paidUnits = roundHours(existing.paidUnits + item.paidUnits);
    existing.amount = roundCurrency(existing.amount + item.amount);
  };
  let totalBasicPay = 0;
  let totalEnhancementAmount = 0;
  let totalHours = 0;

  for (const shift of bankShifts) {
    const breakdown = shift.breakdown || calculateShiftBreakdown(shift);
    const band = shift.overrideBand || profile.band;
    const basicRate =
      shift.customHourlyRate ??
      (shift.overrideBand ? getHourlyRateForBand(shift.overrideBand) : baseHourlyRate);
    const enhancementRate = shift.customEnhancementHourlyRate ?? basicRate;
    const hours = roundHours(breakdown.totalWorkedHours);
    const basicAmount = roundCurrency(hours * basicRate);
    totalHours += hours;
    totalBasicPay += basicAmount;

    const isPureBank = profile.contractType === 'BANK_HOURLY';
    let basicDescription = isPureBank ? 'Basic Hourly Pay' : 'Bank Basic Pay';
    if (!isPureBank && band !== profile.band) {
      basicDescription = `Bank Basic Pay (${band})`;
    }

    appendPayLineItem({
      description: basicDescription,
      unitsWorked: hours,
      paidUnits: hours,
      rate: basicRate,
      amount: basicAmount,
    });

    // Enhancements on bank shifts
    const { payLineItems: groupEnhancements } = calculateEnhancements(
      band,
      enhancementRate,
      breakdown
    );

    for (const item of groupEnhancements) {
      if (item.amount > 0) {
        const amount = shift.customEnhancementHourlyRate
          ? roundCurrency(item.paidUnits * enhancementRate)
          : item.amount;
        totalEnhancementAmount += amount;
        const enhancementDescription = isPureBank ? item.description : `Bank ${item.description}`;
        appendPayLineItem({
          description: enhancementDescription,
          unitsWorked: item.unitsWorked,
          paidUnits: item.paidUnits,
          rate: item.rate,
          amount,
        });
      }
    }

    if (shift.holidayPayHourlyRate && shift.holidayPayHourlyRate > 0) {
      const holidayPayAmount = roundCurrency(hours * shift.holidayPayHourlyRate);
      totalEnhancementAmount += holidayPayAmount;
      appendPayLineItem({
        description: isPureBank ? 'Holiday Pay' : 'Bank Holiday Pay',
        unitsWorked: hours,
        paidUnits: hours,
        rate: shift.holidayPayHourlyRate,
        amount: holidayPayAmount,
      });
    }
  }

  return {
    payLineItems,
    totalBasicPay: roundCurrency(totalBasicPay),
    totalEnhancementAmount: roundCurrency(totalEnhancementAmount),
    totalHours: roundHours(totalHours),
  };
};

const buildPayLineItems = (
  profile: EmployeeProfile,
  baseRates: GrossPayResult,
  substantiveEnhancements: SubstantiveEnhancements,
  overtimeResult: OvertimeCalculationResult,
  bankResults: BankCalculationResult,
  afcAbsencePay: number = 0,
  annualLeaveHours: number = 0
): PayLineItem[] => {
  const payLineItems: PayLineItem[] = [];

  // Substantive basic pay & overtime
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

    // Substantive Unsocial Enhancements
    if (substantiveEnhancements.nightAmount > 0) {
      payLineItems.push({
        description: 'Night Duty EN',
        unitsWorked: roundHours(substantiveEnhancements.nightHours),
        paidUnits: roundHours(substantiveEnhancements.nightPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(substantiveEnhancements.nightAmount),
      });
    }

    if (substantiveEnhancements.satAmount > 0) {
      payLineItems.push({
        description: 'Saturday EN',
        unitsWorked: roundHours(substantiveEnhancements.satHours),
        paidUnits: roundHours(substantiveEnhancements.satPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(substantiveEnhancements.satAmount),
      });
    }

    if (substantiveEnhancements.sunAmount > 0) {
      payLineItems.push({
        description: 'Sunday EN',
        unitsWorked: roundHours(substantiveEnhancements.sunHours),
        paidUnits: roundHours(substantiveEnhancements.sunPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(substantiveEnhancements.sunAmount),
      });
    }

    if (substantiveEnhancements.bhAmount > 0) {
      payLineItems.push({
        description: 'Public Holiday EN',
        unitsWorked: roundHours(substantiveEnhancements.bhHours),
        paidUnits: roundHours(substantiveEnhancements.bhPaidUnits),
        rate: baseRates.hourlyRate,
        amount: roundCurrency(substantiveEnhancements.bhAmount),
      });
    }

    if (substantiveEnhancements.actingUpAmount > 0) {
      payLineItems.push({
        description: 'Higher Band / Acting Up Allowance',
        unitsWorked: roundHours(substantiveEnhancements.actingUpHours),
        paidUnits: roundHours(substantiveEnhancements.actingUpHours),
        rate: roundHourlyRate(
          substantiveEnhancements.actingUpAmount / substantiveEnhancements.actingUpHours
        ),
        amount: roundCurrency(substantiveEnhancements.actingUpAmount),
      });
    }

    if (afcAbsencePay > 0) {
      payLineItems.push({
        description: 'AfC Absence',
        unitsWorked: roundHours(annualLeaveHours),
        paidUnits: roundHours(annualLeaveHours),
        rate: roundHourlyRate(afcAbsencePay / annualLeaveHours),
        amount: roundCurrency(afcAbsencePay),
      });
    }
  }

  // Append Bank Pay Line Items (Bank Basic Pay and Bank Enhancements)
  for (const bankItem of bankResults.payLineItems) {
    payLineItems.push(bankItem);
  }

  return payLineItems;
};

const calculateDeductions = (
  grossPay: number,
  pensionablePay: number,
  profile: EmployeeProfile,
  commitments: RecurringCommitment[],
  taxPeriod: number,
  previousYearToDate: PayslipYearToDate
): { taxablePay: number; deductionsList: DeductionBreakdownItem[]; totalDeductions: number } => {
  const pensionAmount = calculatePensionContribution(
    pensionablePay,
    profile.pensionContributionRate
  );

  // Net pay arrangement for pension gives pre-tax deduction
  const taxablePay = Math.max(0, roundCurrency(grossPay - pensionAmount));
  const payeTax = calculatePaye({
    taxablePay,
    taxCode: profile.taxCode,
    taxPeriod,
    previousTaxablePay: previousYearToDate.taxablePay,
    previousTaxPaid: previousYearToDate.taxPaid,
  });
  const nationalInsurance = calculateClass1CategoryA(grossPay);

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

  const totalDeductions = roundCurrency(deductionsList.reduce((acc, item) => acc + item.amount, 0));

  return { taxablePay, deductionsList, totalDeductions };
};

/**
 * Calculates AfC Absence enhancement top-up pay for annual leave taken in the month.
 * Under NHS Agenda for Change Section 13 / Flowers ruling, holiday pay must include
 * average unsocial enhancement earnings.
 */
const calculateAfcAbsencePay = (
  annualLeaveHours: number,
  profile: EmployeeProfile,
  allShifts: Shift[],
  monthYear: Date,
  baseHourlyRate: number
): number => {
  if (annualLeaveHours <= 0) return 0;
  if (profile.afcAbsenceHourlyRateOverride !== undefined) {
    return roundCurrency(annualLeaveHours * profile.afcAbsenceHourlyRateOverride);
  }

  const referenceStart = new Date(monthYear.getFullYear(), monthYear.getMonth() - 3, 1);
  const referenceEnd = new Date(monthYear.getFullYear(), monthYear.getMonth(), 1);
  const referenceShifts = allShifts.filter((shift) => {
    const shiftDate = new Date(`${shift.date}T00:00:00`);
    return (
      shiftDate >= referenceStart &&
      shiftDate < referenceEnd &&
      shift.shiftType !== 'BANK' &&
      shift.shiftType !== 'ANNUAL_LEAVE'
    );
  });
  const referenceHours = referenceShifts.reduce(
    (total, shift) => total + (shift.breakdown || calculateShiftBreakdown(shift)).totalWorkedHours,
    0
  );
  if (referenceHours <= 0) return 0;

  const enhancements = aggregateSubstantiveEnhancements(referenceShifts, profile, baseHourlyRate);
  const referenceSupplements =
    enhancements.nightAmount +
    enhancements.satAmount +
    enhancements.sunAmount +
    enhancements.bhAmount +
    enhancements.actingUpAmount;
  return roundCurrency(annualLeaveHours * (referenceSupplements / referenceHours));
};

/**
 * Groups shifts by ISO week and calculates additional hours and overtime
 * pay owed on top of basic contracted pay for shifts explicitly marked as OVERTIME.
 *
 * In NHS Agenda for Change:
 * - Standard substantive roster shifts ('SUBSTANTIVE') are covered by Basic Salary.
 * - Extra / Overtime shifts ('OVERTIME') worked beyond contracted roster:
 *   - Additional hours: hours up to FTE threshold (37.5h) → plain time (1.0×)
 *   - Overtime: hours above FTE threshold (Bands 1–7 only) → time-and-a-half (1.5×)
 *   - Bands 8a–9: all excess hours paid at plain time; no 1.5× premium
 */
const calculateAdditionalAndOvertimePay = (
  shifts: Shift[],
  profile: EmployeeProfile,
  hourlyRate: number
): OvertimeCalculationResult => {
  const overtimeShifts = shifts.filter((s) => s.shiftType === 'OVERTIME');
  if (overtimeShifts.length === 0) {
    return {
      additionalHours: 0,
      additionalHoursPay: 0,
      overtimeHours: 0,
      overtimePay: 0,
    };
  }

  const weekMap = new Map<string, { rosteredHours: number; overtimeHours: number }>();
  for (const shift of shifts) {
    if (shift.shiftType === 'BANK') continue;

    const breakdown = shift.breakdown || calculateShiftBreakdown(shift);
    const weekKey = getIsoWeekKey(shift.date);
    const entry = weekMap.get(weekKey) ?? { rosteredHours: 0, overtimeHours: 0 };

    if (shift.shiftType === 'OVERTIME') {
      entry.overtimeHours += breakdown.totalWorkedHours;
    } else {
      entry.rosteredHours += breakdown.totalWorkedHours;
    }
    weekMap.set(weekKey, entry);
  }

  const fteThreshold = profile.standardFullTimeHours || 37.5;
  const overtimeEligibleBands = ['Band 2', 'Band 3', 'Band 4', 'Band 5', 'Band 6', 'Band 7'];
  const isOvertimeEligible = overtimeEligibleBands.includes(profile.band);

  let totalAdditionalHours = 0;
  let totalOvertimeHours = 0;

  for (const [, { rosteredHours, overtimeHours }] of weekMap) {
    if (overtimeHours <= 0) continue;

    const startPoint = rosteredHours;
    const endPoint = rosteredHours + overtimeHours;

    if (isOvertimeEligible) {
      const plainTimePart = Math.max(
        0,
        Math.min(endPoint, fteThreshold) - Math.min(startPoint, fteThreshold)
      );
      const overtimePart = Math.max(0, endPoint - Math.max(startPoint, fteThreshold));

      totalAdditionalHours += plainTimePart;
      totalOvertimeHours += overtimePart;
    } else {
      totalAdditionalHours += overtimeHours;
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
};

/**
 * Calculates the full expected NHS wage slip summary for a given roster month.
 * Per NHS Agenda for Change payroll cycles, hours worked in month M (e.g. June)
 * are paid in month M+1 (e.g. July).
 */
export const calculateMonthlyPayslip = (
  profile: EmployeeProfile,
  shifts: Shift[],
  commitments: RecurringCommitment[],
  monthYear: Date,
  context: PayrollCalculationContext = {}
): PayslipSummary => {
  const baseRates = calculateBaseRates(profile);
  const hoursBreakdown = aggregateShiftHours(shifts);
  const previousYearToDate = context.previousYearToDate ?? EMPTY_YEAR_TO_DATE;
  const paymentMonthDate = getPaymentMonthDate(monthYear);
  const rosterMonthString = formatMonthYearString(monthYear);
  const monthYearString = formatMonthYearString(paymentMonthDate);
  const periodEndDate = formatPeriodEndDate(paymentMonthDate);
  const payDate = formatPayDate(paymentMonthDate);
  const taxPeriod = getUkTaxPeriod(paymentMonthDate);

  // Separate substantive shifts, bank shifts, and annual leave
  const substantiveShifts =
    profile.contractType === 'SUBSTANTIVE'
      ? shifts.filter((s) => s.shiftType !== 'BANK' && s.shiftType !== 'ANNUAL_LEAVE')
      : [];
  const substantiveAndLeaveShifts =
    profile.contractType === 'SUBSTANTIVE' ? shifts.filter((s) => s.shiftType !== 'BANK') : [];
  const bankShifts =
    profile.contractType === 'BANK_HOURLY' ? shifts : shifts.filter((s) => s.shiftType === 'BANK');
  const annualLeaveShifts = shifts.filter((s) => s.shiftType === 'ANNUAL_LEAVE');
  const annualLeaveHours = roundHours(
    annualLeaveShifts.reduce((acc, s) => {
      const bd = s.breakdown || calculateShiftBreakdown(s);
      return acc + bd.totalWorkedHours;
    }, 0)
  );
  const substantiveAccountedHours = roundHours(
    shifts
      .filter((shift) => shift.shiftType !== 'BANK' && shift.shiftType !== 'OVERTIME')
      .reduce(
        (total, shift) =>
          total + (shift.breakdown || calculateShiftBreakdown(shift)).totalWorkedHours,
        0
      )
  );

  // 1. Substantive Additional Hours & Overtime calculation (AfC Section 3)
  const overtimeResult =
    profile.contractType === 'SUBSTANTIVE'
      ? calculateAdditionalAndOvertimePay(substantiveAndLeaveShifts, profile, baseRates.hourlyRate)
      : { additionalHours: 0, additionalHoursPay: 0, overtimeHours: 0, overtimePay: 0 };

  // 2. Substantive Unsocial Enhancements & Acting Up (AfC Section 2)
  const substantiveEnhancements =
    profile.contractType === 'SUBSTANTIVE'
      ? aggregateSubstantiveEnhancements(substantiveShifts, profile, baseRates.hourlyRate)
      : getEmptyEnhancements();

  const substantiveEnhancementsSum = roundCurrency(
    substantiveEnhancements.nightAmount +
      substantiveEnhancements.satAmount +
      substantiveEnhancements.sunAmount +
      substantiveEnhancements.bhAmount +
      substantiveEnhancements.actingUpAmount
  );

  // 3. AfC Absence holiday enhancement pay (AfC Section 13)
  const afcAbsencePay =
    profile.contractType === 'SUBSTANTIVE'
      ? calculateAfcAbsencePay(
          annualLeaveHours,
          profile,
          context.allShifts ?? shifts,
          monthYear,
          baseRates.hourlyRate
        )
      : 0;

  // 4. Bank Pay & Bank Enhancements calculation (Separate Bank Assignment)
  const bankResults = aggregateBankPay(bankShifts, profile, baseRates.hourlyRate);

  // 5. Build pay line items matching NHS ESR payslip
  const payLineItems = buildPayLineItems(
    profile,
    baseRates,
    substantiveEnhancements,
    overtimeResult,
    bankResults,
    afcAbsencePay,
    annualLeaveHours
  );

  const totalEnhancements = roundCurrency(
    substantiveEnhancementsSum + afcAbsencePay + bankResults.totalEnhancementAmount
  );

  const grossPay = roundCurrency(payLineItems.reduce((acc, item) => acc + item.amount, 0));
  const pensionablePay = roundCurrency(grossPay - overtimeResult.overtimePay);

  // Deductions calculation
  const deductions = calculateDeductions(
    grossPay,
    pensionablePay,
    profile,
    commitments,
    taxPeriod,
    previousYearToDate
  );
  const paye = deductions.deductionsList.find((item) => item.name === 'PAYE')?.amount ?? 0;
  const ni = deductions.deductionsList.find((item) => item.name.startsWith('NI '))?.amount ?? 0;
  const pension =
    deductions.deductionsList.find((item) => item.name.startsWith('NHS Pension'))?.amount ?? 0;
  const yearToDate: PayslipYearToDate = {
    grossPay: roundCurrency(previousYearToDate.grossPay + grossPay),
    taxablePay: roundCurrency(previousYearToDate.taxablePay + deductions.taxablePay),
    taxPaid: roundCurrency(previousYearToDate.taxPaid + paye),
    niPay: roundCurrency(previousYearToDate.niPay + grossPay),
    niContributions: roundCurrency(previousYearToDate.niContributions + ni),
    pensionablePay: roundCurrency(previousYearToDate.pensionablePay + pensionablePay),
    pensionContributions: roundCurrency(previousYearToDate.pensionContributions + pension),
  };

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
    pensionablePay,
    taxablePay: deductions.taxablePay,
    annualLeaveHours,
    substantiveAccountedHours,
    bankHours: bankResults.totalHours,
    yearToDate,
    ...(afcAbsencePay > 0 && { afcAbsencePay }),
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
};

export const calculatePayslipHistory = (
  profile: EmployeeProfile,
  allShifts: Shift[],
  commitments: RecurringCommitment[],
  activeRosterMonth: Date
): PayslipSummary => {
  const paymentMonth = getPaymentMonthDate(activeRosterMonth);
  const taxYearStartYear =
    paymentMonth.getMonth() >= 3 ? paymentMonth.getFullYear() : paymentMonth.getFullYear() - 1;
  const firstRosterMonth = new Date(taxYearStartYear, 2, 1);
  let yearToDate = EMPTY_YEAR_TO_DATE;
  let currentSummary: PayslipSummary | null = null;

  for (
    let rosterMonth = new Date(firstRosterMonth);
    rosterMonth <= activeRosterMonth;
    rosterMonth = new Date(rosterMonth.getFullYear(), rosterMonth.getMonth() + 1, 1)
  ) {
    const monthPrefix = `${rosterMonth.getFullYear()}-${String(rosterMonth.getMonth() + 1).padStart(2, '0')}`;
    const monthShifts = allShifts.filter((shift) => shift.date.startsWith(monthPrefix));
    currentSummary = calculateMonthlyPayslip(profile, monthShifts, commitments, rosterMonth, {
      allShifts,
      previousYearToDate: yearToDate,
    });
    yearToDate = currentSummary.yearToDate;
  }

  return (
    currentSummary ??
    calculateMonthlyPayslip(profile, [], commitments, activeRosterMonth, { allShifts })
  );
};
