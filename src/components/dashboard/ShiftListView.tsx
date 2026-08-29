import React from 'react';
import { Shift } from '../../domain/models/Shift';
import { Edit2, Trash2, CalendarPlus, Clock } from 'lucide-react';

interface ShiftListViewProps {
  shifts: Shift[];
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;
  onAddShiftClick: () => void;
}

export const ShiftListView: React.FC<ShiftListViewProps> = ({
  shifts,
  onEditShift,
  onDeleteShift,
  onAddShiftClick,
}) => {
  const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date));

  if (sortedShifts.length === 0) {
    return (
      <div
        className="roster-table-card"
        style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}
      >
        <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '0.5rem',
          }}
        >
          No shifts scheduled for this month
        </h3>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Click on any day in the calendar or click the button below to add your first shift.
        </p>
        <button type="button" className="btn btn-primary" onClick={onAddShiftClick}>
          <CalendarPlus size={16} />
          Add First Shift
        </button>
      </div>
    );
  }

  return (
    <div className="roster-table-card">
      <table className="roster-table">
        <thead>
          <tr>
            <th className="text-left">Date</th>
            <th className="text-left">Shift</th>
            <th className="text-center">Hours</th>
            <th className="text-center">Break</th>
            <th className="text-center">Paid Total</th>
            <th className="text-left">Unsocial Breakdown</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedShifts.map((shift) => {
            const [y, m, d] = shift.date.split('-').map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const dayFormatted = dateObj.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              timeZone: 'UTC',
            });

            const breakdown = shift.breakdown;

            return (
              <tr key={shift.id}>
                <td className="text-left font-bold">{dayFormatted}</td>
                <td className="text-left">
                  <span style={{ fontWeight: 600 }}>
                    {shift.presetType ? shift.presetType.replace('_', ' ') : 'Custom'}
                  </span>
                  {shift.shiftType === 'BANK' && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#4338ca',
                        background: '#e0e7ff',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      Bank
                    </span>
                  )}
                  {shift.overrideBand && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: 'var(--nhs-blue)',
                        background: '#e0f2fe',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      {shift.overrideBand}
                    </span>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {shift.startTime} - {shift.endTime}
                  </div>
                </td>
                <td className="text-center tabular-nums">
                  {shift.startTime} - {shift.endTime}
                </td>
                <td className="text-center tabular-nums">{shift.unpaidBreakMinutes}m</td>
                <td className="text-center tabular-nums font-bold">
                  {breakdown?.totalWorkedHours} hrs
                </td>
                <td className="text-left">
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
                </td>
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
          })}
        </tbody>
      </table>
    </div>
  );
};
