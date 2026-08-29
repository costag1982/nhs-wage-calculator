import { describe, it, expect } from 'vitest';
import {
  roundCurrency,
  roundHours,
  roundHourlyRate,
  roundToDecimals,
  formatHours,
} from '../domain/utils/mathUtils';

describe('mathUtils', () => {
  describe('roundCurrency', () => {
    it('rounds currency amounts to 2 decimal places with EPSILON accuracy', () => {
      expect(roundCurrency(12.92446)).toBe(12.92);
      expect(roundCurrency(1460.158)).toBe(1460.16);
      expect(roundCurrency(1955.85)).toBe(1955.85);
      expect(roundCurrency(0.004)).toBe(0.0);
      expect(roundCurrency(0.005)).toBe(0.01);
    });
  });

  describe('roundHours', () => {
    it('rounds hours to 2 decimal places', () => {
      expect(roundHours(7.5)).toBe(7.5);
      expect(roundHours(11.333333)).toBe(11.33);
      expect(roundHours(18.675)).toBe(18.68);
    });
  });

  describe('formatHours', () => {
    it('formats hours accurately without rounding to whole integers', () => {
      expect(formatHours(112.98)).toBe('112.98');
      expect(formatHours(113)).toBe('113');
      expect(formatHours(112.978)).toBe('112.98');
      expect(formatHours(7.5)).toBe('7.5');
      expect(formatHours(44.0)).toBe('44');
      expect(formatHours(0)).toBe('0');
      expect(formatHours(29.48)).toBe('29.48');
    });
  });

  describe('roundHourlyRate', () => {
    it('rounds hourly rate to 4 decimal places for NHS ESR standard', () => {
      // 25272 / (52.142857 * 37.5) = 12.92446...
      expect(roundHourlyRate(12.924464)).toBe(12.9245);
      expect(roundHourlyRate(13.55248)).toBe(13.5525);
    });
  });

  describe('roundToDecimals', () => {
    it('rounds to custom decimal precision', () => {
      expect(roundToDecimals(3.14159, 3)).toBe(3.142);
      expect(roundToDecimals(3.14159, 1)).toBe(3.1);
      expect(roundToDecimals(3.14159, 0)).toBe(3);
    });
  });
});

