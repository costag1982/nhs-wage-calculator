import React, { useState, useMemo } from 'react';
import {
  Shift,
  ShiftPresetType,
  ShiftPreset,
  ShiftHoursBreakdown,
  ShiftWorkType,
} from '../../domain/models/Shift';
import { NhsBandLevel } from '../../domain/models/Contract';
import { ShiftIntervalCalculator } from '../../domain/services/ShiftIntervalCalculator';
import { GrossPayCalculator } from '../../domain/services/GrossPayCalculator';
import { getBankHolidayTitle } from '../../domain/constants/bankHolidays';
import { NHS_BAND_CONFIGS, NhsBandConfig } from '../../domain/constants/nhsBands';
import {
  X,
  Trash2,
  Check,
  Clock,
  Sparkles,
  Coins,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';


interface ShiftModalProps {
  isOpen: boolean;
  selectedDate: string; // "YYYY-MM-DD"
  initialShift?: Shift | null;
  existingShifts?: Shift[];
  hourlyRate: number;
  defaultProfileBand?: NhsBandLevel;
  onClose: () => void;
  onSave: (shiftData: Omit<Shift, 'id' | 'breakdown'>) => void;
  onDelete?: (id: string) => void;
}

const SHIFT_PRESETS: ShiftPreset[] = [
  {
    id: 'TWILIGHT',
    label: 'Twilight',
    startTime: '22:00',
    endTime: '06:00',
    unpaidBreakMinutes: 30,
    description: '22:00 - 06:00 (Night Duty)',
  },
  {
    id: 'HALF_TWILIGHT',
    label: 'Half Twilight',
    startTime: '22:00',
    endTime: '02:00',
    unpaidBreakMinutes: 0,
    description: '22:00 - 02:00 (4h Night)',
  },
  {
    id: 'MORNING',
    label: 'Morning',
    startTime: '07:30',
    endTime: '15:30',
    unpaidBreakMinutes: 30,
    description: '07:30 - 15:30 (Day)',
  },
  {
    id: 'LONG_DAY',
    label: 'Long Day',
    startTime: '12:00',
    endTime: '20:30',
    unpaidBreakMinutes: 30,
    description: '12:00 - 20:30 (Day & Unsocial)',
  },
  {
    id: 'EVENING',
    label: 'Evening',
    startTime: '16:00',
    endTime: '21:30',
    unpaidBreakMinutes: 30,
    description: '16:00 - 21:30 (Evening)',
  },
  {
    id: 'CUSTOM',
    label: 'Custom',
    startTime: '08:00',
    endTime: '16:00',
    unpaidBreakMinutes: 30,
    description: 'Enter custom times',
  },
];

const BAND_OVERRIDE_OPTIONS = [
  { band: 'Band 2', label: 'Band 2 (£12.92/hr)' },
  { band: 'Band 3', label: 'Band 3 (£13.55/hr - Higher Band / Acting Up)' },
  { band: 'Band 4', label: 'Band 4 (£14.53/hr)' },
  { band: 'Band 5', label: 'Band 5 (£15.87/hr)' },
  { band: 'Band 6', label: 'Band 6 (£19.64/hr)' },
  { band: 'Band 7', label: 'Band 7 (£24.10/hr)' },
  { band: 'Band 8a', label: 'Band 8a (£28.13/hr)' },
];

export const ShiftModal: React.FC<ShiftModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <ShiftModalContent
      key={`${props.selectedDate}-${props.initialShift?.id || 'new'}`}
      {...props}
    />
  );
};

