import { roundCurrency } from '../utils/mathUtils';

export class PensionCalculator {
  public static calculateContribution(pensionablePay: number, rate: number): number {
    return roundCurrency(pensionablePay * rate);
  }
}
