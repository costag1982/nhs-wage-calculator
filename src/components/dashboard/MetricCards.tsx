import React from 'react';
import { PayslipSummary } from '../../domain/models/Payslip';
import { formatHours } from '../../domain/utils/mathUtils';
import { Banknote, Clock, ShieldAlert, Sparkles, Timer } from 'lucide-react';

interface MetricCardsProps {
  summary: PayslipSummary;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary }) => {
  const formatCurrency = (val: number) =>
    `£${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const workedHours = summary.hoursBreakdown.totalWorkedHours;
  const contractedHours = summary.monthlyBasicHours;
  const hoursProgress =
    contractedHours > 0 ? Math.min((workedHours / contractedHours) * 100, 100) : 0;
  const isOverContracted = workedHours > contractedHours;

  const hasAdditionalHours =
    summary.additionalHoursPay !== undefined &&
    summary.additionalHoursPay !== null &&
    summary.additionalHoursPay > 0;

  const hasOvertimeHours =
    summary.overtimePay !== undefined && summary.overtimePay !== null && summary.overtimePay > 0;

  return (
    <div className="metrics-grid">
      {/* Gross Pay */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Expected Gross Pay</span>
          <div className="metric-icon">
            <Banknote size={20} color="var(--nhs-blue)" />
          </div>
        </div>
        <div className="metric-value tabular-nums">{formatCurrency(summary.grossPay)}</div>
        <div className="metric-subtitle">
          Basic: {formatCurrency(summary.monthlyBasicPay)} + Enhancements:{' '}
          {formatCurrency(summary.enhancementsTotal)}
          {hasAdditionalHours && (
            <>
              {' '}
              + Additional: {formatHours(summary.additionalHours!)}h (
              {formatCurrency(summary.additionalHoursPay!)})
            </>
          )}
          {hasOvertimeHours && (
            <>
              {' '}
              + Overtime: {formatHours(summary.overtimeHours!)}h (
              {formatCurrency(summary.overtimePay!)})
            </>
          )}
        </div>
      </div>

      {/* Unsocial Enhancements */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Unsocial Enhancements</span>
          <div className="metric-icon">
            <Sparkles size={20} color="var(--amber)" />
          </div>
        </div>
        <div className="metric-value tabular-nums" style={{ color: 'var(--amber)' }}>
          +{formatCurrency(summary.enhancementsTotal)}
        </div>
        <div className="metric-subtitle">
          {summary.hoursBreakdown.nightHours > 0 &&
            `Night: ${formatHours(summary.hoursBreakdown.nightHours)}h `}
          {summary.hoursBreakdown.saturdayHours > 0 &&
            `Sat: ${formatHours(summary.hoursBreakdown.saturdayHours)}h `}
          {summary.hoursBreakdown.sundayHours > 0 &&
            `Sun: ${formatHours(summary.hoursBreakdown.sundayHours)}h `}
          {summary.hoursBreakdown.bankHolidayHours > 0 &&
            `BH: ${formatHours(summary.hoursBreakdown.bankHolidayHours)}h `}
          {summary.enhancementsTotal === 0 && 'No unsocial hours this month'}
        </div>
      </div>

      {/* Total Deductions */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Total Deductions</span>
          <div className="metric-icon">
            <ShieldAlert size={20} color="var(--rose)" />
          </div>
        </div>
        <div className="metric-value tabular-nums" style={{ color: 'var(--rose)' }}>
          -{formatCurrency(summary.totalDeductions)}
        </div>
        <div className="metric-subtitle">PAYE, NI Class 1, NHS Pension & Commitments</div>
      </div>

      {/* Hours Worked vs Contracted */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Hours Worked</span>
          <div className="metric-icon">
            <Timer size={20} color={isOverContracted ? 'var(--amber)' : 'var(--nhs-blue)'} />
          </div>
        </div>
        <div className="metric-value tabular-nums hours-fraction">
          <span style={{ color: isOverContracted ? 'var(--amber)' : 'var(--text-main)' }}>
            {formatHours(workedHours)}
          </span>
          <span className="hours-fraction-divider">/ {formatHours(contractedHours)}</span>
        </div>
        <div className="hours-progress-bar">
          <div
            className="hours-progress-fill"
            style={{
              width: `${hoursProgress}%`,
              background: isOverContracted
                ? 'var(--amber)'
                : 'linear-gradient(90deg, var(--nhs-blue) 0%, #00a6d6 100%)',
            }}
          />
        </div>
        <div className="metric-subtitle">
          {isOverContracted
            ? `${formatHours(workedHours - contractedHours)}h above monthly contracted equivalent`
            : `${formatHours(contractedHours - workedHours)}h remaining this month`}
        </div>
      </div>

      {/* Net Take-Home Pay (Highlighted) */}
      <div className="metric-card highlight-net">
        <div className="metric-header">
          <span className="metric-title">Take-Home Net Pay</span>
          <div className="metric-icon">
            <Clock size={20} />
          </div>
        </div>
        <div className="metric-value tabular-nums">{formatCurrency(summary.netPay)}</div>
        <div className="metric-subtitle">Estimated BACS transfer on {summary.payDate}</div>
      </div>
    </div>
  );
};
