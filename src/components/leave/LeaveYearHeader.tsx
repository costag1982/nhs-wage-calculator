import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaveYearHeaderProps {
  formattedLeaveYearRange: string;
  countdownText: string;
  onPrevYear: () => void;
  onNextYear: () => void;
}

export const LeaveYearHeader: React.FC<LeaveYearHeaderProps> = ({
  formattedLeaveYearRange,
  countdownText,
  onPrevYear,
  onNextYear,
}) => {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.015em',
          }}
        >
          {formattedLeaveYearRange}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onPrevYear}
            title="Previous leave year"
            aria-label="Previous leave year"
            style={{ padding: '4px' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onNextYear}
            title="Next leave year"
            aria-label="Next leave year"
            style={{ padding: '4px' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        style={{
          fontSize: '1.05rem',
          fontWeight: 500,
          color: 'var(--text-muted)',
          marginTop: '4px',
        }}
      >
        Entitlement Balance
      </div>

      <div
        style={{
          fontSize: '1.3rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          marginTop: '2px',
        }}
      >
        Annual Leave
      </div>

      <div
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          marginTop: '3px',
          fontWeight: 400,
        }}
      >
        {countdownText}
      </div>
    </div>
  );
};
