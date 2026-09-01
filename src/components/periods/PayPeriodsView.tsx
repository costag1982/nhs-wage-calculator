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
            <div className="roster-table-card period-table-card">
              <div className="table-responsive">
                <table className="roster-table period-reconciliation-table">
                  <thead>
                    <tr>
                      <th className="text-left th-period">Pay Period</th>
                      <th className="text-center th-shifts">Total Shifts</th>
                      <th className="text-center th-contracted">Contracted</th>
                      <th className="text-center th-worked">Actual Worked</th>
                      <th className="text-center th-extra">Extra Hours</th>
                      <th className="text-center th-paid">Extra Paid</th>
                      <th className="text-center th-unpaid">Potentially Unpaid</th>
                      <th className="text-right th-enhancements">Enhancements Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const isPositiveExtra = row.extraHours > 0;
                      const isNegativeExtra = row.extraHours < 0;
                      const hasUnpaid = row.potentiallyUnpaidHours > 0;

                      return (
                        <tr key={row.rosterMonthIso}>
                          {/* 1. Pay Period */}
                          <td className="text-left">
                            <div className="period-cell-main">
                              <div className="period-title-row">
                                <button
                                  type="button"
                                  className="period-month-btn"
                                  onClick={() =>
                                    onSelectPeriodMonth(row.rosterMonthDate, 'CALENDAR')
                                  }
                                  title={`Open ${row.rosterMonthLabel} monthly roster`}
                                >
                                  {row.rosterMonthLabel}
                                </button>
                              </div>
                              <div className="period-meta-chips">
                                <span className="meta-chip chip-pay">
                                  Paid: {row.payMonthLabel}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Total Shifts */}
                          <td className="text-center tabular-nums">
                            <span className="badge-shifts-count font-bold">{row.shiftCount}</span>
                          </td>

                          {/* 3. Contracted Hours */}
                          <td className="text-center tabular-nums font-semibold">
                            <div className="hours-cell">
                              <span className="hours-val">
                                {row.contractedHours > 0 ? row.contractedHours.toFixed(2) : '0.00'}
                              </span>
                              <span className="hours-unit">hrs</span>
                            </div>
                          </td>

                          {/* 4. Actual hours worked */}
                          <td className="text-center tabular-nums font-bold">
                            <div className="hours-cell text-nhs-blue">
                              <span className="hours-val">{row.actualHoursWorked.toFixed(2)}</span>
                              <span className="hours-unit">hrs</span>
                            </div>
                          </td>

                          {/* 5. Extra hours */}
                          <td className="text-center tabular-nums">
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

                          {/* 6. Extra Hours Paid */}
                          <td className="text-center tabular-nums">
                            {row.extraHoursPaid > 0 ? (
                              <span className="badge-extra-paid">
                                {row.extraHoursPaid.toFixed(2)} hrs
                              </span>
                            ) : (
                              <span className="text-muted">0.00 hrs</span>
                            )}
                          </td>

                          {/* 7. Potentially unpaid */}
                          <td className="text-center tabular-nums">
                            {hasUnpaid ? (
                              <div className="unpaid-badge-container">
                                <span
                                  className="badge-unpaid-warning"
                                  title={`Worked ${row.actualHoursWorked}h vs contracted ${row.contractedHours}h without overtime booking. Estimated value £${row.potentiallyUnpaidAmount.toFixed(2)}.`}
                                >
                                  <AlertTriangle size={13} />
                                  <span>{row.potentiallyUnpaidHours.toFixed(2)} hrs</span>
                                </span>
                                <span className="unpaid-val-sub">
                                  £{row.potentiallyUnpaidAmount.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <div>
                                {row.extraHours > 0 && row.extraHoursPaid >= row.extraHours ? (
                                  <span className="badge-unpaid-cleared">
                                    <CheckCircle2 size={13} /> All Paid
                                  </span>
                                ) : (
                                  <span className="text-muted font-normal">0.00 hrs</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 8. Enhancements due */}
                          <td className="text-right tabular-nums">
                            <div className="enhancements-cell-wrapper">
                              <span className="enhancements-val font-bold">
                                £{row.enhancementsDue.toFixed(2)}
                              </span>
                              {/* Unsocial pill breakdown */}
                              <div className="enhancements-pill-row">
                                {row.enhancementHours.nightHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge badge-night"
                                    title="Night Duty Hours"
                                  >
                                    🌙 {row.enhancementHours.nightHours}h
                                  </span>
                                )}
                                {row.enhancementHours.saturdayHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge badge-sat"
                                    title="Saturday Hours"
                                  >
                                    Sat: {row.enhancementHours.saturdayHours}h
                                  </span>
                                )}
                                {row.enhancementHours.sundayHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge badge-sun"
                                    title="Sunday Hours"
                                  >
                                    Sun: {row.enhancementHours.sundayHours}h
                                  </span>
                                )}
                                {row.enhancementHours.bankHolidayHours > 0 && (
                                  <span
                                    className="enhancement-micro-badge badge-bh"
                                    title="Bank Holiday Hours"
                                  >
                                    BH: {row.enhancementHours.bankHolidayHours}h
                                  </span>
                                )}
                              </div>
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
                          <span className="totals-main-title">TOTALS</span>
                          <span className="totals-sub-tag">({filteredRows.length} Periods)</span>
                        </div>
                      </td>
                      <td className="text-center tabular-nums font-bold">
                        <span className="badge-shifts-count font-bold">{totals.totalShifts}</span>
                      </td>
                      <td className="text-center tabular-nums font-bold">
                        <div className="hours-cell">
                          <span>{totals.totalContractedHours.toFixed(2)}</span>
                          <span className="hours-unit">hrs</span>
                        </div>
                      </td>
                      <td className="text-center tabular-nums font-bold text-nhs-blue">
                        <div className="hours-cell">
                          <span>{totals.totalActualHoursWorked.toFixed(2)}</span>
                          <span className="hours-unit">hrs</span>
                        </div>
                      </td>
                      <td className="text-center tabular-nums font-bold">
                        <span
                          className={`badge-extra-hours ${
                            totals.totalExtraHours >= 0 ? 'badge-positive' : 'badge-negative'
                          }`}
                        >
                          {totals.totalExtraHours > 0
                            ? `+${totals.totalExtraHours.toFixed(2)}`
                            : totals.totalExtraHours.toFixed(2)}{' '}
                          hrs
                        </span>
                      </td>
                      <td className="text-center tabular-nums font-bold">
                        {totals.totalExtraHoursPaid > 0 ? (
                          <span className="badge-extra-paid">
                            {totals.totalExtraHoursPaid.toFixed(2)} hrs
                          </span>
                        ) : (
                          <span className="text-muted">0.00 hrs</span>
                        )}
                      </td>
                      <td className="text-center tabular-nums font-bold">
                        {totals.totalPotentiallyUnpaidHours > 0 ? (
                          <div className="unpaid-badge-container">
                            <span className="badge-unpaid-warning">
                              <AlertTriangle size={13} />
                              <span>{totals.totalPotentiallyUnpaidHours.toFixed(2)} hrs</span>
                            </span>
                            <span className="unpaid-val-sub">
                              (£{totals.totalPotentiallyUnpaidAmount.toFixed(2)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald font-semibold">0.00 hrs</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums font-bold">
                        <span
                          className="enhancements-val font-bold"
                          style={{ fontSize: '1.05rem' }}
                        >
                          £{totals.totalEnhancementsDue.toFixed(2)}
                        </span>
                      </td>
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
