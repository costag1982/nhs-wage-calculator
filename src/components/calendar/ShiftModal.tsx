import React, { useState, useMemo } from 'react';
import { Shift, ShiftPresetType, ShiftPreset, ShiftWorkType } from '../../domain/models/Shift';
import { EmployeeProfile, NhsBandLevel } from '../../domain/models/Contract';
import { calculateShiftBreakdown } from '../../domain/services/shiftIntervalCalculator';
import { getHourlyRateForBand } from '../../domain/services/grossPayCalculator';
import {
  ShiftGrossImpact,
  calculateShiftGrossImpact,
} from '../../domain/services/shiftImpactCalculator';
import { getBankHolidayTitle } from '../../domain/constants/bankHolidays';
import { NHS_BAND_CONFIGS } from '../../domain/constants/nhsBands';
import { ShiftTypeSelector } from './shift-modal/ShiftTypeSelector';
import { ShiftTemplatePicker } from './shift-modal/ShiftTemplatePicker';
import { ShiftTimeInputs } from './shift-modal/ShiftTimeInputs';
import { ShiftBandSelector } from './shift-modal/ShiftBandSelector';
import { ShiftBreakdownPreview } from './shift-modal/ShiftBreakdownPreview';
import { SHIFT_PRESETS, ANNUAL_LEAVE_PRESETS } from './shift-modal/shiftModalConstants';
import { X, Trash2, Check, Sparkles, AlertTriangle, Info } from 'lucide-react';

export { calculateShiftGrossImpact };
export type { ShiftGrossImpact };

