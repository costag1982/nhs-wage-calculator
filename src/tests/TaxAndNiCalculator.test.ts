import { describe, it, expect } from 'vitest';
import { TaxCalculator } from '../domain/services/TaxCalculator';
import { NationalInsuranceCalculator } from '../domain/services/NationalInsuranceCalculator';
import { PensionCalculator } from '../domain/services/PensionCalculator';

describe('Tax, NI and Pension Calculators', () => {
  it('calculates 6.5% NHS pension contribution accurately', () => {
    const pensionablePay = 1955.85;
    const contribution = PensionCalculator.calculateContribution(pensionablePay, 0.065);
    expect(contribution).toBe(127.13);
  });

  it('calculates National Insurance Category A accurately', () => {
    const grossPay = 1955.85;
    // Primary threshold = £1,048.00. Excess = £907.85. 8% of £907.85 = £72.628 -> £72.63
    const ni = NationalInsuranceCalculator.calculateClass1CategoryA(grossPay);
    expect(ni).toBe(72.63);
  });

  it('calculates PAYE for standard 1257L tax code', () => {
    const taxablePay = 1828.72;
    // Monthly allowance = 12579 / 12 = £1,048.25 (£1,048 whole). Taxable portion = £1,828 - £1,048 = £780. 20% = £156.00
    const tax = TaxCalculator.calculateMonthlyPaye(taxablePay, '1257L CUMUL');
    expect(tax).toBe(156.0);
  });

  it('calculates PAYE for BR tax code (flat 20%)', () => {
    const taxablePay = 1000.0;
    const tax = TaxCalculator.calculateMonthlyPaye(taxablePay, 'BR');
    expect(tax).toBe(200.0);
  });
});
