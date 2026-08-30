import React from 'react';
import { ShiftWorkType, ShiftHoursBreakdown } from '../../../domain/models/Shift';
import { NhsBandConfig } from '../../../domain/constants/nhsBands';
import { ShiftGrossImpact } from '../../../domain/services/ShiftImpactCalculator';
import { Clock, Coins, Zap } from 'lucide-react';

interface ShiftBreakdownPreviewProps {
  shiftType: ShiftWorkType;
  overrideBand: string;
  effectiveRate: number;
  breakdown: ShiftHoursBreakdown;
  bandConfig: NhsBandConfig;
  payslipImpact: ShiftGrossImpact;
}

export const ShiftBreakdownPreview: React.FC<ShiftBreakdownPreviewProps> = ({
  shiftType,
  overrideBand,
  effectiveRate,
  breakdown,
  bandConfig,
  payslipImpact,
}) => {
  return (
    <div className="shift-preview-box">
      <div className="shift-preview-header">
        <div className="shift-preview-title">
          <Clock size={15} style={{ color: 'var(--nhs-blue)', flexShrink: 0 }} />
          <span>{shiftType === 'ANNUAL_LEAVE' ? 'Annual Leave Summary' : 'Shift Breakdown'}</span>
          {shiftType === 'BANK' && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#4338ca',
                background: '#e0e7ff',
                padding: '1px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              Bank Shift
            </span>
          )}
          {shiftType === 'ANNUAL_LEAVE' && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#047857',
                background: '#dcfce7',
                padding: '1px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              🌴 Annual Leave
            </span>
          )}
          {overrideBand && shiftType !== 'ANNUAL_LEAVE' && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--nhs-blue)',
                background: '#e0f2fe',
                padding: '1px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {overrideBand} (£{effectiveRate.toFixed(2)}/hr)
            </span>
          )}
        </div>

        {shiftType !== 'ANNUAL_LEAVE' ? (
          <div
            className="shift-preview-estimate"
            style={{
              color: payslipImpact.extraGrossPay > 0 ? 'var(--emerald)' : 'var(--text-muted)',
            }}
          >
            <Coins size={14} />
            <span>
              {payslipImpact.extraGrossPay > 0
                ? `+£${payslipImpact.extraGrossPay.toFixed(2)} extra`
                : '£0.00 extra'}
            </span>
          </div>
        ) : (
          <div className="shift-preview-estimate" style={{ color: '#047857' }}>
            <span>{breakdown.totalWorkedHours}h leave</span>
          </div>
        )}
      </div>

      <div className="preview-pill-list">
        <div
          className="preview-pill"
          style={{
            borderColor: shiftType === 'ANNUAL_LEAVE' ? 'var(--emerald)' : 'var(--border-medium)',
            background: shiftType === 'ANNUAL_LEAVE' ? '#ecfdf5' : '#ffffff',
            color: shiftType === 'ANNUAL_LEAVE' ? '#065f46' : undefined,
            fontWeight: 600,
          }}
        >
          <span>{shiftType === 'ANNUAL_LEAVE' ? 'Leave Deducted:' : 'Total Paid:'}</span>
          <strong style={{ color: shiftType === 'ANNUAL_LEAVE' ? '#065f46' : undefined }}>
            {breakdown.totalWorkedHours} hrs
          </strong>
        </div>

        {shiftType !== 'ANNUAL_LEAVE' && (
          <>
            {breakdown.nightHours > 0 && (
              <div
                className="preview-pill"
                style={{
                  borderColor: '#c4b5fd',
                  background: '#f5f3ff',
                  color: '#5b21b6',
                }}
              >
                🌙 Night (+{(bandConfig.nightEnhancementRate * 100).toFixed(0)}%):{' '}
                <strong style={{ color: '#5b21b6' }}>
                  {breakdown.nightHours}h (+£
                  {(
                    breakdown.nightHours *
                    (effectiveRate * bandConfig.nightEnhancementRate)
                  ).toFixed(2)}
                  )
                </strong>
              </div>
            )}
            {breakdown.saturdayHours > 0 && (
              <div
                className="preview-pill"
                style={{
                  borderColor: '#fca5a5',
                  background: '#fff1f2',
                  color: '#9f1239',
                }}
              >
                Sat (+{(bandConfig.saturdayEnhancementRate * 100).toFixed(0)}%):{' '}
                <strong style={{ color: '#9f1239' }}>
                  {breakdown.saturdayHours}h (+£
                  {(
                    breakdown.saturdayHours *
                    (effectiveRate * bandConfig.saturdayEnhancementRate)
                  ).toFixed(2)}
                  )
                </strong>
              </div>
            )}
            {breakdown.sundayHours > 0 && (
              <div
                className="preview-pill"
                style={{
                  borderColor: '#86efac',
                  background: '#ecfdf5',
                  color: '#047857',
                }}
              >
                Sun (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}%):{' '}
                <strong style={{ color: '#047857' }}>
                  {breakdown.sundayHours}h (+£
                  {(
                    breakdown.sundayHours *
                    (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate)
                  ).toFixed(2)}
                  )
                </strong>
              </div>
            )}
            {breakdown.bankHolidayHours > 0 && (
              <div
                className="preview-pill"
                style={{
                  borderColor: '#fcd34d',
                  background: '#fffbeb',
                  color: '#92400e',
                }}
              >
                Bank Hol (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}%):{' '}
                <strong style={{ color: '#92400e' }}>
                  {breakdown.bankHolidayHours}h (+£
                  {(
                    breakdown.bankHolidayHours *
                    (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate)
                  ).toFixed(2)}
                  )
                </strong>
              </div>
            )}
            {shiftType === 'SUBSTANTIVE' &&
              (payslipImpact.additionalHours > 0 || payslipImpact.overtimeHours > 0) && (
                <div
                  className="preview-pill"
                  style={{
                    borderColor: '#93c5fd',
                    background: '#eff6ff',
                    color: 'var(--nhs-blue)',
                  }}
                >
                  <Zap size={12} style={{ display: 'inline', marginRight: '2px' }} />
                  Additional Hours (exceeds {payslipImpact.contractedWeeklyHours}h):{' '}
                  <strong style={{ color: 'var(--nhs-dark-blue)' }}>
                    {(payslipImpact.additionalHours + payslipImpact.overtimeHours).toFixed(1)}h (+£
                    {payslipImpact.additionalBasePay.toFixed(2)})
                  </strong>
                </div>
              )}
          </>
        )}
      </div>

      <div
        className="shift-preview-note"
        style={{
          color:
            shiftType === 'BANK'
              ? '#4338ca'
              : shiftType === 'ANNUAL_LEAVE'
                ? '#047857'
                : payslipImpact.extraGrossPay > 0
                  ? 'var(--emerald)'
                  : 'var(--text-muted)',
        }}
      >
        ℹ️ {payslipImpact.summaryText}
      </div>
    </div>
  );
};
