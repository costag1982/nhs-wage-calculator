import React, { useState, useMemo } from 'react';
import { Shift } from '../../domain/models/Shift';
import { EmployeeProfile } from '../../domain/models/Contract';
import { getIsoWeekNumber, getShiftDateRange } from '../../domain/utils/dateUtils';
import { exportShiftsToCsv, downloadCsvFile } from '../../domain/services/payPeriodService';
import {
  Edit2,
  Trash2,
  Download,
  CalendarPlus,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

interface AllShiftsViewProps {
  shifts: Shift[];
  profile: EmployeeProfile;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;
  onAddShiftClick: () => void;
}

export const AllShiftsView: React.FC<AllShiftsViewProps> = ({
  shifts,
  profile,
  onEditShift,
  onDeleteShift,
  onAddShiftClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftType, setSelectedShiftType] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Distinct years available
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const s of shifts) {
      if (s.date && s.date.length >= 4) {
        years.add(s.date.substring(0, 4));
      }
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [shifts]);

  // Filtered and sorted shifts
  const processedShifts = useMemo(() => {
    return shifts
      .filter((shift) => {
        // Shift Type filter
        if (selectedShiftType !== 'ALL') {
          if (shift.shiftType !== selectedShiftType) return false;
        }

        // Year filter
        if (selectedYear !== 'ALL') {
          if (!shift.date.startsWith(selectedYear)) return false;
        }

        // Search text filter (date, preset, type, band)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesDate = shift.date.toLowerCase().includes(q);
          const matchesPreset = (shift.presetType || '').toLowerCase().includes(q);
          const matchesType = (shift.shiftType || '').toLowerCase().includes(q);
          const matchesBand = (shift.overrideBand || '').toLowerCase().includes(q);
          const range = getShiftDateRange(shift.date, shift.startTime, shift.endTime);
          const matchesStart = range.formattedStartDate.toLowerCase().includes(q);
          const matchesEnd = range.formattedEndDate.toLowerCase().includes(q);

          if (
            !matchesDate &&
            !matchesPreset &&
            !matchesType &&
            !matchesBand &&
            !matchesStart &&
            !matchesEnd
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        return sortOrder === 'ASC' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      });
  }, [shifts, selectedShiftType, selectedYear, searchQuery, sortOrder]);

  // Aggregate statistics for the filtered list
  const stats = useMemo(() => {
    let totalHours = 0;
    let totalNight = 0;
    let totalWeekend = 0;
    for (const s of processedShifts) {
      const bd = s.breakdown;
      if (bd) {
        totalHours += bd.totalWorkedHours;
        totalNight += bd.nightHours;
        totalWeekend += bd.saturdayHours + bd.sundayHours + bd.bankHolidayHours;
      }
    }
    return {
      totalCount: processedShifts.length,
      totalHours: Number(totalHours.toFixed(2)),
      totalNight: Number(totalNight.toFixed(2)),
      totalWeekend: Number(totalWeekend.toFixed(2)),
    };
  }, [processedShifts]);

  // CSV Export Handler
  const handleExportCsv = () => {
    const csv = exportShiftsToCsv(processedShifts, profile);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`nhs_recorded_shifts_${dateStr}.csv`, csv);
  };

  if (shifts.length === 0) {
    return (
      <div
        className="roster-table-card"
        style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}
      >
        <Clock size={44} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.5rem',
          }}
        >
          No Recorded Shifts Found
        </h3>
        <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Add shifts using the Monthly Roster or click the button below to record your first shift.
        </p>
        <button type="button" className="btn btn-primary" onClick={onAddShiftClick}>
          <CalendarPlus size={16} />
          Add First Shift
        </button>
      </div>
    );
  }

  return (
    <div className="all-shifts-container">
      {/* Top Header Card */}
      <div className="pay-periods-header-card">
        <div className="pay-periods-header-left">
          <div className="pay-periods-icon-badge">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="pay-periods-title">All Recorded Shifts Register</h2>
            <p className="pay-periods-subtitle">
              Complete multi-month shift ledger with ISO week numbers, 2-day overnight shift dates,
              exact start/end times, and unsocial hour breakdowns.
            </p>
          </div>
        </div>

        <div className="pay-periods-actions-bar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCsv}
            title="Download these shifts as CSV file"
          >
            <Download size={15} />
            Export Shifts to CSV ({processedShifts.length})
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onAddShiftClick}
            title="Record a new shift"
          >
            <CalendarPlus size={15} />
            Add Shift
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="all-shifts-filter-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by date, shift name, band, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-row">
          {/* Year Filter */}
          {availableYears.length > 1 && (
            <div className="filter-select-wrapper">
              <Filter size={14} className="filter-icon" />
              <select
                className="filter-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Filter by Year"
              >
                <option value="ALL">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Shift Work Type Filter */}
          <div className="filter-select-wrapper">
            <Filter size={14} className="filter-icon" />
            <select
              className="filter-select"
              value={selectedShiftType}
              onChange={(e) => setSelectedShiftType(e.target.value)}
              aria-label="Filter by Shift Type"
            >
              <option value="ALL">All Shift Types</option>
              <option value="SUBSTANTIVE">Substantive</option>
              <option value="OVERTIME">Overtime</option>
              <option value="BANK">Bank</option>
              <option value="ANNUAL_LEAVE">Annual Leave</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}
            onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
            title="Toggle sort order"
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="shifts-stats-ribbon">
        <div className="stat-pill">
          <span className="stat-pill-label">Total Shifts:</span>
          <span className="stat-pill-val font-bold">{stats.totalCount}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Hours Worked:</span>
          <span className="stat-pill-val font-bold text-indigo">{stats.totalHours} hrs</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Night Duty:</span>
          <span className="stat-pill-val font-bold" style={{ color: '#5b21b6' }}>
            {stats.totalNight} hrs
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Weekend / BH:</span>
          <span className="stat-pill-val font-bold" style={{ color: '#047857' }}>
            {stats.totalWeekend} hrs
          </span>
        </div>
      </div>

      {/* Shifts Master Table */}
      <div className="roster-table-card">
        <div className="table-responsive">
          <table className="roster-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '80px' }}>
                  Week #
                </th>
                <th className="text-left">Start Date</th>
                <th className="text-left">End Date</th>
                <th className="text-left">Shift & Type</th>
                <th className="text-center">Start Time</th>
                <th className="text-center">End Time</th>
                <th className="text-center">Break</th>
                <th className="text-center">Hours Worked</th>
                <th className="text-left">Unsocial Breakdown</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedShifts.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}
                  >
                    No shifts match your filter or search query.
                  </td>
                </tr>
              ) : (
                processedShifts.map((shift) => {
                  const range = getShiftDateRange(shift.date, shift.startTime, shift.endTime);
                  const weekNum = getIsoWeekNumber(shift.date);
                  const breakdown = shift.breakdown;
                  const isLeave = shift.shiftType === 'ANNUAL_LEAVE';

                  return (
                    <tr key={shift.id}>
                      {/* Week Number */}
                      <td className="text-center">
                        <span className="week-number-badge">W{weekNum}</span>
                      </td>

                      {/* Start Date */}
                      <td className="text-left font-bold">{range.formattedStartDate}</td>

                      {/* End Date (with 2-day indicator if overnight) */}
                      <td className="text-left">
                        <div className="end-date-wrapper">
                          <span className="font-semibold">{range.formattedEndDate}</span>
                          {range.isOvernight && (
                            <span
                              className="overnight-tag"
                              title="Twilight / Overnight shift spans 2 calendar days"
                            >
                              +1 Day
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Shift Name & Tags */}
                      <td className="text-left">
                        <div className="shift-name-wrapper">
                          <span style={{ fontWeight: 600 }}>
                            {isLeave
                              ? 'Annual Leave'
                              : shift.presetType
                                ? shift.presetType.replace('_', ' ')
                                : 'Custom'}
                          </span>
                          {isLeave && <span className="badge-tag tag-leave">🌴 Leave</span>}
                          {shift.shiftType === 'OVERTIME' && (
                            <span className="badge-tag tag-overtime">⚡ Overtime</span>
                          )}
                          {shift.shiftType === 'BANK' && (
                            <span className="badge-tag tag-bank">Bank</span>
                          )}
                          {shift.overrideBand && (
                            <span className="badge-tag tag-band">{shift.overrideBand}</span>
                          )}
                        </div>
                      </td>

                      {/* Start Time */}
                      <td className="text-center tabular-nums font-semibold">{shift.startTime}</td>

                      {/* End Time */}
                      <td className="text-center tabular-nums font-semibold">{shift.endTime}</td>

                      {/* Break */}
                      <td className="text-center tabular-nums text-muted">
                        {shift.unpaidBreakMinutes}m
                      </td>

                      {/* Hours Worked */}
                      <td
                        className="text-center tabular-nums font-bold"
                        style={{ color: 'var(--nhs-blue)' }}
                      >
                        {breakdown?.totalWorkedHours} hrs
                      </td>

                      {/* Unsocial Breakdown */}
                      <td className="text-left">
                        {isLeave ? (
                          <span
                            className="enhancement-micro-badge"
                            style={{ background: '#ecfdf5', color: '#047857' }}
                          >
                            🌴 Paid Leave ({breakdown?.totalWorkedHours}h)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {breakdown && breakdown.nightHours > 0 && (
                              <span
                                className="enhancement-micro-badge"
                                style={{ background: '#f5f3ff', color: '#5b21b6' }}
                              >
                                🌙 Night: {breakdown.nightHours}h
                              </span>
                            )}
                            {breakdown && breakdown.saturdayHours > 0 && (
                              <span
                                className="enhancement-micro-badge"
                                style={{ background: '#fff1f2', color: '#9f1239' }}
                              >
                                Sat: {breakdown.saturdayHours}h
                              </span>
                            )}
                            {breakdown && breakdown.sundayHours > 0 && (
                              <span
                                className="enhancement-micro-badge"
                                style={{ background: '#ecfdf5', color: '#047857' }}
                              >
                                Sun: {breakdown.sundayHours}h
                              </span>
                            )}
                            {breakdown && breakdown.bankHolidayHours > 0 && (
                              <span
                                className="enhancement-micro-badge"
                                style={{ background: '#fffbeb', color: '#92400e' }}
                              >
                                BH: {breakdown.bankHolidayHours}h
                              </span>
                            )}
                            {breakdown && breakdown.plainDayHours > 0 && (
                              <span
                                className="enhancement-micro-badge"
                                style={{ background: '#eff6ff', color: 'var(--nhs-blue)' }}
                              >
                                Day: {breakdown.plainDayHours}h
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="nav-arrow-btn"
                            onClick={() => onEditShift(shift)}
                            title="Edit shift"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="nav-arrow-btn"
                            style={{ color: 'var(--rose)' }}
                            onClick={() => onDeleteShift(shift.id)}
                            title="Delete shift"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
