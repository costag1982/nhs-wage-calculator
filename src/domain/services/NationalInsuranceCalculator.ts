import { UK_NI_CLASS_1_A } from '../constants/taxConfig';
import { roundCurrency } from '../utils/mathUtils';

export class NationalInsuranceCalculator {
  public static calculateClass1CategoryA(niGrossPay: number): number {
    const { monthlyPrimaryThreshold, monthlyUpperEarningsLimit, mainRate, higherRate } =
      UK_NI_CLASS_1_A;

    if (niGrossPay <= monthlyPrimaryThreshold) {
      return 0;
    }

    let niAmount = 0;

    // Earnings between Primary Threshold and Upper Earnings Limit (8%)
    const mainBandEarnings =
      Math.min(niGrossPay, monthlyUpperEarningsLimit) - monthlyPrimaryThreshold;
    if (mainBandEarnings > 0) {
      niAmount += mainBandEarnings * mainRate;
    }

    // Earnings above Upper Earnings Limit (2%)
    if (niGrossPay > monthlyUpperEarningsLimit) {
      const higherBandEarnings = niGrossPay - monthlyUpperEarningsLimit;
      niAmount += higherBandEarnings * higherRate;
    }

    return roundCurrency(niAmount);
  }
}
