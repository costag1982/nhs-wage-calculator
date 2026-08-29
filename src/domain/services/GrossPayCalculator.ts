import { EmployeeProfile, NhsBandLevel } from '../models/Contract';
import { NHS_ANNUAL_WEEKS, NHS_STANDARD_FTE_HOURS, NHS_BAND_CONFIGS } from '../constants/nhsBands';
import { roundCurrency, roundHours, roundHourlyRate } from '../utils/mathUtils';

export interface GrossPayResult {
  hourlyRate: number;
  annualProRataSalary: number;
  monthlyBasicHours: number;
  monthlyBasicPay: number;
}

export class GrossPayCalculator {
  public static getHourlyRateForBand(band: NhsBandLevel): number {
    const config = NHS_BAND_CONFIGS[band] || NHS_BAND_CONFIGS['Band 2'];
    return roundHourlyRate(config.defaultFteSalary / (NHS_ANNUAL_WEEKS * NHS_STANDARD_FTE_HOURS));
  }

  public static calculateBaseRates(profile: EmployeeProfile): GrossPayResult {
    const fteHours = profile.standardFullTimeHours || NHS_STANDARD_FTE_HOURS;
    const contractedHours = profile.contractedWeeklyHours || fteHours;
    const annualWeeks = NHS_ANNUAL_WEEKS;

    // Hourly rate standard formula in NHS ESR:
    // Annual FTE / (52.143 * 37.5) = Rate/hr (e.g. 25272 / 1955.3625 = 12.92446 -> 12.9245)
    const calculatedHourlyRate =
      profile.customHourlyRate ?? profile.fullTimeSalaryFte / (annualWeeks * fteHours);
    const hourlyRate = roundHourlyRate(calculatedHourlyRate);

    // Pro-rata annual salary
    const annualProRataSalary = roundCurrency(
      profile.fullTimeSalaryFte * (contractedHours / fteHours)
    );

    // Monthly basic pay
    const monthlyBasicPay = roundCurrency(annualProRataSalary / 12);

    // Monthly basic hours
    const monthlyBasicHours = roundHours(monthlyBasicPay / hourlyRate);

    return {
      hourlyRate,
      annualProRataSalary,
      monthlyBasicHours,
      monthlyBasicPay,
    };
  }
}
