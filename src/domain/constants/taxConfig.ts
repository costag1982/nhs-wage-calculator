export interface TaxBand {
  name: string;
  monthlyThreshold: number; // upper limit for band
  rate: number;
}

export const UK_ANNUAL_PERSONAL_ALLOWANCE = 12570;
export const UK_MONTHLY_PERSONAL_ALLOWANCE = UK_ANNUAL_PERSONAL_ALLOWANCE / 12; // £1047.50

export const UK_MONTHLY_TAX_BANDS: TaxBand[] = [
  { name: 'Basic Rate (20%)', monthlyThreshold: 4189.17, rate: 0.2 },
  { name: 'Higher Rate (40%)', monthlyThreshold: 10428.33, rate: 0.4 },
  { name: 'Additional Rate (45%)', monthlyThreshold: Infinity, rate: 0.45 },
];

export const UK_NI_CLASS_1_A = {
  monthlyLowerEarningsLimit: 533.0,
  monthlyPrimaryThreshold: 1048.0,
  monthlyUpperEarningsLimit: 4189.0,
  mainRate: 0.08, // 8%
  higherRate: 0.02, // 2%
};

export interface NhsPensionTier {
  minAnnualEarnings: number;
  maxAnnualEarnings: number;
  rate: number;
}

export const NHS_PENSION_TIERS: NhsPensionTier[] = [
  { minAnnualEarnings: 0, maxAnnualEarnings: 13245.99, rate: 0.052 },
  { minAnnualEarnings: 13246, maxAnnualEarnings: 17316.99, rate: 0.065 },
  { minAnnualEarnings: 17317, maxAnnualEarnings: 24022.99, rate: 0.065 },
  { minAnnualEarnings: 24023, maxAnnualEarnings: 25147.99, rate: 0.065 },
  { minAnnualEarnings: 25148, maxAnnualEarnings: 31349.99, rate: 0.083 },
  { minAnnualEarnings: 31350, maxAnnualEarnings: 49245.99, rate: 0.098 },
  { minAnnualEarnings: 49246, maxAnnualEarnings: 62925.99, rate: 0.107 },
  { minAnnualEarnings: 62926, maxAnnualEarnings: Infinity, rate: 0.125 },
];
