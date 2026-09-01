import { roundCurrency } from '../utils/mathUtils';

const BASIC_RATE_BAND = 37_700;
const HIGHER_RATE_BAND = 74_870;

export interface PayeCalculationInput {
  taxablePay: number;
  taxCode: string;
  taxPeriod?: number;
  previousTaxablePay?: number;
  previousTaxPaid?: number;
}

const calculateFlatRateTax = (taxablePay: number, code: string): number | null => {
  if (code.startsWith('BR')) return roundCurrency(taxablePay * 0.2);
  if (code.startsWith('D0')) return roundCurrency(taxablePay * 0.4);
  if (code.startsWith('D1')) return roundCurrency(taxablePay * 0.45);
  if (code.startsWith('NT')) return 0;
  return null;
};

const getAnnualAllowance = (code: string): number => {
  if (code.startsWith('0T')) return 0;
  const match = code.match(/^(\d+)[A-Z]/);
  return match?.[1] ? Number.parseInt(match[1], 10) * 10 + 9 : 12_579;
};

const calculateTaxOnTaxableIncome = (taxableIncome: number, periodFraction: number): number => {
  const basicBand = BASIC_RATE_BAND * periodFraction;
  const higherBand = HIGHER_RATE_BAND * periodFraction;
  const basicTax = Math.min(taxableIncome, basicBand) * 0.2;
  const higherTax = Math.min(Math.max(0, taxableIncome - basicBand), higherBand) * 0.4;
  const additionalTax = Math.max(0, taxableIncome - basicBand - higherBand) * 0.45;
  return roundCurrency(basicTax + higherTax + additionalTax);
};

export const calculatePaye = ({
  taxablePay,
  taxCode,
  taxPeriod = 1,
  previousTaxablePay = 0,
  previousTaxPaid = 0,
}: PayeCalculationInput): number => {
  const cleanCode = taxCode.trim().toUpperCase();
  const flatRateTax = calculateFlatRateTax(taxablePay, cleanCode);
  if (flatRateTax !== null) return flatRateTax;

  const isNonCumulative = /(?:W1|M1|X|NONCUM)/.test(cleanCode);
  const effectivePeriod = isNonCumulative ? 1 : Math.min(12, Math.max(1, taxPeriod));
  const grossTaxableToDate = isNonCumulative ? taxablePay : previousTaxablePay + taxablePay;
  const allowanceToDate = (getAnnualAllowance(cleanCode) * effectivePeriod) / 12;
  const taxableIncome = Math.max(0, Math.floor(grossTaxableToDate - allowanceToDate));
  const taxDueToDate = calculateTaxOnTaxableIncome(taxableIncome, effectivePeriod / 12);

  return isNonCumulative
    ? taxDueToDate
    : Math.max(0, roundCurrency(taxDueToDate - previousTaxPaid));
};

export const calculateMonthlyPaye = (taxablePay: number, taxCode: string): number =>
  calculatePaye({ taxablePay, taxCode });
