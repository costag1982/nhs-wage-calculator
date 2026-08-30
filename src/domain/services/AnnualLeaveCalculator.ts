import { EmployeeProfile, NhsServiceYearsTier } from '../models/Contract';
import { Shift } from '../models/Shift';
import {
  NHS_LEAVE_TIERS,
  NHS_STANDARD_DAY_HOURS,
  getNhsLeaveYearRange,
} from '../constants/annualLeave';
import { NHS_STANDARD_FTE_HOURS } from '../constants/nhsBands';
import { ShiftIntervalCalculator } from './ShiftIntervalCalculator';
import { roundHours } from '../utils/mathUtils';

export interface AnnualLeaveEntitlement {
  tier: NhsServiceYearsTier;
  tierLabel: string;
  annualLeaveDays: number;
  bankHolidayDays: number;
  totalDays: number;
  annualLeaveHours: number;
  bankHolidayHours: number;
  carryOverHours: number;
  totalEntitlementHours: number;
}

export interface AnnualLeaveBalanceSummary {
  entitlement: AnnualLeaveEntitlement;
  leaveYearLabel: string;
  leaveYearStart: string;
  leaveYearEnd: string;
  takenYearToDateHours: number;
  takenThisMonthHours: number;
  remainingHours: number;
}

export class AnnualLeaveCalculator {
  /**
   * Calculates NHS Agenda for Change Section 13 pro-rata annual leave entitlement in hours.
   */
  public static calculateEntitlement(profile: EmployeeProfile): AnnualLeaveEntitlement {
    const fteHours = profile.standardFullTimeHours || NHS_STANDARD_FTE_HOURS;
    const contractedHours = profile.contractedWeeklyHours || fteHours;
    const tierKey = profile.yearsOfServiceTier || 'UNDER_5';
    const tierConfig = NHS_LEAVE_TIERS[tierKey] || NHS_LEAVE_TIERS.UNDER_5;
    const carryOver = profile.annualLeaveCarryOverHours || 0;

    // Pro-rata hours formula per NHS AfC Section 13.4:
    // (Contracted Weekly Hours / 37.5) * (Days * 7.5)
    const proRataRatio = contractedHours / fteHours;
    const annualLeaveHours = roundHours(
      proRataRatio * (tierConfig.annualLeaveDays * NHS_STANDARD_DAY_HOURS)
    );
    const bankHolidayHours = roundHours(
      proRataRatio * (tierConfig.bankHolidayDays * NHS_STANDARD_DAY_HOURS)
    );
    const totalEntitlementHours = roundHours(annualLeaveHours + bankHolidayHours + carryOver);

    return {
      tier: tierKey,
      tierLabel: tierConfig.label,
      annualLeaveDays: tierConfig.annualLeaveDays,
      bankHolidayDays: tierConfig.bankHolidayDays,
      totalDays: tierConfig.totalDays,
      annualLeaveHours,
      bankHolidayHours,
      carryOverHours: carryOver,
      totalEntitlementHours,
    };
  }

  /**
   * Calculates the full leave balance (taken vs remaining) for the NHS leave year containing referenceDate.
   */
  public static calculateLeaveBalance(
    profile: EmployeeProfile,
    allShifts: Shift[],
    referenceDate: Date
  ): AnnualLeaveBalanceSummary {
    const entitlement = this.calculateEntitlement(profile);
    const leaveYear = getNhsLeaveYearRange(referenceDate);

    // Active month prefix e.g. "2026-06"
    const year = referenceDate.getFullYear();
    const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;

    let takenYearToDate = 0;
    let takenThisMonth = 0;

    for (const shift of allShifts) {
      if (shift.shiftType !== 'ANNUAL_LEAVE') continue;

      const breakdown = shift.breakdown || ShiftIntervalCalculator.calculateBreakdown(shift);
      const leaveDuration = breakdown.totalWorkedHours;

      // Check if within NHS leave year (e.g. 2026-04-01 to 2027-03-31)
      if (shift.date >= leaveYear.startDateIso && shift.date <= leaveYear.endDateIso) {
        takenYearToDate += leaveDuration;
      }

      // Check if in reference month
      if (shift.date.startsWith(monthPrefix)) {
        takenThisMonth += leaveDuration;
      }
    }

    const takenYearToDateHours = roundHours(takenYearToDate);
    const takenThisMonthHours = roundHours(takenThisMonth);
    const remainingHours = roundHours(entitlement.totalEntitlementHours - takenYearToDateHours);

    return {
      entitlement,
      leaveYearLabel: leaveYear.label,
      leaveYearStart: leaveYear.startDateIso,
      leaveYearEnd: leaveYear.endDateIso,
      takenYearToDateHours,
      takenThisMonthHours,
      remainingHours,
    };
  }
}