const ShiftModalContent: React.FC<ShiftModalProps> = ({
  selectedDate,
  initialShift,
  existingShifts,
  hourlyRate,
  defaultProfileBand = 'Band 2',
  onClose,
  onSave,
  onDelete,
}) => {
  const [presetType, setPresetType] = useState<ShiftPresetType>(
    initialShift?.presetType || 'TWILIGHT'
  );
  const [shiftType, setShiftType] = useState<ShiftWorkType>(
    initialShift?.shiftType || 'SUBSTANTIVE'
  );
  const [startTime, setStartTime] = useState<string>(initialShift?.startTime || '22:00');
  const [endTime, setEndTime] = useState<string>(initialShift?.endTime || '06:00');
  const [unpaidBreakMinutes, setUnpaidBreakMinutes] = useState<number>(
    initialShift?.unpaidBreakMinutes ?? 30
  );
  const [overrideBand, setOverrideBand] = useState<string>(initialShift?.overrideBand || '');
  const [customRate, setCustomRate] = useState<string>(
    initialShift?.customHourlyRate ? String(initialShift.customHourlyRate) : ''
  );

  // Detect if another shift is already scheduled for this date
  const conflictingShift = useMemo(() => {
    if (!existingShifts) return null;
    return existingShifts.find((s) => s.date === selectedDate && s.id !== initialShift?.id) || null;
  }, [existingShifts, selectedDate, initialShift]);

  // End time cannot equal start time
  const endTimeError = useMemo(() => {
    if (startTime && endTime && startTime === endTime) {
      return 'Finish time cannot be the same as start time.';
    }
    return null;
  }, [startTime, endTime]);

  const handleSelectPreset = (preset: ShiftPreset) => {
    setPresetType(preset.id);
    if (preset.id !== 'CUSTOM') {
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
      setUnpaidBreakMinutes(preset.unpaidBreakMinutes);
    }
  };

  // Live breakdown calculation
  const breakdown = useMemo(() => {
    return ShiftIntervalCalculator.calculateBreakdown({
      id: 'preview',
      date: selectedDate,
      startTime,
      endTime,
      unpaidBreakMinutes,
    });
  }, [selectedDate, startTime, endTime, unpaidBreakMinutes]);

  // Effective hourly rate and band rules for this specific shift
  const effectiveBand = (overrideBand || defaultProfileBand) as NhsBandLevel;
  const effectiveRate = useMemo(() => {
    if (overrideBand === 'Custom' && customRate) {
      return Number(customRate) || hourlyRate;
    }
    if (overrideBand && overrideBand !== 'Custom') {
      return GrossPayCalculator.getHourlyRateForBand(overrideBand as NhsBandLevel);
    }
    return hourlyRate;
  }, [overrideBand, customRate, hourlyRate]);

  const bandConfig = NHS_BAND_CONFIGS[effectiveBand] || NHS_BAND_CONFIGS['Band 2'];

  // Estimated shift earnings (Basic + Unsocial enhancements)
  const estimatedShiftEarnings = useMemo(() => {
    return calculateEstimatedShiftEarnings(breakdown, effectiveRate, bandConfig);
  }, [breakdown, effectiveRate, bandConfig]);

  const bankHolidayName = useMemo(() => {
    return getBankHolidayTitle(selectedDate);
  }, [selectedDate]);

  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return dateObj.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }, [selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (endTimeError) return;
    onSave({
      date: selectedDate,
      startTime,
      endTime,
      unpaidBreakMinutes,
      presetType,
      shiftType,
      overrideBand: overrideBand ? (overrideBand as NhsBandLevel) : undefined,
      customHourlyRate: overrideBand === 'Custom' && customRate ? Number(customRate) : undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {initialShift ? 'Edit Shift' : conflictingShift ? 'Replace Shift' : 'Add Shift'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formattedDate}</p>
          </div>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onClose}
            aria-label="Close dialogue"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {conflictingShift && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid var(--amber-border)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  color: '#b45309',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} />
                <span>
                  A shift ({conflictingShift.startTime} - {conflictingShift.endTime}) is already
                  scheduled for this day. Saving will update and replace it so you do not have
                  duplicates.
                </span>
              </div>
            )}

            {bankHolidayName && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid var(--rose-border)',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--rose)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Sparkles size={16} />
                <span>UK Bank Holiday: {bankHolidayName} (Paid at +83% unsocial rate)</span>
              </div>
            )}

            {/* Shift Work / Contract Type Selector */}
            <div className="form-group">
              <label className="form-label">
                <Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Contract & Work Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`preset-btn ${shiftType === 'SUBSTANTIVE' ? 'active' : ''}`}
                  onClick={() => setShiftType('SUBSTANTIVE')}
                  style={{ textAlign: 'left', alignItems: 'flex-start', padding: '0.6rem 0.75rem' }}
                >
                  <span style={{ fontWeight: 700 }}>Substantive Shift</span>
                  <span className="preset-btn-time">
                    Contracted post (counts towards 26h additional hours)
                  </span>
                </button>
                <button
                  type="button"
                  className={`preset-btn ${shiftType === 'BANK' ? 'active' : ''}`}
                  onClick={() => setShiftType('BANK')}
                  style={{ textAlign: 'left', alignItems: 'flex-start', padding: '0.6rem 0.75rem' }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--indigo)' }}>Bank Shift</span>
                  <span className="preset-btn-time">
                    Paid at Bank Hourly Rate (excluded from 26h threshold)
                  </span>
                </button>
              </div>
            </div>

            {/* Shift Presets */}
            <div className="form-group">
              <label className="form-label">Shift Template</label>
              <div className="preset-buttons-grid">
                {SHIFT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-btn ${presetType === preset.id ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    <span>{preset.label}</span>
                    {preset.id !== 'CUSTOM' && (
                      <span className="preset-btn-time">
                        {preset.startTime} - {preset.endTime}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Pickers */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="start-time">
                  Start Time
                </label>
                <input
                  id="start-time"
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setPresetType('CUSTOM');
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="end-time">
                  Finish Time
                </label>
                <input
                  id="end-time"
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setPresetType('CUSTOM');
                  }}
                  required
                />
              </div>
            </div>

            {endTimeError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--rose)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginTop: '-0.25rem',
                }}
              >
                <AlertTriangle size={14} />
                {endTimeError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="shift-band">
                <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Pay Band for this Shift (Optional Override / Acting Up)
              </label>
              <select
                id="shift-band"
                className="form-select"
                value={overrideBand}
                onChange={(e) => setOverrideBand(e.target.value)}
              >
                <option value="">
                  Default from Settings ({defaultProfileBand} - £{hourlyRate.toFixed(2)}/hr)
                </option>
                {BAND_OVERRIDE_OPTIONS.filter((item) => item.band !== defaultProfileBand).map(
                  (item) => (
                    <option key={item.band} value={item.band}>
                      {item.label}
                    </option>
                  )
                )}
                <option value="Custom">Custom Hourly Rate (£/hr)</option>
              </select>
            </div>

            {overrideBand === 'Custom' && (
              <div className="form-group">
                <label className="form-label" htmlFor="custom-shift-rate">
                  Custom Shift Hourly Rate (£/hr)
                </label>
                <input
                  id="custom-shift-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 15.50"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Unpaid Break */}
            <div className="form-group">
              <label className="form-label" htmlFor="unpaid-break">
                Unpaid Break (Minutes)
              </label>
              <select
                id="unpaid-break"
                className="form-select"
                value={unpaidBreakMinutes}
                onChange={(e) => setUnpaidBreakMinutes(Number(e.target.value))}
              >
                <option value={0}>0 minutes (No unpaid break)</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes (Standard NHS break)</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 hour break)</option>
              </select>
            </div>

            {/* Live Calculation Preview Box */}
            <div className="shift-preview-box">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <div className="shift-preview-header" style={{ margin: 0 }}>
                  <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Calculated Shift Breakdown
                  {shiftType === 'BANK' && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#4338ca',
                        background: '#e0e7ff',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      Bank Shift
                    </span>
                  )}
                  {overrideBand && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--nhs-blue)',
                        background: '#e0f2fe',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {overrideBand} (£{effectiveRate.toFixed(2)}/hr)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--emerald)' }}>
                  <Coins size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  ~£{estimatedShiftEarnings.toFixed(2)} estimated
                </div>
              </div>
              {shiftType === 'BANK' && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--indigo)',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                  }}
                >
                  ℹ️ Excluded from substantive 26h additional-hours calculation (paid as Bank Hourly Pay).
                </div>
              )}
              <div className="preview-pill-list">
                <div className="preview-pill">
                  Total Paid: <strong>{breakdown.totalWorkedHours} hrs</strong>
                </div>
                {breakdown.plainDayHours > 0 && (
                  <div className="preview-pill">
                    Day: <strong>{breakdown.plainDayHours}h</strong>
                  </div>
                )}
                {breakdown.nightHours > 0 && (
                  <div className="preview-pill" style={{ borderColor: 'var(--indigo-border)' }}>
                    🌙 Night (+{(bandConfig.nightEnhancementRate * 100).toFixed(0)}%):{' '}
                    <strong>{breakdown.nightHours}h</strong>
                  </div>
                )}
                {breakdown.saturdayHours > 0 && (
                  <div className="preview-pill" style={{ borderColor: 'var(--rose-border)' }}>
                    Saturday (+{(bandConfig.saturdayEnhancementRate * 100).toFixed(0)}%):{' '}
                    <strong>{breakdown.saturdayHours}h</strong>
                  </div>
                )}
                {breakdown.sundayHours > 0 && (
                  <div className="preview-pill" style={{ borderColor: 'var(--emerald-border)' }}>
                    Sunday (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}%):{' '}
                    <strong>{breakdown.sundayHours}h</strong>
                  </div>
                )}
                {breakdown.bankHolidayHours > 0 && (
                  <div className="preview-pill" style={{ borderColor: 'var(--amber-border)' }}>
                    Bank Hol (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}%):{' '}
                    <strong>{breakdown.bankHolidayHours}h</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            {initialShift && onDelete ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onDelete(initialShift.id);
                  onClose();
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!!endTimeError}>
                <Check size={16} />
                {initialShift ? 'Update Shift' : conflictingShift ? 'Replace & Save' : 'Save Shift'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

function calculateEstimatedShiftEarnings(
  breakdown: ShiftHoursBreakdown,
  effectiveRate: number,
  bandConfig: NhsBandConfig
): number {
  const baseValue = breakdown.totalWorkedHours * effectiveRate;
  const nightTopUp = breakdown.nightHours * (effectiveRate * bandConfig.nightEnhancementRate);
  const satTopUp = breakdown.saturdayHours * (effectiveRate * bandConfig.saturdayEnhancementRate);
  const sunTopUp =
    breakdown.sundayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);
  const bhTopUp =
    breakdown.bankHolidayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);
  return baseValue + nightTopUp + satTopUp + sunTopUp + bhTopUp;
}