export interface ShiftModalProps {
  isOpen: boolean;
  selectedDate: string; // "YYYY-MM-DD"
  initialShift?: Shift | null;
  existingShifts?: Shift[];
  hourlyRate: number;
  defaultProfileBand?: NhsBandLevel;
  profile?: EmployeeProfile;
  onClose: () => void;
  onSave: (shiftData: Omit<Shift, 'id' | 'breakdown'>) => void;
  onDelete?: (id: string) => void;
}

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
  profile,
  onClose,
  onSave,
  onDelete,
}) => {
  const [shiftType, setShiftType] = useState<ShiftWorkType>(
    initialShift?.shiftType || 'SUBSTANTIVE'
  );
  const [presetType, setPresetType] = useState<ShiftPresetType>(
    initialShift?.presetType ||
      (initialShift?.shiftType === 'ANNUAL_LEAVE' ? 'ANNUAL_LEAVE_FULL' : 'TWILIGHT')
  );
  const [startTime, setStartTime] = useState<string>(
    initialShift?.startTime || (shiftType === 'ANNUAL_LEAVE' ? '08:00' : '22:00')
  );
  const [endTime, setEndTime] = useState<string>(
    initialShift?.endTime || (shiftType === 'ANNUAL_LEAVE' ? '15:30' : '06:00')
  );
  const [unpaidBreakMinutes, setUnpaidBreakMinutes] = useState<number>(
    initialShift?.unpaidBreakMinutes ?? (shiftType === 'ANNUAL_LEAVE' ? 0 : 30)
  );
  const [overrideBand, setOverrideBand] = useState<string>(initialShift?.overrideBand || '');
  const [customRate, setCustomRate] = useState<string>(
    initialShift?.customHourlyRate ? String(initialShift.customHourlyRate) : ''
  );

  const conflictingShift = useMemo(() => {
    if (!existingShifts) return null;
    return existingShifts.find((s) => s.date === selectedDate && s.id !== initialShift?.id) || null;
  }, [existingShifts, selectedDate, initialShift]);

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

  const handleSwitchShiftType = (newType: ShiftWorkType) => {
    setShiftType(newType);
    if (newType === 'ANNUAL_LEAVE') {
      setPresetType('ANNUAL_LEAVE_FULL');
      setStartTime('08:00');
      setEndTime('15:30');
      setUnpaidBreakMinutes(0);
      setOverrideBand('');
    } else if (shiftType === 'ANNUAL_LEAVE') {
      setPresetType('TWILIGHT');
      setStartTime('22:00');
      setEndTime('06:00');
      setUnpaidBreakMinutes(30);
    }
  };

  const breakdown = useMemo(() => {
    return calculateShiftBreakdown({
      id: 'preview',
      date: selectedDate,
      startTime,
      endTime,
      unpaidBreakMinutes,
      shiftType,
    });
  }, [selectedDate, startTime, endTime, unpaidBreakMinutes, shiftType]);

  const effectiveBand = (overrideBand || defaultProfileBand) as NhsBandLevel;
  const effectiveRate = useMemo(() => {
    if (overrideBand === 'Custom' && customRate) {
      return Number(customRate) || hourlyRate;
    }
    if (overrideBand && overrideBand !== 'Custom') {
      return getHourlyRateForBand(overrideBand as NhsBandLevel);
    }
    return hourlyRate;
  }, [overrideBand, customRate, hourlyRate]);

  const bandConfig = NHS_BAND_CONFIGS[effectiveBand] || NHS_BAND_CONFIGS['Band 2'];

  const payslipImpact = useMemo(() => {
    return calculateShiftGrossImpact(
      {
        date: selectedDate,
        shiftType,
        breakdown,
        effectiveRate,
        bandConfig,
        initialShiftId: initialShift?.id,
      },
      existingShifts || [],
      profile
    );
  }, [
    selectedDate,
    shiftType,
    breakdown,
    effectiveRate,
    bandConfig,
    initialShift,
    existingShifts,
    profile,
  ]);

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

  const modalTitle = initialShift
    ? shiftType === 'ANNUAL_LEAVE'
      ? 'Edit Annual Leave'
      : 'Edit Shift'
    : shiftType === 'ANNUAL_LEAVE'
      ? 'Book Annual Leave'
      : conflictingShift
        ? 'Replace Shift'
        : 'Add Shift';

  const saveButtonLabel = initialShift
    ? shiftType === 'ANNUAL_LEAVE'
      ? 'Update Leave'
      : 'Update Shift'
    : shiftType === 'ANNUAL_LEAVE'
      ? 'Book Leave'
      : conflictingShift
        ? 'Replace & Save'
        : 'Save Shift';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{modalTitle}</h2>
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
                  An entry ({conflictingShift.startTime} - {conflictingShift.endTime}) is already
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
                <span>
                  {shiftType === 'ANNUAL_LEAVE'
                    ? `UK Bank Holiday: ${bankHolidayName} (Booking leave deducts hours from your entitlement pot)`
                    : `UK Bank Holiday: ${bankHolidayName} (Paid at +83% unsocial rate)`}
                </span>
              </div>
            )}

            <ShiftTypeSelector shiftType={shiftType} onSelectType={handleSwitchShiftType} />

            {shiftType !== 'ANNUAL_LEAVE' ? (
              <ShiftTemplatePicker
                presetType={presetType}
                presets={SHIFT_PRESETS}
                label="Shift Template"
                onSelectPreset={handleSelectPreset}
              />
            ) : (
              <ShiftTemplatePicker
                presetType={presetType}
                presets={ANNUAL_LEAVE_PRESETS}
                label="Leave Duration"
                onSelectPreset={handleSelectPreset}
              />
            )}

            {presetType === 'CUSTOM' && (
              <ShiftTimeInputs
                startTime={startTime}
                endTime={endTime}
                endTimeError={endTimeError}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            )}

            {shiftType === 'ANNUAL_LEAVE' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem',
                  padding: '0.55rem 0.75rem',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  color: '#166534',
                  lineHeight: 1.4,
                }}
              >
                <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>NHS AfC Leave Rule:</strong> 1 full day of leave ={' '}
                  <strong>7.5 hours</strong> (half day = <strong>3.75 hours</strong>). Regular
                  non-working <strong>Days Off (DO)</strong> do not need to be booked as leave.
                </span>
              </div>
            )}

            {shiftType !== 'ANNUAL_LEAVE' && (
              <ShiftBandSelector
                overrideBand={overrideBand}
                customRate={customRate}
                defaultProfileBand={defaultProfileBand}
                hourlyRate={hourlyRate}
                unpaidBreakMinutes={unpaidBreakMinutes}
                onOverrideBandChange={setOverrideBand}
                onCustomRateChange={setCustomRate}
                onUnpaidBreakChange={setUnpaidBreakMinutes}
              />
            )}

            <ShiftBreakdownPreview
              shiftType={shiftType}
              overrideBand={overrideBand}
              effectiveRate={effectiveRate}
              breakdown={breakdown}
              bandConfig={bandConfig}
              payslipImpact={payslipImpact}
            />
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
                {saveButtonLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
