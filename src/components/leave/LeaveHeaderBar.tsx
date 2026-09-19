import React from 'react';
import { ArrowLeft, Search, Plus } from 'lucide-react';

interface LeaveHeaderBarProps {
  onBack?: () => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBookLeaveClick: () => void;
}

export const LeaveHeaderBar: React.FC<LeaveHeaderBarProps> = ({
  onBack,
  isSearchOpen,
  onToggleSearch,
  searchQuery,
  onSearchChange,
  onBookLeaveClick,
}) => {
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 0.5rem',
          marginBottom: '0.75rem',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button
              type="button"
              className="nav-arrow-btn"
              onClick={onBack}
              title="Back to Monthly Roster"
              aria-label="Back to Monthly Roster"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-light)',
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              margin: 0,
              color: 'var(--text-main)',
              letterSpacing: '-0.01em',
            }}
          >
            Leave
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onToggleSearch}
            title="Search leave episodes"
            aria-label="Search leave episodes"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-light)',
              background: isSearchOpen ? 'var(--surface-hover)' : 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onBookLeaveClick}
            title="Book Annual Leave Shift"
            aria-label="Book Annual Leave Shift"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div style={{ marginBottom: '1rem', padding: '0 0.25rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search leave episodes by date, status, or days..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
          />
        </div>
      )}
    </>
  );
};
