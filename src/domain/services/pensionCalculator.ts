import { roundCurrency } from '../utils/mathUtils';

export const calculatePensionContribution = (pensionablePay: number, rate: number): number => {
  return roundCurrency(pensionablePay * rate);
};
