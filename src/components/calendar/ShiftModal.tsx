import React, { useState, useMemo } from 'react';
import {
  Shift,
  ShiftPresetType,
  ShiftPreset,
  ShiftWorkType,
  ShiftStatus,
} from '../../domain/models/Shift';
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
import { formatEpisodeDateRange } from '../../domain/services/annualLeaveCalculator';
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
  onSaveBatch?: (shiftsData: Omit<Shift, 'id' | 'breakdown'>[]) => void;
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
  onSaveBatch,
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
  const [unpaidBreakStartTime, setUnpaidBreakStartTime] = useState<string>(
    initialShift?.unpaidBreakStartTime || ''
  );
  const [overrideBand, setOverrideBand] = useState<string>(initialShift?.overrideBand || '');
  const [customRate, setCustomRate] = useState<string>(
    initialShift?.customHourlyRate ? String(initialShift.customHourlyRate) : ''
  );
  const [customEnhancementRate, setCustomEnhancementRate] = useState<string>(
    initialShift?.customEnhancementHourlyRate
      ? String(initialShift.customEnhancementHourlyRate)
      : ''
  );
  const [holidayPayRate, setHolidayPayRate] = useState<string>(
    initialShift?.holidayPayHourlyRate ? String(initialShift.holidayPayHourlyRate) : ''
  );
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>(initialShift?.status || 'APPROVED');
  const [bookingMode, setBookingMode] = useState<'SINGLE' | 'BLOCK'>('SINGLE');
  const [blockStartDate, setBlockStartDate] = useState<string>(selectedDate || '');
  const [blockEndDate, setBlockEndDate] = useState<string>(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + 6)); // default 7-day period
    return end.toISOString().slice(0, 10);
  });
  const [blockDeductionType, setBlockDeductionType] = useState<
    'CONTRACTED_WEEK' | 'DAILY_PRESET' | 'CUSTOM_HOURS'
  >('CONTRACTED_WEEK');
  const [blockCustomHours, setBlockCustomHours] = useState<string>(
    String(profile?.contractedWeeklyHours || 26.0)
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
      unpaidBreakStartTime: unpaidBreakStartTime || undefined,
      shiftType,
    });
  }, [selectedDate, startTime, endTime, unpaidBreakMinutes, unpaidBreakStartTime, shiftType]);

  const blockDaysCount = useMemo(() => {
    if (!blockStartDate || !blockEndDate) return 1;
    const start = new Date(`${blockStartDate}T00:00:00`);
    const end = new Date(`${blockEndDate}T00:00:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [blockStartDate, blockEndDate]);

  const blockTotalHours = useMemo(() => {
    if (blockDeductionType === 'CONTRACTED_WEEK') {
      const contractedWeekly = profile?.contractedWeeklyHours || 26.0;
      const weeks = blockDaysCount / 7;
      return Math.round(weeks * contractedWeekly * 10) / 10;
    }
    if (blockDeductionType === 'CUSTOM_HOURS') {
      return parseFloat(blockCustomHours) || 0;
    }
    return Math.round(breakdown.totalWorkedHours * blockDaysCount * 10) / 10;
  }, [
    blockDeductionType,
    blockDaysCount,
    profile?.contractedWeeklyHours,
    blockCustomHours,
    breakdown.totalWorkedHours,
  ]);

  const generateDatesInRange = (startStr: string, endStr: string): string[] => {
    const dates: string[] = [];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const curr = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));

    while (curr <= end) {
      dates.push(curr.toISOString().slice(0, 10));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return dates;
  };

  const effectiveBand = (overrideBand || defaultProfileBand) as NhsBandLevel;
  const effectiveRate = useMemo(() => {
    if ((overrideBand === 'Custom' || shiftType === 'BANK') && customRate) {
      return Number(customRate) || hourlyRate;
    }
    if (overrideBand && overrideBand !== 'Custom') {
      return getHourlyRateForBand(overrideBand as NhsBandLevel);
    }
    return hourlyRate;
  }, [overrideBand, customRate, hourlyRate, shiftType]);

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
    if (endTimeError && bookingMode === 'SINGLE') return;

    if (shiftType === 'ANNUAL_LEAVE' && bookingMode === 'BLOCK') {
      const dates = generateDatesInRange(blockStartDate, blockEndDate);
      const totalH = blockTotalHours;
      const count = dates.length;
      let remainingH = totalH;

      const batchShifts: Omit<Shift, 'id' | 'breakdown'>[] = dates.map((dateStr, idx) => {
        const dayH =
          idx === count - 1 ? remainingH : Math.round((remainingH / (count - idx)) * 10) / 10;
        remainingH = Math.max(0, Math.round((remainingH - dayH) * 10) / 10);

        const totalMinutes = Math.round(dayH * 60);
        const endHours = 8 + Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const formattedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        return {
          date: dateStr,
          startTime: '08:00',
          endTime: formattedEndTime,
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
          presetType: 'CUSTOM',
          status: shiftStatus,
        };
      });

      if (onSaveBatch) {
        onSaveBatch(batchShifts);
      } else {
        batchShifts.forEach((s) => onSave(s));
      }
      onClose();
      return;
    }

    onSave({
      date: selectedDate,
      startTime,
      endTime,
      unpaidBreakMinutes,
      unpaidBreakStartTime: unpaidBreakStartTime || undefined,
      presetType,
      shiftType,
      overrideBand: overrideBand ? (overrideBand as NhsBandLevel) : undefined,
      customHourlyRate:
        (overrideBand === 'Custom' || shiftType === 'BANK') && customRate
          ? Number(customRate)
          : undefined,
      customEnhancementHourlyRate:
        shiftType === 'BANK' && customEnhancementRate ? Number(customEnhancementRate) : undefined,
      holidayPayHourlyRate:
        shiftType === 'BANK' && holidayPayRate ? Number(holidayPayRate) : undefined,
      status: shiftType === 'ANNUAL_LEAVE' ? shiftStatus : undefined,
    });
    onClose();
  };

  const isEditing = Boolean(initialShift && initialShift.id);

  const modalTitle = isEditing
    ? shiftType === 'ANNUAL_LEAVE'
      ? 'Edit Annual Leave'
      : 'Edit Shift'
    : shiftType === 'ANNUAL_LEAVE'
      ? bookingMode === 'BLOCK'
        ? 'Book Block Annual Leave'
        : 'Book Annual Leave'
      : conflictingShift
        ? 'Replace Shift'
        : 'Add Shift';

  const saveButtonLabel = isEditing
    ? shiftType === 'ANNUAL_LEAVE'
      ? 'Update Leave'
      : 'Update Shift'
    : shiftType === 'ANNUAL_LEAVE'
      ? bookingMode === 'BLOCK'
        ? `Book Block Leave (${blockTotalHours.toFixed(1)}h)`
        : 'Book Leave'
      : conflictingShift
        ? 'Replace & Save'
        : 'Save Shift';

  const headerSubtitle = useMemo(() => {
    if (shiftType === 'ANNUAL_LEAVE' && bookingMode === 'BLOCK') {
      return `${formatEpisodeDateRange(blockStartDate, blockEndDate)} (${blockDaysCount} ${blockDaysCount === 1 ? 'day' : 'days'})`;
    }
    return formattedDate;
  }, [shiftType, bookingMode, blockStartDate, blockEndDate, blockDaysCount, formattedDate]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{modalTitle}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{headerSubtitle}</p>
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
                    : `UK Bank Holiday: ${bankHolidayName} (forecast at +${bandConfig.sundayAndHolidayEnhancementRate * 100}% unless a local bank rate is entered)`}
                </span>
              </div>
            )}

            <ShiftTypeSelector shiftType={shiftType} onSelectType={handleSwitchShiftType} />

            {shiftType === 'ANNUAL_LEAVE' && !isEditing && (
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.9rem' }}>
                <button
                  type="button"
                  className={`btn ${bookingMode === 'SINGLE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.8125rem' }}
                  onClick={() => setBookingMode('SINGLE')}
                >
                  Single Shift
                </button>
                <button
                  type="button"
                  className={`btn ${bookingMode === 'BLOCK' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.8125rem' }}
                  onClick={() => setBookingMode('BLOCK')}
                >
                  🗓️ Date Range / Block (Full Week)
                </button>
              </div>
            )}

            {shiftType === 'ANNUAL_LEAVE' && bookingMode === 'BLOCK' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="block-start-date">
                      Start Date
                    </label>
                    <input
                      id="block-start-date"
                      type="date"
                      className="form-input"
                      value={blockStartDate}
                      onChange={(e) => setBlockStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="block-end-date">
                      End Date
                    </label>
                    <input
                      id="block-end-date"
                      type="date"
                      className="form-input"
                      value={blockEndDate}
                      min={blockStartDate}
                      onChange={(e) => setBlockEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Block Deduction Method</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor:
                          blockDeductionType === 'CONTRACTED_WEEK'
                            ? 'var(--primary)'
                            : 'var(--border-light)',
                        background:
                          blockDeductionType === 'CONTRACTED_WEEK' ? '#eff6ff' : 'var(--surface)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="blockDeductionType"
                        checked={blockDeductionType === 'CONTRACTED_WEEK'}
                        onChange={() => setBlockDeductionType('CONTRACTED_WEEK')}
                      />
                      <div>
                        <strong>
                          Full Contracted Week ({profile?.contractedWeeklyHours || 26.0}h)
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          NHS 7-day rule: deducts 1 week of contracted hours (
                          {(
                            (blockDaysCount / 7) *
                            (profile?.contractedWeeklyHours || 26.0)
                          ).toFixed(1)}
                          h for {blockDaysCount} days)
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor:
                          blockDeductionType === 'DAILY_PRESET'
                            ? 'var(--primary)'
                            : 'var(--border-light)',
                        background:
                          blockDeductionType === 'DAILY_PRESET' ? '#eff6ff' : 'var(--surface)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="blockDeductionType"
                        checked={blockDeductionType === 'DAILY_PRESET'}
                        onChange={() => setBlockDeductionType('DAILY_PRESET')}
                      />
                      <div>
                        <strong>Daily Shift Preset ({breakdown.totalWorkedHours}h/day)</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Deducts {breakdown.totalWorkedHours}h for each of the {blockDaysCount}{' '}
                          days ({(breakdown.totalWorkedHours * blockDaysCount).toFixed(1)}h total)
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor:
                          blockDeductionType === 'CUSTOM_HOURS'
                            ? 'var(--primary)'
                            : 'var(--border-light)',
                        background:
                          blockDeductionType === 'CUSTOM_HOURS' ? '#eff6ff' : 'var(--surface)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="blockDeductionType"
                        checked={blockDeductionType === 'CUSTOM_HOURS'}
                        onChange={() => setBlockDeductionType('CUSTOM_HOURS')}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>Custom Total Hours for Block</strong>
                        {blockDeductionType === 'CUSTOM_HOURS' && (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="form-input"
                            style={{ marginTop: '0.35rem', maxWidth: '140px' }}
                            value={blockCustomHours}
                            onChange={(e) => setBlockCustomHours(e.target.value)}
                          />
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {blockDeductionType === 'DAILY_PRESET' && (
                  <ShiftTemplatePicker
                    presetType={presetType}
                    presets={ANNUAL_LEAVE_PRESETS}
                    label="Choose Daily Shift Template"
                    onSelectPreset={handleSelectPreset}
                  />
                )}

                {/* Summary Card */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 600,
                      color: '#166534',
                    }}
                  >
                    <span>Block Duration:</span>
                    <span>
                      {blockDaysCount} {blockDaysCount === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      color: '#166534',
                      fontSize: '0.9rem',
                    }}
                  >
                    <span>Total Hours Deducted:</span>
                    <span>{blockTotalHours.toFixed(1)} hrs</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>
                    ✓ Generates a single continuous leave episode matching Allocate HealthRoster.
                  </div>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}

            {shiftType !== 'ANNUAL_LEAVE' && unpaidBreakMinutes > 0 && (
              <div className="form-group">
                <label className="form-label" htmlFor="shift-modal-break-start">
                  Unpaid Break Start (optional)
                </label>
                <input
                  id="shift-modal-break-start"
                  type="time"
                  className="form-input"
                  value={unpaidBreakStartTime}
                  onChange={(event) => setUnpaidBreakStartTime(event.target.value)}
                />
                <span className="form-help">
                  Set this when the break crosses a night, Saturday or Sunday pay boundary.
                </span>
              </div>
            )}

            {shiftType === 'BANK' && (
              <div className="settings-section-card">
                <div className="settings-section-title">Local bank payroll rates</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift-modal-bank-basic-rate">
                      Basic Rate (£/hr)
                    </label>
                    <input
                      id="shift-modal-bank-basic-rate"
                      type="number"
                      step="0.0001"
                      min="0"
                      className="form-input"
                      value={customRate}
                      placeholder={hourlyRate.toFixed(4)}
                      onChange={(event) => setCustomRate(event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift-modal-bank-enhancement-rate">
                      Enhancement Rate (£/hr)
                    </label>
                    <input
                      id="shift-modal-bank-enhancement-rate"
                      type="number"
                      step="0.0001"
                      min="0"
                      className="form-input"
                      value={customEnhancementRate}
                      placeholder="Defaults to basic rate"
                      onChange={(event) => setCustomEnhancementRate(event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift-modal-holiday-rate">
                      Holiday Pay (£/hr)
                    </label>
                    <input
                      id="shift-modal-holiday-rate"
                      type="number"
                      step="0.0001"
                      min="0"
                      className="form-input"
                      value={holidayPayRate}
                      placeholder="e.g. 1.70"
                      onChange={(event) => setHolidayPayRate(event.target.value)}
                    />
                  </div>
                </div>
                <span className="form-help">
                  Bank rates are locally agreed. Enter the figures shown by payroll rather than
                  assuming substantive AfC rates.
                </span>
              </div>
            )}

            {bookingMode === 'SINGLE' && presetType === 'CUSTOM' && (
              <ShiftTimeInputs
                startTime={startTime}
                endTime={endTime}
                endTimeError={endTimeError}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            )}

            {shiftType === 'ANNUAL_LEAVE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">Approval Status</label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.4rem',
                    }}
                  >
                    <button
                      type="button"
                      className={`btn ${shiftStatus === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.8125rem', padding: '0.4rem' }}
                      onClick={() => setShiftStatus('APPROVED')}
                    >
                      Approved
                    </button>
                    <button
                      type="button"
                      className={`btn ${shiftStatus === 'REQUESTED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.8125rem', padding: '0.4rem' }}
                      onClick={() => setShiftStatus('REQUESTED')}
                    >
                      Requested
                    </button>
                    <button
                      type="button"
                      className={`btn ${shiftStatus === 'REJECTED' ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ fontSize: '0.8125rem', padding: '0.4rem' }}
                      onClick={() => setShiftStatus('REJECTED')}
                    >
                      Rejected
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.45rem',
                    padding: '0.65rem 0.85rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    color: '#166534',
                    lineHeight: 1.45,
                  }}
                >
                  <Info size={15} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>NHS AfC Shift Deduction Rule:</strong> Annual leave is deducted as the
                    exact net hours of your rostered shift (e.g. 10.0h Night Duty, 11.0h Long Day,
                    or 7.5h Standard Day) from your 192.5h pot. Unpaid meal breaks are excluded.
                  </span>
                </div>
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

            {bookingMode === 'SINGLE' && (
              <ShiftBreakdownPreview
                shiftType={shiftType}
                overrideBand={overrideBand}
                effectiveRate={effectiveRate}
                breakdown={breakdown}
                bandConfig={bandConfig}
                payslipImpact={payslipImpact}
              />
            )}
          </div>

          <div className="modal-footer">
            {isEditing && onDelete ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (initialShift) onDelete(initialShift.id);
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
