import { EmployeeProfile } from '../models/Contract';
import { Shift } from '../models/Shift';
import { RecurringCommitment } from '../models/Deductions';
import { calculateMonthlyPayslip } from './wageCalculatorService';
import { calculateShiftBreakdown } from './shiftIntervalCalculator';
import { roundHours, roundCurrency } from '../utils/mathUtils';
import {
  formatMonthYearString,
  getPaymentMonthDate,
  getUkTaxPeriod,
  getIsoWeekNumber,
  getShiftDateRange,
} from '../utils/dateUtils';

export interface PayPeriodEnhancementHours {
  plainDayHours: number;
  nightHours: number;
  saturdayHours: number;
  sundayHours: number;
  bankHolidayHours: number;
}

export interface PayPeriodSummaryRow {
  rosterMonthIso: string; // "2026-06"
  rosterMonthDate: Date;
  rosterMonthLabel: string; // "June 2026"
  payMonthLabel: string; // "July 2026"
  payPeriodDisplay: string; // "Worked Jun 2026 (Paid Jul 2026)"
  taxPeriod: number; // e.g. 4
  shiftCount: number;
  contractedHours: number; // Monthly contracted basic hours (e.g. 112.67)
  actualHoursWorked: number; // Total shift hours worked in month
  extraHours: number; // Actual hours - Contracted hours (can be positive or negative)
  extraHoursPaid: number; // Overtime + Additional + Bank hours paid
  potentiallyUnpaidHours: number; // Excess hours worked above contracted that are not paid as overtime/bank
  potentiallyUnpaidAmount: number; // Estimated value in £
  enhancementsDue: number; // Total unsocial enhancements £
  enhancementHours: PayPeriodEnhancementHours;
  grossPay: number;
  netPay: number;
  hourlyRate: number;
}

export interface PayPeriodsTotals {
  totalShifts: number;
  totalContractedHours: number;
  totalActualHoursWorked: number;
  totalExtraHours: number;
  totalExtraHoursPaid: number;
  totalPotentiallyUnpaidHours: number;
  totalPotentiallyUnpaidAmount: number;
  totalEnhancementsDue: number;
  totalGrossPay: number;
  totalNetPay: number;
}

/**
 * Calculates a single pay period summary row from shifts in that roster month.
 */
export const calculatePayPeriodRow = (
  profile: EmployeeProfile,
  monthShifts: Shift[],
  commitments: RecurringCommitment[],
  rosterMonth: Date,
  allShifts: Shift[]
): PayPeriodSummaryRow => {
  const summary = calculateMonthlyPayslip(profile, monthShifts, commitments, rosterMonth, {
    allShifts,
  });

  const year = rosterMonth.getFullYear();
  const month = String(rosterMonth.getMonth() + 1).padStart(2, '0');
  const rosterMonthIso = `${year}-${month}`;

  const rosterMonthLabel = formatMonthYearString(rosterMonth);
  const paymentMonth = getPaymentMonthDate(rosterMonth);
  const payMonthLabel = formatMonthYearString(paymentMonth);
  const payPeriodDisplay = `Worked ${rosterMonthLabel} (Paid ${payMonthLabel})`;

  const contractedHours = profile.contractType === 'SUBSTANTIVE' ? summary.monthlyBasicHours : 0;
  const actualHoursWorked = summary.hoursBreakdown.totalWorkedHours;

  const extraHours = roundHours(actualHoursWorked - contractedHours);

  // Extra hours paid: additional hours + overtime hours + bank hours
  let extraHoursPaid = 0;
  if (profile.contractType === 'SUBSTANTIVE') {
    extraHoursPaid = roundHours(
      (summary.additionalHours ?? 0) + (summary.overtimeHours ?? 0) + summary.bankHours
    );
  } else {
    // For pure bank hourly contracts, all worked hours are directly paid hours
    extraHoursPaid = actualHoursWorked;
  }

  // Potentially unpaid hours: extra substantive hours worked above contracted that are not paid as overtime/bank
  let potentiallyUnpaidHours = 0;
  if (profile.contractType === 'SUBSTANTIVE') {
    if (extraHours > 0) {
      potentiallyUnpaidHours = roundHours(Math.max(0, extraHours - extraHoursPaid));
    }
  }

  const potentiallyUnpaidAmount = roundCurrency(potentiallyUnpaidHours * summary.hourlyRate);

  return {
    rosterMonthIso,
    rosterMonthDate: rosterMonth,
    rosterMonthLabel,
    payMonthLabel,
    payPeriodDisplay,
    taxPeriod: getUkTaxPeriod(paymentMonth),
    shiftCount: monthShifts.length,
    contractedHours,
    actualHoursWorked,
    extraHours,
    extraHoursPaid,
    potentiallyUnpaidHours,
    potentiallyUnpaidAmount,
    enhancementsDue: summary.enhancementsTotal,
    enhancementHours: {
      plainDayHours: summary.hoursBreakdown.plainDayHours,
      nightHours: summary.hoursBreakdown.nightHours,
      saturdayHours: summary.hoursBreakdown.saturdayHours,
      sundayHours: summary.hoursBreakdown.sundayHours,
      bankHolidayHours: summary.hoursBreakdown.bankHolidayHours,
    },
    grossPay: summary.grossPay,
    netPay: summary.netPay,
    hourlyRate: summary.hourlyRate,
  };
};

