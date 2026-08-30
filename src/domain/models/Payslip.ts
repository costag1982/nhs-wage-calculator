import { ShiftHoursBreakdown } from './Shift';
import { DeductionBreakdownItem } from './Deductions';

export interface PayLineItem {
  description: string;
  unitsWorked: number;
  paidUnits: number;
  rate: number;
  amount: number;
}

export interface PayslipSummary {
  // Period details
  monthYearString: string; // e.g. "July 2026" (Payment Month)
  rosterMonthString: string; // e.g. "June 2026" (Worked Hours Month)
  periodEndDate: string; // e.g. "31 JUL 2026" (Payment Period End Date)
  payDate: string; // e.g. "31 JUL 2026" (BACS Payment Date)
  taxPeriod: number; // e.g. Month 4 (July) in UK tax year starting April

  // Rates & Base
  hourlyRate: number;
  annualProRataSalary: number;
  monthlyBasicHours: number;
  monthlyBasicPay: number;

  // Enhancements
  hoursBreakdown: ShiftHoursBreakdown;
  payLineItems: PayLineItem[];
  enhancementsTotal: number;

  // Aggregates
  grossPay: number;
  pensionablePay: number;
  taxablePay: number;
  annualLeaveHours?: number; // Total annual leave hours recorded in this roster month

  // Additional Hours & Overtime (substantive contracts only)

  additionalHours?: number; // Hours above contracted, up to FTE threshold (plain time)
  additionalHoursPay?: number;
  overtimeHours?: number; // Hours above FTE threshold — 1.5× (Bands 1–7 only)
  overtimePay?: number;

  // Deductions
  deductionsList: DeductionBreakdownItem[];
  totalDeductions: number;

  // Final Net
  netPay: number;
}
