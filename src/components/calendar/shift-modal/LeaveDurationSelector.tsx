import React from 'react';
import { Clock, Info } from 'lucide-react';

interface LeaveDurationSelectorProps {
  hours: number;
  minutes: number;
  onChangeDuration: (hours: number, minutes: number) => void;
}

const MINUTE_OPTIONS = [0, 15, 30, 45];

export const LeaveDurationSelector: React.FC<LeaveDurationSelectorProps> = ({
  hours,
  minutes,
  onChangeDuration,
}) => {
  const decimalHours = Math.round((hours + minutes / 60) * 100) / 100;

  const formattedSummary =
    hours > 0 && minutes > 0
      ? `${hours} hrs ${minutes} mins`
      : hours > 0
        ? `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
        : `${minutes} mins`;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '0.95rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <label
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <Clock size={16} style={{ color: 'var(--primary)' }} />
          Leave Duration Selector
        </label>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: '#047857',
            background: '#ecfdf5',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            border: '1px solid #a7f3d0',
          }}
        >
          {formattedSummary} ({decimalHours}h)
        </span>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label
            className="form-label"
            htmlFor="leave-duration-hours"
            style={{ fontSize: '0.8125rem' }}
          >
            Hours
          </label>
          <select
            id="leave-duration-hours"
            className="form-input"
            value={hours}
            onChange={(e) => onChangeDuration(Number(e.target.value), minutes)}
          >
            {Array.from({ length: 25 }, (_, i) => (
              <option key={i} value={i}>
                {i} {i === 1 ? 'hour' : 'hours'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label
            className="form-label"
            htmlFor="leave-duration-minutes"
            style={{ fontSize: '0.8125rem' }}
          >
            Minutes
          </label>
          <select
            id="leave-duration-minutes"
            className="form-input"
            value={minutes}
            onChange={(e) => onChangeDuration(hours, Number(e.target.value))}
          >
            {!MINUTE_OPTIONS.includes(minutes) && <option value={minutes}>{minutes} mins</option>}
            <option value={0}>00 mins</option>
            <option value={15}>15 mins (¼ hr)</option>
            <option value={30}>30 mins (½ hr)</option>
            <option value={45}>45 mins (¾ hr)</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.35,
        }}
      >
        <Info size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
        <span>
          Start and finish times are not required; only total hours and minutes are deducted.
        </span>
      </div>
    </div>
  );
};
