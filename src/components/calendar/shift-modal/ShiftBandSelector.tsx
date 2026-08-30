import React from 'react';
import { NhsBandLevel } from '../../../domain/models/Contract';
import { BAND_OVERRIDE_OPTIONS } from './shiftModalConstants';
import { ShieldCheck } from 'lucide-react';

interface ShiftBandSelectorProps {
  overrideBand: string;
  customRate: string;
  defaultProfileBand: NhsBandLevel;
  hourlyRate: number;
  unpaidBreakMinutes: number;
  onOverrideBandChange: (band: string) => void;
  onCustomRateChange: (rate: string) => void;
  onUnpaidBreakChange: (breakMins: number) => void;
}

export const ShiftBandSelector: React.FC<ShiftBandSelectorProps> = ({
  overrideBand,
  customRate,
  defaultProfileBand,
  hourlyRate,
  unpaidBreakMinutes,
  onOverrideBandChange,
  onCustomRateChange,
  onUnpaidBreakChange,
}) => {
  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="shift-band-override">
          <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
          Pay Band for this Shift (Optional Override / Acting Up)
        </label>
        <select
          id="shift-band-override"
          className="form-select"
          value={overrideBand}
          onChange={(e) => onOverrideBandChange(e.target.value)}
        >
          <option value="">
            Default from Settings ({defaultProfileBand} - £{hourlyRate.toFixed(2)}/hr)
          </option>
          {BAND_OVERRIDE_OPTIONS.filter((item) => item.band !== defaultProfileBand).map((item) => (
            <option key={item.band} value={item.band}>
              {item.label}
            </option>
          ))}
          <option value="Custom">Custom Hourly Rate (£/hr)</option>
        </select>
      </div>

      {overrideBand === 'Custom' && (
        <div className="form-group">
          <label className="form-label" htmlFor="shift-modal-custom-rate">
            Custom Shift Hourly Rate (£/hr)
          </label>
          <input
            id="shift-modal-custom-rate"
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            placeholder="e.g. 15.50"
            value={customRate}
            onChange={(e) => onCustomRateChange(e.target.value)}
            required
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="shift-modal-unpaid-break">
          Unpaid Break (Minutes)
        </label>
        <select
          id="shift-modal-unpaid-break"
          className="form-select"
          value={unpaidBreakMinutes}
          onChange={(e) => onUnpaidBreakChange(Number(e.target.value))}
        >
          <option value={0}>0 minutes (No unpaid break)</option>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes (Standard NHS break)</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes (1 hour break)</option>
        </select>
      </div>
    </>
  );
};
