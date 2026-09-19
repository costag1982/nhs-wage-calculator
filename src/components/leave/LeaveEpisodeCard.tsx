import React from 'react';
import { AnnualLeaveEpisode } from '../../domain/services/annualLeaveCalculator';
import { Shift } from '../../domain/models/Shift';
import { Clock, FileText, ShieldCheck, Lock, XCircle, AlertCircle } from 'lucide-react';

interface LeaveEpisodeCardProps {
  episode: AnnualLeaveEpisode;
  targetShift?: Shift;
  onEditShift?: (shift: Shift) => void;
}

export const LeaveEpisodeCard: React.FC<LeaveEpisodeCardProps> = ({
  episode,
  targetShift,
  onEditShift,
}) => {
  const isRejected = episode.status === 'REJECTED';
  const isRequested = episode.status === 'REQUESTED';

  // Visual accent bar on left matching Allocate HealthRoster
  const barColor = isRejected ? '#ef4444' : isRequested ? '#f59e0b' : '#c5a059';

  const handleClick = () => {
    if (targetShift && onEditShift) {
      onEditShift(targetShift);
    }
  };

  const statusLabel =
    episode.status === 'APPROVED' || episode.status === 'TAKEN'
      ? 'Approved'
      : episode.status === 'REQUESTED'
        ? 'Requested'
        : 'Rejected';

  return (
    <div
      className="card"
      onClick={handleClick}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        padding: '0.95rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: `4px solid ${barColor}`,
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        cursor: targetShift ? 'pointer' : 'default',
      }}
      title={targetShift ? 'Click to edit leave shift' : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: isRejected ? '#ef4444' : isRequested ? '#d97706' : 'var(--text-main)',
          }}
        >
          {statusLabel}
        </div>

        <div
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--text-main)',
          }}
        >
          Annual Leave
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}
        >
          <Clock size={13} />
          <span>{episode.formattedDateRange}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}
          >
            {episode.daysCount} {episode.daysCount === 1 ? 'day' : 'days'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {episode.totalHours}h
          </div>
        </div>

        {/* Allocate HealthRoster Status Icons */}
        {isRejected ? (
          <div style={{ color: '#ef4444' }} title="Rejected">
            <XCircle size={20} />
          </div>
        ) : isRequested ? (
          <div style={{ color: '#d97706' }} title="Requested">
            <AlertCircle size={20} />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--text-muted)',
            }}
          >
            <span title="Leave record logged" style={{ display: 'inline-flex' }}>
              <FileText size={16} />
            </span>
            <span title="Approved by roster manager" style={{ display: 'inline-flex' }}>
              <ShieldCheck size={16} />
            </span>
            <span title="Locked in roster" style={{ display: 'inline-flex' }}>
              <Lock size={16} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
