/**
 * Precise rounding and mathematical helper utilities for NHS wage calculations.
 * Ensures consistent handling of floating point arithmetic and rounding.
 */

/**
 * Rounds a number to a specified number of decimal places using Number.EPSILON
 * to avoid floating-point representation anomalies.
 */
export function roundToDecimals(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Rounds monetary amounts to 2 decimal places (standard UK GBP currency representation).
 */
export function roundCurrency(val: number): number {
  return roundToDecimals(val, 2);
}

/**
 * Rounds worked or contracted hours to 2 decimal places.
 */
export function roundHours(val: number): number {
  return roundToDecimals(val, 2);
}

/**
 * Rounds hourly rates to 4 decimal places, matching NHS ESR pay scale rate precision.
 */
export function roundHourlyRate(val: number): number {
  return roundToDecimals(val, 4);
}
