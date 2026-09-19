import React from 'react';

interface LeaveDonutChartProps {
  remainingHours: number;
  requestedHours: number;
  approvedHours: number;
  takenHours: number;
  totalPot: number;
}

interface LeaveStatBadgeProps {
  label: string;
  hours: number;
  color: string;
  shadowColor: string;
}

const LeaveStatBadge: React.FC<LeaveStatBadgeProps> = ({ label, hours, color, shadowColor }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: color,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.92rem',
        boxShadow: `0 2px 6px ${shadowColor}`,
      }}
    >
      {hours}
    </div>
    <span
      style={{
        fontSize: '0.95rem',
        fontWeight: 600,
        color: 'var(--text-main)',
      }}
    >
      {label}
    </span>
  </div>
);

export const LeaveDonutChart: React.FC<LeaveDonutChartProps> = ({
  remainingHours,
  requestedHours,
  approvedHours,
  takenHours,
  totalPot,
}) => {
  const safePot = totalPot > 0 ? totalPot : 187.5;
  const approvedFraction = Math.min(1, Math.max(0, approvedHours / safePot));
  const takenFraction = Math.min(1 - approvedFraction, Math.max(0, takenHours / safePot));
  const requestedFraction = Math.min(
    1 - approvedFraction - takenFraction,
    Math.max(0, requestedHours / safePot)
  );

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 15;

  const approvedStrokeDash = approvedFraction * circumference;
  const takenStrokeDash = takenFraction * circumference;
  const requestedStrokeDash = requestedFraction * circumference;

  const approvedOffset = 0;
  const takenOffset = -approvedStrokeDash;
  const requestedOffset = -(approvedStrokeDash + takenStrokeDash);

  const statBadges: LeaveStatBadgeProps[] = [
    {
      label: 'Requested',
      hours: requestedHours,
      color: '#eab308',
      shadowColor: 'rgba(234, 179, 8, 0.25)',
    },
    {
      label: 'Approved',
      hours: approvedHours,
      color: '#3b82f6',
      shadowColor: 'rgba(59, 130, 246, 0.25)',
    },
    {
      label: 'Taken',
      hours: takenHours,
      color: '#22c55e',
      shadowColor: 'rgba(34, 197, 94, 0.25)',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '1.5rem',
        padding: '0.5rem 0 1.5rem 0',
      }}
    >
      {/* Circular Donut Ring */}
      <div
        style={{
          position: 'relative',
          width: '180px',
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />

          {/* 1. Approved Segment (Blue) */}
          {approvedFraction > 0 && (
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              strokeDasharray={`${approvedStrokeDash} ${circumference}`}
              strokeDashoffset={approvedOffset}
              strokeLinecap="round"
            />
          )}

          {/* 2. Taken Segment (Green) */}
          {takenFraction > 0 && (
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#22c55e"
              strokeWidth={strokeWidth}
              strokeDasharray={`${takenStrokeDash} ${circumference}`}
              strokeDashoffset={takenOffset}
              strokeLinecap="round"
            />
          )}

          {/* 3. Requested Segment (Yellow) */}
          {requestedFraction > 0 && (
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#eab308"
              strokeWidth={strokeWidth}
              strokeDasharray={`${requestedStrokeDash} ${circumference}`}
              strokeDashoffset={requestedOffset}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Centre Text */}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {remainingHours}
            <span style={{ fontSize: '1.45rem', fontWeight: 600 }}>h</span>
          </span>
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
              fontWeight: 500,
            }}
          >
            remaining
          </span>
        </div>
      </div>

      {/* Stats Legend (Requested / Approved / Taken) matching HealthRoster */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          minWidth: '150px',
        }}
      >
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'lowercase',
            color: 'var(--text-muted)',
            letterSpacing: '0.02em',
          }}
        >
          hours
        </div>

        {statBadges.map((badge) => (
          <LeaveStatBadge key={badge.label} {...badge} />
        ))}
      </div>
    </div>
  );
};
