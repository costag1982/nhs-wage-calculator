import React from 'react';
import { AnnualLeaveEpisode } from '../../domain/services/annualLeaveCalculator';
import { Shift } from '../../domain/models/Shift';
import { LeaveEpisodeCard } from './LeaveEpisodeCard';
import { Calendar, Plus } from 'lucide-react';

interface LeaveEpisodesListProps {
  episodes: AnnualLeaveEpisode[];
  approvedEpisodesCount: number;
  rejectedEpisodesCount: number;
  remainingHours: number;
  formattedLeaveYearRange: string;
  searchQuery: string;
  shifts: Shift[];
  onBookLeaveClick: () => void;
  onEditShift?: (shift: Shift) => void;
  onOpenSettings?: () => void;
}

export const LeaveEpisodesList: React.FC<LeaveEpisodesListProps> = ({
  episodes,
  approvedEpisodesCount,
  rejectedEpisodesCount,
  remainingHours,
  formattedLeaveYearRange,
  searchQuery,
  shifts,
  onBookLeaveClick,
  onEditShift,
  onOpenSettings,
}) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
          padding: '0 0.25rem',
        }}
      >
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Episodes{' '}
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 400,
              color: 'var(--text-muted)',
              marginLeft: '0.4rem',
            }}
          >
            {approvedEpisodesCount} approved
            {rejectedEpisodesCount > 0 ? `, ${rejectedEpisodesCount} rejected` : ''}
          </span>
        </div>

        {onOpenSettings && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
            onClick={onOpenSettings}
          >
            Contract Rules
          </button>
        )}
      </div>

      {episodes.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-light)',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <Calendar
            size={32}
            style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }}
          />
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              margin: '0 0 0.25rem 0',
            }}
          >
            {searchQuery ? 'No Matching Episodes' : 'No Leave Episodes Recorded'}
          </h3>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              maxWidth: '380px',
              margin: '0 auto 1.25rem auto',
            }}
          >
            {searchQuery
              ? `No leave episodes match "${searchQuery}".`
              : `You have ${remainingHours}h available for the ${formattedLeaveYearRange} leave year.`}
          </p>
          {!searchQuery && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onBookLeaveClick}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} />
              Book Leave Shift
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {episodes.map((episode) => {
            const targetShift =
              onEditShift && episode.shiftIds.length > 0
                ? shifts.find((s) => s.id === episode.shiftIds[0])
                : undefined;

            return (
              <LeaveEpisodeCard
                key={episode.id}
                episode={episode}
                targetShift={targetShift}
                onEditShift={onEditShift}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
