import { UK_MONTHLY_PERSONAL_ALLOWANCE, UK_MONTHLY_TAX_BANDS } from '../constants/taxConfig';
import { roundCurrency } from '../utils/mathUtils';

const calculateFlatRateTax = (taxablePay: number, code: string): number | null => {
  if (code.startsWith('BR')) {
    return roundCurrency(taxablePay * 0.2); // Basic rate 20%
  }
  if (code.startsWith('D0')) {
    return roundCurrency(taxablePay * 0.4); // Higher rate 40%
  }
  if (code.startsWith('D1')) {
    return roundCurrency(taxablePay * 0.45); // Additional rate 45%
  }
  if (code.startsWith('NT')) {
    return 0; // No tax
  }
  return null;
};

const getMonthlyAllowance = (code: string): number => {
  if (code.startsWith('0T')) {
    return 0;
  }

  const match = code.match(/^(\d+)[A-Z]/);
  if (match && match[1]) {
    const annualAllowance = parseInt(match[1], 10) * 10 + 9;
    return annualAllowance / 12;
  }

  return UK_MONTHLY_PERSONAL_ALLOWANCE;
};

const calculateGraduatedTax = (taxableAmount: number): number => {
  let remainingTaxable = taxableAmount;
  let totalTax = 0;
  let previousThreshold = 0;

  for (const band of UK_MONTHLY_TAX_BANDS) {
    const bandWidth = band.monthlyThreshold - previousThreshold;
    const taxableInBand = Math.min(remainingTaxable, bandWidth);

    if (taxableInBand > 0) {
      totalTax += taxableInBand * band.rate;
      remainingTaxable -= taxableInBand;
    }

    if (remainingTaxable <= 0) break;
    previousThreshold = band.monthlyThreshold;
  }

  return roundCurrency(totalTax);
};

export const calculateMonthlyPaye = (taxablePay: number, taxCode: string): number => {
  const cleanCode = taxCode.trim().toUpperCase();

  // 1. Check flat rate / special codes
  const flatRateTax = calculateFlatRateTax(taxablePay, cleanCode);
  if (flatRateTax !== null) {
    return flatRateTax;
  }

  // 2. Compute personal allowance & taxable amount
  const monthlyAllowance = getMonthlyAllowance(cleanCode);

  // Per HMRC PAYE Tax Tables (Table A/B monthly):
  // The taxable pay and allowance are processed in whole pounds (truncated)
  const wholeTaxablePay = Math.floor(taxablePay);
  const wholeAllowance = Math.floor(monthlyAllowance);
  const taxableAmount = Math.max(0, wholeTaxablePay - wholeAllowance);
  if (taxableAmount <= 0) {
    return 0;
  }

  // 3. Apply UK progressive tax bands
  return calculateGraduatedTax(taxableAmount);
};
