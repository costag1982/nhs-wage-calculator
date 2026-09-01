import React, { useMemo, useState } from 'react';
import { EmployeeProfile } from '../../domain/models/Contract';
import { Shift } from '../../domain/models/Shift';
import { RecurringCommitment } from '../../domain/models/Deductions';
import { AllShiftsView } from '../shifts/AllShiftsView';
import {
  getAllPayPeriodSummaries,
  calculatePayPeriodsTotals,
  exportPayPeriodsToCsv,
  exportShiftsToCsv,
  downloadCsvFile,
} from '../../domain/services/payPeriodService';
import {
  Download,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  Filter,
  Sparkles,
  ArrowLeft,
  TableProperties,
} from 'lucide-react';

interface PayPeriodsViewProps {
  profile: EmployeeProfile;
  shifts: Shift[];
  commitments: RecurringCommitment[];
  activeMonthDate: Date;
  onSelectPeriodMonth: (monthDate: Date, targetTab?: 'CALENDAR' | 'PAYSLIP') => void;
  onBackToRoster?: () => void;
  onAddShiftClick?: () => void;
  onEditShift?: (shift: Shift) => void;
  onDeleteShift?: (id: string) => void;
  initialSubView?: 'PERIODS' | 'ALL_SHIFTS';
}

export const PayPeriodsView: React.FC<PayPeriodsViewProps> = ({
  profile,
  shifts,
  commitments,
  activeMonthDate,
  onSelectPeriodMonth,
  onBackToRoster,
  onAddShiftClick,
  onEditShift,
  onDeleteShift,
  initialSubView = 'PERIODS',
}) => {
  const [activeSubView, setActiveSubView] = useState<'PERIODS' | 'ALL_SHIFTS'>(initialSubView);
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>('ALL');

  // Compute all pay periods
  const allPeriodRows = useMemo(() => {
    return getAllPayPeriodSummaries(profile, shifts, commitments, {
      activeMonth: activeMonthDate,
    });
  }, [profile, shifts, commitments, activeMonthDate]);

  // Extract distinct tax years
  const availableTaxYears = useMemo(() => {
    const years = new Set<number>();
    for (const r of allPeriodRows) {
      // Payment month determines tax year (April = month 3 0-indexed)
      const payMonth = new Date(
        r.rosterMonthDate.getFullYear(),
        r.rosterMonthDate.getMonth() + 1,
        1
      );
      const taxYear =
        payMonth.getMonth() >= 3 ? payMonth.getFullYear() : payMonth.getFullYear() - 1;
      years.add(taxYear);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [allPeriodRows]);

  // Filter rows by tax year
  const filteredRows = useMemo(() => {
    if (selectedTaxYear === 'ALL') return allPeriodRows;
    const yearNum = Number(selectedTaxYear);
    return allPeriodRows.filter((r) => {
      const payMonth = new Date(
        r.rosterMonthDate.getFullYear(),
        r.rosterMonthDate.getMonth() + 1,
        1
      );
      const taxYear =
        payMonth.getMonth() >= 3 ? payMonth.getFullYear() : payMonth.getFullYear() - 1;
      return taxYear === yearNum;
    });
  }, [allPeriodRows, selectedTaxYear]);

  // Compute totals for displayed rows
  const totals = useMemo(() => {
    return calculatePayPeriodsTotals(filteredRows);
  }, [filteredRows]);

  // CSV Export Handlers
  const handleExportSummaryCsv = () => {
    const csvContent = exportPayPeriodsToCsv(filteredRows, profile);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`nhs_pay_periods_summary_${dateStr}.csv`, csvContent);
  };

  const handleExportAllShiftsCsv = () => {
    const csvContent = exportShiftsToCsv(shifts, profile);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`nhs_all_recorded_shifts_${dateStr}.csv`, csvContent);
  };

  const isCurrentActiveRosterMonth = (rowDate: Date) => {
    return (
      rowDate.getFullYear() === activeMonthDate.getFullYear() &&
      rowDate.getMonth() === activeMonthDate.getMonth()
    );
  };

  return (
    <div className="pay-periods-container">
      {/* Top Header & Navigation Banner */}
      <div className="pay-periods-header-card">
        <div className="pay-periods-header-left">
          <div className="pay-periods-icon-badge">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="pay-periods-title">Pay Periods & Annual Hours Reconciliation</h2>
            <p className="pay-periods-subtitle">
              Audit contracted hours against actual recorded shifts, track extra hours paid vs
              potentially unpaid, and export shift records across all months.
            </p>
          </div>
        </div>

        <div className="pay-periods-actions-bar">
          {onBackToRoster && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onBackToRoster}
              title="Return to monthly roster view"
            >
              <ArrowLeft size={15} />
              Monthly Roster
            </button>
          )}

          {/* Sub-view switcher: Pay Periods Table vs All Shifts Ledger */}
          <div className="period-subview-toggle">
            <button
              type="button"
              className={`subview-btn ${activeSubView === 'PERIODS' ? 'active' : ''}`}
              onClick={() => setActiveSubView('PERIODS')}
            >
              <TrendingUp size={14} />
              Pay Periods Table
            </button>
            <button
              type="button"
              className={`subview-btn ${activeSubView === 'ALL_SHIFTS' ? 'active' : ''}`}
              onClick={() => setActiveSubView('ALL_SHIFTS')}
            >
              <TableProperties size={14} />
              All Shifts Ledger ({shifts.length})
            </button>
          </div>

          {activeSubView === 'PERIODS' && (
            <>
              {/* Tax Year Filter */}
              {availableTaxYears.length > 1 && (
                <div className="filter-select-wrapper">
                  <Filter size={14} className="filter-icon" />
                  <select
                    className="filter-select"
                    value={selectedTaxYear}
                    onChange={(e) => setSelectedTaxYear(e.target.value)}
                    aria-label="Filter by Tax Year"
                  >
                    <option value="ALL">All Tax Years</option>
                    {availableTaxYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Tax Year {yr}/{(yr + 1).toString().slice(-2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportSummaryCsv}
                title="Download reconciliation table as CSV"
              >
                <Download size={15} />
                Export Summary CSV
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportAllShiftsCsv}
                title="Download detailed shift-by-shift register as CSV"
              >
                <Download size={15} />
                Export Shifts CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Render All Shifts Ledger if selected */}
      {activeSubView === 'ALL_SHIFTS' && (
        <AllShiftsView
          shifts={shifts}
          profile={profile}
          onEditShift={onEditShift || (() => {})}
          onDeleteShift={onDeleteShift || (() => {})}
          onAddShiftClick={onAddShiftClick || (() => {})}
        />
      )}

      {/* Render Pay Periods Reconciliation Table & KPIs if selected */}
      {activeSubView === 'PERIODS' && (
        <>
          {/* KPI Cards Summary */}
          <div className="period-kpi-grid">
            <div className="period-kpi-card">
              <div className="period-kpi-header">
                <span className="period-kpi-label">Contracted Basic</span>
                <Clock size={16} className="period-kpi-icon text-muted" />
              </div>
              <div className="period-kpi-value tabular-nums">
                {totals.totalContractedHours.toFixed(1)} hrs
              </div>
              <div className="period-kpi-footer">
                {profile.contractType === 'SUBSTANTIVE'
                  ? `${profile.contractedWeeklyHours}h/wk substantive basis`
                  : 'Bank hourly (zero contracted)'}
              </div>
            </div>

            <div className="period-kpi-card">
              <div className="period-kpi-header">
                <span className="period-kpi-label">Actual Hours Worked</span>
                <Sparkles
                  size={16}
                  className="period-kpi-icon"
                  style={{ color: 'var(--nhs-blue)' }}
                />
              </div>
              <div className="period-kpi-value tabular-nums" style={{ color: 'var(--nhs-blue)' }}>
                {totals.totalActualHoursWorked.toFixed(1)} hrs
              </div>
              <div className="period-kpi-footer">
                {totals.totalShifts} recorded shifts across periods
              </div>
            </div>

            <div className="period-kpi-card">
              <div className="period-kpi-header">
                <span className="period-kpi-label">Extra Hours Balance</span>
                <TrendingUp
                  size={16}
                  className="period-kpi-icon"
                  style={{
                    color: totals.totalExtraHours >= 0 ? 'var(--emerald)' : 'var(--text-muted)',
                  }}
                />
              </div>
              <div
                className="period-kpi-value tabular-nums"
                style={{
                  color: totals.totalExtraHours >= 0 ? 'var(--emerald)' : 'var(--text-muted)',
                }}
              >
                {totals.totalExtraHours > 0
                  ? `+${totals.totalExtraHours.toFixed(1)}`
                  : totals.totalExtraHours.toFixed(1)}{' '}
                hrs
              </div>
              <div className="period-kpi-footer">
                {totals.totalExtraHoursPaid.toFixed(1)} hrs paid as Overtime / Bank
              </div>
            </div>

            <div
              className={`period-kpi-card ${totals.totalPotentiallyUnpaidHours > 0 ? 'card-warning-border' : ''}`}
            >
              <div className="period-kpi-header">
                <span className="period-kpi-label">Potentially Unpaid</span>
                {totals.totalPotentiallyUnpaidHours > 0 ? (
                  <AlertTriangle size={16} className="period-kpi-icon text-amber" />
                ) : (
                  <CheckCircle2 size={16} className="period-kpi-icon text-emerald" />
                )}
              </div>
              <div
                className="period-kpi-value tabular-nums"
                style={{
                  color: totals.totalPotentiallyUnpaidHours > 0 ? 'var(--amber)' : 'var(--emerald)',
                }}
              >
                {totals.totalPotentiallyUnpaidHours.toFixed(1)} hrs
              </div>
              <div className="period-kpi-footer">
                {totals.totalPotentiallyUnpaidHours > 0
                  ? `Est. value: £${totals.totalPotentiallyUnpaidAmount.toFixed(2)} (Claim OT or TOIL)`
                  : 'All extra hours accounted for'}
              </div>
            </div>

            <div className="period-kpi-card">
              <div className="period-kpi-header">
                <span className="period-kpi-label">Enhancements Due</span>
                <Coins size={16} className="period-kpi-icon" style={{ color: 'var(--indigo)' }} />
              </div>
              <div className="period-kpi-value tabular-nums" style={{ color: 'var(--indigo)' }}>
                £{totals.totalEnhancementsDue.toFixed(2)}
              </div>
              <div className="period-kpi-footer">Nights, Saturdays, Sundays & Bank Holidays</div>
            </div>
          </div>

          {/* Main 7-Column Reconciliation Table */}
          {filteredRows.length === 0 ? (
            <div className="roster-table-card period-empty-state">
              <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>No shifts recorded for the selected period</h3>
              <p>
                Add shifts to your monthly roster to see hours reconciliation and enhancement
                calculations.
              </p>
              {onAddShiftClick && (
                <button type="button" className="btn btn-primary" onClick={onAddShiftClick}>
                  Add First Shift
                </button>
              )}
            </div>
          ) : (
            <div className="roster-table-card">
              <div className="table-responsive">
                <table className="roster-table period-reconciliation-table">
                  <thead>
                    <tr>
                      <th className="text-left">Pay Period</th>
                      <th className="text-right">Contracted Hours</th>
                      <th className="text-right">Actual Hours Worked</th>
                      <th className="text-right">Extra Hours</th>
                      <th className="text-right">Extra Hours Paid</th>
                      <th className="text-right">Potentially Unpaid</th>
                      <th className="text-right">Enhancements Due</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const isActive = isCurrentActiveRosterMonth(row.rosterMonthDate);
                      const isPositiveExtra = row.extraHours > 0;
                      const isNegativeExtra = row.extraHours < 0;
                      const hasUnpaid = row.potentiallyUnpaidHours > 0;

                      return (
                        <tr
                          key={row.rosterMonthIso}
                          className={isActive ? 'period-row-active' : ''}
                        >
                          {/* 1. Pay Period */}
                          <td className="text-left">
                            <div className="period-name-cell">
                              <span className="period-month-title font-bold">
                                {row.rosterMonthLabel}
                              </span>
                              {isActive && (
                                <span className="period-active-pill">Active Roster</span>
                              )}
                            </div>
                            <div className="period-sub-detail">
                              <span>Paid: {row.payMonthLabel}</span>
                              <span className="period-tax-tag">Tax Month {row.taxPeriod}</span>
                              <span className="period-shift-count">{row.shiftCount} shifts</span>
                            </div>
                          </td>

                          {/* 2. Contracted Hours */}
                          <td className="text-right tabular-nums font-semibold">
                            {row.contractedHours > 0
                              ? `${row.contractedHours.toFixed(2)} hrs`
                              : '0.00 hrs'}
                          </td>

                          {/* 3. Actual hours worked */}
                          <td className="text-right tabular-nums font-bold">
                            <span
                              style={{
                                color:
                                  row.actualHoursWorked > 0
                                    ? 'var(--text-main)'
                                    : 'var(--text-muted)',
                              }}
                            >
                              {row.actualHoursWorked.toFixed(2)} hrs
                            </span>
                          </td>

                          {/* 4. Extra hours */}
                          <td className="text-right tabular-nums">
                            {isPositiveExtra && (
                              <span className="badge-extra-hours badge-positive">
                                +{row.extraHours.toFixed(2)} hrs
                              </span>
                            )}
                            {isNegativeExtra && (
                              <span className="badge-extra-hours badge-negative">
                                {row.extraHours.toFixed(2)} hrs
                              </span>
                            )}
                            {!isPositiveExtra && !isNegativeExtra && (
                              <span className="badge-extra-hours badge-neutral">0.00 hrs</span>
                            )}
                          </td>

                          {/* 5. Extra Hours Paid */}
                          <td className="text-right tabular-nums">
                            <span
                              className={`font-semibold ${
                                row.extraHoursPaid > 0 ? 'text-indigo' : 'text-muted'
                              }`}
                            >
                              {row.extraHoursPaid.toFixed(2)} hrs
                            </span>
                          </td>

                          {/* 6. Potentially unpaid */}
                          <td className="text-right tabular-nums">
                            {hasUnpaid ? (
                              <div className="unpaid-cell-wrapper">
                                <span
                                  className="badge-unpaid-warning"
                                  title={`Worked ${row.actualHoursWorked}h vs contracted ${row.contractedHours}h without overtime booking. Estimated value £${row.potentiallyUnpaidAmount.toFixed(2)}.`}
                                >
                                  <AlertTriangle size={12} />
                                  {row.potentiallyUnpaidHours.toFixed(2)} hrs
                                </span>
                                <span className="unpaid-val-sub">
                                  £{row.potentiallyUnpaidAmount.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted">
                                {row.extraHours > 0 && row.extraHoursPaid >= row.extraHours ? (
                                  <span className="badge-unpaid-cleared">
                                    <CheckCircle2 size={12} /> Paid
                                  </span>
                                ) : (
                                  '0.00 hrs'
                                )}
                              </span>
                            )}
                          </td>

                          {/* 7. Enhancements due */}
                          <td className="text-right tabular-nums">
                            <div className="enhancements-cell-wrapper">
                              <span className="enhancements-val font-bold">
                                £{row.enhancementsDue.toFixed(2)}
                              </span>
                              {/* Unsocial pill breakdown */}
                              <div className="enhancements-pill-row">
                                {row.enhancementHours.nightHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge"
                                    style={{ background: '#f5f3ff', color: '#5b21b6' }}
                                    title="Night Duty Hours"
                                  >
                                    🌙 {row.enhancementHours.nightHours}h
                                  </span>
                                )}
                                {row.enhancementHours.saturdayHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge"
                                    style={{ background: '#fff1f2', color: '#9f1239' }}
                                    title="Saturday Hours"
                                  >
                                    Sat: {row.enhancementHours.saturdayHours}h
                                  </span>
                                )}
                                {row.enhancementHours.sundayHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge"
                                    style={{ background: '#ecfdf5', color: '#047857' }}
                                    title="Sunday Hours"
                                  >
                                    Sun: {row.enhancementHours.sundayHours}h
                                  </span>
                                )}
                                {row.enhancementHours.bankHolidayHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge"
                                    style={{ background: '#fffbeb', color: '#92400e' }}
                                    title="Bank Holiday Hours"
                                  >
                                    BH: {row.enhancementHours.bankHolidayHours}h
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="text-center">
                            <div className="period-action-buttons">
                              <button
                                type="button"
                                className="period-jump-btn"
                                onClick={() => onSelectPeriodMonth(row.rosterMonthDate, 'CALENDAR')}
                                title={`Open ${row.rosterMonthLabel} Monthly Roster`}
                              >
                                <Calendar size={14} />
                                <span>Roster</span>
                              </button>
                              <button
                                type="button"
                                className="period-jump-btn"
                                onClick={() => onSelectPeriodMonth(row.rosterMonthDate, 'PAYSLIP')}
                                title={`Open ${row.payMonthLabel} ESR Payslip`}
                              >
                                <FileText size={14} />
                                <span>Payslip</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer Totals */}
                  <tfoot>
                    <tr className="period-totals-row">
                      <td className="text-left font-bold">
                        <div className="totals-label-wrapper">
                          <span>TOTALS ({filteredRows.length} Periods)</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums font-bold">
                        {totals.totalContractedHours.toFixed(2)} hrs
                      </td>
                      <td
                        className="text-right tabular-nums font-bold"
                        style={{ color: 'var(--nhs-blue)' }}
                      >
                        {totals.totalActualHoursWorked.toFixed(2)} hrs
                      </td>
                      <td className="text-right tabular-nums font-bold">
                        <span
                          style={{
                            color:
                              totals.totalExtraHours >= 0 ? 'var(--emerald)' : 'var(--text-muted)',
                          }}
                        >
                          {totals.totalExtraHours > 0
                            ? `+${totals.totalExtraHours.toFixed(2)}`
                            : totals.totalExtraHours.toFixed(2)}{' '}
                          hrs
                        </span>
                      </td>
                      <td className="text-right tabular-nums font-bold text-indigo">
                        {totals.totalExtraHoursPaid.toFixed(2)} hrs
                      </td>
                      <td className="text-right tabular-nums font-bold">
                        {totals.totalPotentiallyUnpaidHours > 0 ? (
                          <span className="text-amber">
                            {totals.totalPotentiallyUnpaidHours.toFixed(2)} hrs (£
                            {totals.totalPotentiallyUnpaidAmount.toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-emerald">0.00 hrs</span>
                        )}
                      </td>
                      <td
                        className="text-right tabular-nums font-bold"
                        style={{ color: 'var(--indigo)' }}
                      >
                        £{totals.totalEnhancementsDue.toFixed(2)}
                      </td>
                      <td className="text-center font-semibold text-muted">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
