import { NhsBandLevel } from '../models/Contract';
import { NHS_BAND_CONFIGS } from '../constants/nhsBands';
import { ShiftHoursBreakdown } from '../models/Shift';
import { PayLineItem } from '../models/Payslip';
import { roundCurrency, roundHours } from '../utils/mathUtils';

export class EnhancementRateCalculator {
  /**
   * Generates the NHS ESR PayLineItems for unsocial hours enhancements
   */
  public static calculateEnhancements(
    band: NhsBandLevel,
    hourlyRate: number,
    hoursBreakdown: ShiftHoursBreakdown
  ): { payLineItems: PayLineItem[]; totalEnhancements: number } {
    const config = NHS_BAND_CONFIGS[band] || NHS_BAND_CONFIGS['Band 2'];
    const payLineItems: PayLineItem[] = [];

    // 1. Night Duty EN (Weekdays 20:00 - 06:00)
    if (hoursBreakdown.nightHours > 0) {
      payLineItems.push(
        this.createPayLineItem(
          'Night Duty EN',
          hoursBreakdown.nightHours,
          config.nightEnhancementRate,
          hourlyRate
        )
      );
    }

    // 2. Saturday EN
    if (hoursBreakdown.saturdayHours > 0) {
      payLineItems.push(
        this.createPayLineItem(
          'Saturday EN',
          hoursBreakdown.saturdayHours,
          config.saturdayEnhancementRate,
          hourlyRate
        )
      );
    }

    // 3. Sunday EN
    if (hoursBreakdown.sundayHours > 0) {
      payLineItems.push(
        this.createPayLineItem(
          'Sunday EN',
          hoursBreakdown.sundayHours,
          config.sundayAndHolidayEnhancementRate,
          hourlyRate
        )
      );
    }

    // 4. Public Holiday EN
    if (hoursBreakdown.bankHolidayHours > 0) {
      payLineItems.push(
        this.createPayLineItem(
          'Public Holiday EN',
          hoursBreakdown.bankHolidayHours,
          config.sundayAndHolidayEnhancementRate,
          hourlyRate
        )
      );
    }

    const totalEnhancements = roundCurrency(
      payLineItems.reduce((acc, item) => acc + item.amount, 0)
    );

    return { payLineItems, totalEnhancements };
  }

  private static createPayLineItem(
    description: string,
    unitsWorked: number,
    enhancementRate: number,
    hourlyRate: number
  ): PayLineItem {
    const roundedUnitsWorked = roundHours(unitsWorked);
    const rawPaidUnits = unitsWorked * enhancementRate;
    const paidUnits = roundHours(rawPaidUnits);
    const amount = roundCurrency(paidUnits * hourlyRate);

    return {
      description,
      unitsWorked: roundedUnitsWorked,
      paidUnits,
      rate: hourlyRate,
      amount,
    };
  }
}