/**
 * Generates pay period summary rows across all recorded shifts and active months.
 */
export const getAllPayPeriodSummaries = (
  profile: EmployeeProfile,
  allShifts: Shift[],
  commitments: RecurringCommitment[],
  options?: {
    activeMonth?: Date;
    taxYear?: number; // Starting calendar year of tax year (e.g. 2026 for 2026/27)
    includeAllTaxYearMonths?: boolean;
  }
): PayPeriodSummaryRow[] => {
  // Collect all unique Year-Months from shifts
  const monthKeySet = new Set<string>();

  for (const shift of allShifts) {
    if (shift.date && shift.date.length >= 7) {
      monthKeySet.add(shift.date.substring(0, 7));
    }
  }

  // Also include the active month if provided
  if (options?.activeMonth) {
    const y = options.activeMonth.getFullYear();
    const m = String(options.activeMonth.getMonth() + 1).padStart(2, '0');
    monthKeySet.add(`${y}-${m}`);
  }

  // If tax year specified and includeAllTaxYearMonths is true, add all 12 roster months (March to February of next year, paid April to March)
  if (options?.taxYear !== undefined && options.includeAllTaxYearMonths) {
    const startYear = options.taxYear;
    // UK Tax year April (Y) to March (Y+1) corresponds to Worked Months March (Y) to February (Y+1)
    for (let monthIdx = 2; monthIdx < 14; monthIdx++) {
      const d = new Date(startYear, monthIdx, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      monthKeySet.add(`${y}-${m}`);
    }
  }

  // Sort month keys in chronological order
  const sortedMonthKeys = Array.from(monthKeySet).sort((a, b) => a.localeCompare(b));

  const rows: PayPeriodSummaryRow[] = [];

  for (const monthKey of sortedMonthKeys) {
    const [year, month] = monthKey.split('-').map(Number);
    const rosterMonthDate = new Date(year, month - 1, 1);

    // Filter shifts for this month
    const monthShifts = allShifts.filter((s) => s.date.startsWith(monthKey));

    // If a tax year filter is applied, ensure the payment month belongs to that tax year
    if (options?.taxYear !== undefined) {
      const paymentMonth = getPaymentMonthDate(rosterMonthDate);
      const paymentTaxYear =
        paymentMonth.getMonth() >= 3 ? paymentMonth.getFullYear() : paymentMonth.getFullYear() - 1;
      if (paymentTaxYear !== options.taxYear) {
        continue;
      }
    }

    const row = calculatePayPeriodRow(
      profile,
      monthShifts,
      commitments,
      rosterMonthDate,
      allShifts
    );
    rows.push(row);
  }

  return rows;
};

/**
 * Calculates aggregate totals for a collection of pay period rows.
 */
export const calculatePayPeriodsTotals = (rows: PayPeriodSummaryRow[]): PayPeriodsTotals => {
  const totals: PayPeriodsTotals = {
    totalShifts: 0,
    totalContractedHours: 0,
    totalActualHoursWorked: 0,
    totalExtraHours: 0,
    totalExtraHoursPaid: 0,
    totalPotentiallyUnpaidHours: 0,
    totalPotentiallyUnpaidAmount: 0,
    totalEnhancementsDue: 0,
    totalGrossPay: 0,
    totalNetPay: 0,
  };

  for (const row of rows) {
    totals.totalShifts += row.shiftCount;
    totals.totalContractedHours += row.contractedHours;
    totals.totalActualHoursWorked += row.actualHoursWorked;
    totals.totalExtraHours += row.extraHours;
    totals.totalExtraHoursPaid += row.extraHoursPaid;
    totals.totalPotentiallyUnpaidHours += row.potentiallyUnpaidHours;
    totals.totalPotentiallyUnpaidAmount += row.potentiallyUnpaidAmount;
    totals.totalEnhancementsDue += row.enhancementsDue;
    totals.totalGrossPay += row.grossPay;
    totals.totalNetPay += row.netPay;
  }

  return {
    totalShifts: totals.totalShifts,
    totalContractedHours: roundHours(totals.totalContractedHours),
    totalActualHoursWorked: roundHours(totals.totalActualHoursWorked),
    totalExtraHours: roundHours(totals.totalExtraHours),
    totalExtraHoursPaid: roundHours(totals.totalExtraHoursPaid),
    totalPotentiallyUnpaidHours: roundHours(totals.totalPotentiallyUnpaidHours),
    totalPotentiallyUnpaidAmount: roundCurrency(totals.totalPotentiallyUnpaidAmount),
    totalEnhancementsDue: roundCurrency(totals.totalEnhancementsDue),
    totalGrossPay: roundCurrency(totals.totalGrossPay),
    totalNetPay: roundCurrency(totals.totalNetPay),
  };
};

const escapeCsvField = (field: string | number | undefined | null): string => {
  if (field === undefined || field === null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Exports Pay Period summary rows to a CSV string.
 */
export const exportPayPeriodsToCsv = (
  rows: PayPeriodSummaryRow[],
  _profile?: EmployeeProfile
): string => {
  const headers = [
    'Worked Month',
    'Payment Month',
    'Tax Period',
    'Contracted Hours',
    'Actual Hours Worked',
    'Extra Hours',
    'Extra Hours Paid',
    'Potentially Unpaid Hours',
    'Potentially Unpaid Est (£)',
    'Enhancements Due (£)',
    'Gross Pay (£)',
    'Net Pay (£)',
    'Shifts Count',
  ];

  const lines: string[] = [];
  lines.push(headers.map(escapeCsvField).join(','));

  for (const r of rows) {
    const rowValues = [
      r.rosterMonthLabel,
      r.payMonthLabel,
      `Month ${r.taxPeriod}`,
      r.contractedHours.toFixed(2),
      r.actualHoursWorked.toFixed(2),
      r.extraHours.toFixed(2),
      r.extraHoursPaid.toFixed(2),
      r.potentiallyUnpaidHours.toFixed(2),
      r.potentiallyUnpaidAmount.toFixed(2),
      r.enhancementsDue.toFixed(2),
      r.grossPay.toFixed(2),
      r.netPay.toFixed(2),
      r.shiftCount,
    ];
    lines.push(rowValues.map(escapeCsvField).join(','));
  }

  // Append Totals row
  const totals = calculatePayPeriodsTotals(rows);
  const totalsValues = [
    'TOTALS',
    '-',
    '-',
    totals.totalContractedHours.toFixed(2),
    totals.totalActualHoursWorked.toFixed(2),
    totals.totalExtraHours.toFixed(2),
    totals.totalExtraHoursPaid.toFixed(2),
    totals.totalPotentiallyUnpaidHours.toFixed(2),
    totals.totalPotentiallyUnpaidAmount.toFixed(2),
    totals.totalEnhancementsDue.toFixed(2),
    totals.totalGrossPay.toFixed(2),
    totals.totalNetPay.toFixed(2),
    totals.totalShifts,
  ];
  lines.push(totalsValues.map(escapeCsvField).join(','));

  return lines.join('\r\n');
};

/**
 * Exports all detailed recorded shifts across all months to a CSV string.
 */
export const exportShiftsToCsv = (shifts: Shift[], profile?: EmployeeProfile): string => {
  const headers = [
    'Week Number',
    'Start Date',
    'End Date',
    'Start Time',
    'End Time',
    'Unpaid Break (mins)',
    'Hours Worked',
    'Shift Preset',
    'Shift Type',
    'Band',
    'Plain Day Hours',
    'Night Hours',
    'Saturday Hours',
    'Sunday Hours',
    'Bank Holiday Hours',
  ];

  const lines: string[] = [];
  lines.push(headers.map(escapeCsvField).join(','));

  const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date));

  for (const s of sortedShifts) {
    const range = getShiftDateRange(s.date, s.startTime, s.endTime);
    const weekNum = getIsoWeekNumber(s.date);
    const breakdown = s.breakdown || calculateShiftBreakdown(s);

    const rowValues = [
      `Week ${weekNum}`,
      range.startDateIso,
      range.endDateIso,
      s.startTime,
      s.endTime,
      s.unpaidBreakMinutes ?? 0,
      breakdown?.totalWorkedHours ?? 0,
      s.presetType ?? (s.shiftType === 'ANNUAL_LEAVE' ? 'ANNUAL_LEAVE' : 'CUSTOM'),
      s.shiftType ?? 'SUBSTANTIVE',
      s.overrideBand ?? profile?.band ?? 'Standard',
      breakdown?.plainDayHours ?? 0,
      breakdown?.nightHours ?? 0,
      breakdown?.saturdayHours ?? 0,
      breakdown?.sundayHours ?? 0,
      breakdown?.bankHolidayHours ?? 0,
    ];
    lines.push(rowValues.map(escapeCsvField).join(','));
  }

  return lines.join('\r\n');
};

/**
 * Initiates a browser CSV file download.
 */
export const downloadCsvFile = (filename: string, csvContent: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
