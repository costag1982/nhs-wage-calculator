export interface RecurringCommitment {
  id: string;
  name: string;
  amount: number;
  isPreTax?: boolean; // E.g. Salary sacrifice vs Net deduction
  description?: string;
}

export interface DeductionBreakdownItem {
  name: string;
  amount: number;
  balanceOrDetails?: string;
  isPreTax?: boolean;
}

export interface DeductionsSummary {
  payeTax: number;
  nationalInsurance: number;
  pensionContribution: number;
  commitments: DeductionBreakdownItem[];
  totalDeductions: number;
}
