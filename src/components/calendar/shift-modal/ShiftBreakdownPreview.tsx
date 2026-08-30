import React from 'react';
import { ShiftWorkType, ShiftHoursBreakdown } from '../../../domain/models/Shift';
import { NhsBandConfig } from '../../../domain/constants/nhsBands';
import { ShiftGrossImpact } from '../../../domain/services/ShiftImpactCalculator';
import { Zap, Moon, Calendar, Sparkles, Briefcase, Palmtree } from 'lucide-react';

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
  // Annual Leave View
  if (shiftType === 'ANNUAL_LEAVE') {
    return (
      <div className="breakdown-receipt">
        <div className="breakdown-receipt-header">
          <span className="breakdown-receipt-title">
            <Palmtree
              size={13}
              style={{ color: '#047857', display: 'inline', marginRight: '4px' }}
            />
            Annual Leave (AfC Section 13)
          </span>
          <span className="breakdown-tag leave-tag">{breakdown.totalWorkedHours}h Leave</span>
        </div>
        <div className="breakdown-receipt-row">
          <span>Leave Hours Deducted from Pot</span>
          <span className="tabular-nums font-bold">{breakdown.totalWorkedHours} hrs</span>
        </div>
        <div className="breakdown-receipt-total leave-total">
          <span>Gross Pay Impact</span>
          <span>Paid in standard monthly salary</span>
        </div>
      </div>
    );
  }

  // Bank Shift View
  if (shiftType === 'BANK') {
    const bankBasePay = breakdown.totalWorkedHours * effectiveRate;
    const nightPay = breakdown.nightHours * (effectiveRate * bandConfig.nightEnhancementRate);
    const satPay = breakdown.saturdayHours * (effectiveRate * bandConfig.saturdayEnhancementRate);
    const sunPay =
      breakdown.sundayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);
    const bhPay =
      breakdown.bankHolidayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);

    return (
      <div className="breakdown-receipt">
        <div className="breakdown-receipt-header">
          <span className="breakdown-receipt-title">
            <Briefcase
              size={13}
              style={{ color: '#4338ca', display: 'inline', marginRight: '4px' }}
            />
            Bank Shift Pay ({overrideBand || 'Band 2'} · £{effectiveRate.toFixed(2)}/hr)
          </span>
          <span className="breakdown-tag bank-tag">{breakdown.totalWorkedHours}h Total</span>
        </div>

        <div className="breakdown-receipt-items">
          <div className="breakdown-receipt-row">
            <span>Bank Hourly Base Rate</span>
            <span className="breakdown-hours tabular-nums">{breakdown.totalWorkedHours}h</span>
            <span className="breakdown-amount tabular-nums">+£{bankBasePay.toFixed(2)}</span>
          </div>

          {nightPay > 0 && (
            <div className="breakdown-receipt-row">
              <span>
                <Moon size={11} style={{ display: 'inline', marginRight: '3px' }} />
                Night Enhancement (+{(bandConfig.nightEnhancementRate * 100).toFixed(0)}%)
              </span>
              <span className="breakdown-hours tabular-nums">
                {breakdown.nightHours.toFixed(1)}h
              </span>
              <span className="breakdown-amount tabular-nums">+£{nightPay.toFixed(2)}</span>
            </div>
          )}

          {satPay > 0 && (
            <div className="breakdown-receipt-row">
              <span>
                <Calendar size={11} style={{ display: 'inline', marginRight: '3px' }} />
                Saturday Enhancement (+{(bandConfig.saturdayEnhancementRate * 100).toFixed(0)}%)
              </span>
              <span className="breakdown-hours tabular-nums">
                {breakdown.saturdayHours.toFixed(1)}h
              </span>
              <span className="breakdown-amount tabular-nums">+£{satPay.toFixed(2)}</span>
            </div>
          )}

          {sunPay > 0 && (
            <div className="breakdown-receipt-row">
              <span>
                <Calendar size={11} style={{ display: 'inline', marginRight: '3px' }} />
                Sunday Enhancement (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}
                %)
              </span>
              <span className="breakdown-hours tabular-nums">
                {breakdown.sundayHours.toFixed(1)}h
              </span>
              <span className="breakdown-amount tabular-nums">+£{sunPay.toFixed(2)}</span>
            </div>
          )}

          {bhPay > 0 && (
            <div className="breakdown-receipt-row">
              <span>
                <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} />
                Bank Holiday (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}%)
              </span>
              <span className="breakdown-hours tabular-nums">
                {breakdown.bankHolidayHours.toFixed(1)}h
              </span>
              <span className="breakdown-amount tabular-nums">+£{bhPay.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="breakdown-receipt-total">
          <div>
            <div className="total-label">Total Extra Gross Pay</div>
            <div className="total-subtext">Paid on top of substantive salary</div>
          </div>
          <div className="total-value tabular-nums">+£{payslipImpact.extraGrossPay.toFixed(2)}</div>
        </div>
      </div>
    );
  }

  // Substantive Shift View
  const nightPay = breakdown.nightHours * (effectiveRate * bandConfig.nightEnhancementRate);
  const satPay = breakdown.saturdayHours * (effectiveRate * bandConfig.saturdayEnhancementRate);
  const sunPay =
    breakdown.sundayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);
  const bhPay =
    breakdown.bankHolidayHours * (effectiveRate * bandConfig.sundayAndHolidayEnhancementRate);
  const hasEnhancements = nightPay > 0 || satPay > 0 || sunPay > 0 || bhPay > 0;
  const hasExtraHours = payslipImpact.additionalHours > 0 || payslipImpact.overtimeHours > 0;

  return (
    <div className="breakdown-receipt">
      <div className="breakdown-receipt-header">
        <span className="breakdown-receipt-title">Shift Breakdown</span>
        <span className="breakdown-tag">{breakdown.totalWorkedHours}h Shift</span>
      </div>

      <div className="breakdown-receipt-items">
        {/* If shift is within contracted weekly threshold */}
        {!hasExtraHours && (
          <div className="breakdown-receipt-row muted-row">
            <span>Basic Contracted Hours (26h/wk threshold)</span>
            <span className="breakdown-hours tabular-nums">{breakdown.totalWorkedHours}h</span>
            <span className="breakdown-amount" style={{ color: 'var(--text-muted)' }}>
              In Salary
            </span>
          </div>
        )}

        {/* Additional plain time hours */}
        {payslipImpact.additionalHours > 0 && (
          <div className="breakdown-receipt-row highlight-row">
            <span>
              <Zap
                size={12}
                style={{ display: 'inline', marginRight: '3px', color: 'var(--nhs-blue)' }}
              />
              Additional Hours (exceeds {payslipImpact.contractedWeeklyHours}h)
            </span>
            <span className="breakdown-hours tabular-nums">
              {payslipImpact.additionalHours.toFixed(1)}h
            </span>
            <span className="breakdown-amount tabular-nums">
              +£{(payslipImpact.additionalHours * effectiveRate).toFixed(2)}
            </span>
          </div>
        )}

        {/* Overtime hours */}
        {payslipImpact.overtimeHours > 0 && (
          <div className="breakdown-receipt-row highlight-row">
            <span>
              <Zap size={12} style={{ display: 'inline', marginRight: '3px', color: '#b45309' }} />
              Overtime (above 37.5h · 1.5x)
            </span>
            <span className="breakdown-hours tabular-nums">
              {payslipImpact.overtimeHours.toFixed(1)}h
            </span>
            <span className="breakdown-amount tabular-nums">
              +£{(payslipImpact.overtimeHours * effectiveRate * 1.5).toFixed(2)}
            </span>
          </div>
        )}

        {/* Unsocial Night */}
        {nightPay > 0 && (
          <div className="breakdown-receipt-row">
            <span>
              <Moon size={11} style={{ display: 'inline', marginRight: '3px', color: '#7c3aed' }} />
              Night Duty (+{(bandConfig.nightEnhancementRate * 100).toFixed(0)}%)
            </span>
            <span className="breakdown-hours tabular-nums">{breakdown.nightHours.toFixed(1)}h</span>
            <span className="breakdown-amount tabular-nums">+£{nightPay.toFixed(2)}</span>
          </div>
        )}

        {/* Saturday */}
        {satPay > 0 && (
          <div className="breakdown-receipt-row">
            <span>
              <Calendar
                size={11}
                style={{ display: 'inline', marginRight: '3px', color: '#e11d48' }}
              />
              Saturday (+{(bandConfig.saturdayEnhancementRate * 100).toFixed(0)}%)
            </span>
            <span className="breakdown-hours tabular-nums">
              {breakdown.saturdayHours.toFixed(1)}h
            </span>
            <span className="breakdown-amount tabular-nums">+£{satPay.toFixed(2)}</span>
          </div>
        )}

        {/* Sunday */}
        {sunPay > 0 && (
          <div className="breakdown-receipt-row">
            <span>
              <Calendar
                size={11}
                style={{ display: 'inline', marginRight: '3px', color: '#059669' }}
              />
              Sunday (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}%)
            </span>
            <span className="breakdown-hours tabular-nums">
              {breakdown.sundayHours.toFixed(1)}h
            </span>
            <span className="breakdown-amount tabular-nums">+£{sunPay.toFixed(2)}</span>
          </div>
        )}

        {/* Bank Holiday */}
        {bhPay > 0 && (
          <div className="breakdown-receipt-row">
            <span>
              <Sparkles
                size={11}
                style={{ display: 'inline', marginRight: '3px', color: '#d97706' }}
              />
              Bank Holiday (+{(bandConfig.sundayAndHolidayEnhancementRate * 100).toFixed(0)}%)
            </span>
            <span className="breakdown-hours tabular-nums">
              {breakdown.bankHolidayHours.toFixed(1)}h
            </span>
            <span className="breakdown-amount tabular-nums">+£{bhPay.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="breakdown-receipt-total">
        <div>
          <div className="total-label">Estimated Extra Gross Pay</div>
          <div className="total-subtext">
            {payslipImpact.extraGrossPay > 0
              ? hasExtraHours && hasEnhancements
                ? `+£${payslipImpact.additionalBasePay.toFixed(2)} extra hours + £${payslipImpact.enhancementsTotal.toFixed(2)} unsocial`
                : hasExtraHours
                  ? `+£${payslipImpact.additionalBasePay.toFixed(2)} additional hours`
                  : `+£${payslipImpact.enhancementsTotal.toFixed(2)} unsocial premium`
              : 'Covered by standard monthly basic salary'}
          </div>
        </div>
        <div
          className="total-value tabular-nums"
          style={{
            color: payslipImpact.extraGrossPay > 0 ? 'var(--emerald)' : 'var(--text-muted)',
          }}
        >
          {payslipImpact.extraGrossPay > 0
            ? `+£${payslipImpact.extraGrossPay.toFixed(2)}`
            : '£0.00'}
        </div>
      </div>
    </div>
  );
};
