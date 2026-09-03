import React, { useMemo } from 'react';
import { EmployeeProfile } from '../../domain/models/Contract';
import { Shift } from '../../domain/models/Shift';
import { calculateAnnualLeaveBalance } from '../../domain/services/annualLeaveCalculator';
import { Palmtree, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react';

interface LeaveTrackerViewProps {
  profile: EmployeeProfile;
  shifts: Shift[];
  activeMonthDate: Date;
  onBookLeaveClick: () => void;
  onEditShift?: (shift: Shift) => void;
  onOpenSettings?: () => void;
}

export const LeaveTrackerView: React.FC<LeaveTrackerViewProps> = ({
  profile,
  shifts,
  activeMonthDate,
  onBookLeaveClick,
  onEditShift,
  onOpenSettings,
}) => {
  const balanceSummary = useMemo(() => {
    return calculateAnnualLeaveBalance(profile, shifts, activeMonthDate);
  }, [profile, shifts, activeMonthDate]);

  const {
    entitlement,
    countdownText,
    leaveYearStart,
    leaveYearEnd,
    requestedHours,
    approvedHours,
    takenHours,
    remainingHours,
    episodes,
    approvedEpisodesCount,
    rejectedEpisodesCount,
  } = balanceSummary;

  // Format date range e.g. "01 Apr 2026-31 Mar 2027"
  const formattedLeaveYearRange = useMemo(() => {
    const parse = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    };
    const start = parse(leaveYearStart);
    const end = parse(leaveYearEnd);

    const fmt = (d: Date) => {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    };
    return `${fmt(start)}-${fmt(end)}`;
  }, [leaveYearStart, leaveYearEnd]);

  // Donut chart calculations
  const totalPot = entitlement.totalEntitlementHours || 192.5;
  const takenPct = Math.min(100, (takenHours / totalPot) * 100);
  const approvedPct = Math.min(100 - takenPct, (approvedHours / totalPot) * 100);
  const requestedPct = Math.min(100 - takenPct - approvedPct, (requestedHours / totalPot) * 100);

  // SVG circular stroke parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 14;

  const takenStrokeDash = (takenPct / 100) * circumference;
  const approvedStrokeDash = (approvedPct / 100) * circumference;
  const requestedStrokeDash = (requestedPct / 100) * circumference;

  // Offsets for stacked donut segments
  const takenOffset = 0;
  const approvedOffset = -takenStrokeDash;
  const requestedOffset = -(takenStrokeDash + approvedStrokeDash);

  return (
    <div
      className="leave-tracker-container"
      style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '2.5rem' }}
    >
      {/* Top Header matching Allocate HealthRoster */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0.5rem 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Palmtree size={20} />
          </div>
          <div>
            <h1
              style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}
            >
              Leave
            </h1>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              NHS Agenda for Change Section 13 Entitlement & HealthRoster Tracker
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onBookLeaveClick}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
        >
          <Plus size={16} />
          Book Leave
        </button>
      </div>

      {/* Main Entitlement Balance Card */}
      <div
        className="card"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Leave Year Header */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.01em',
            }}
          >
            {formattedLeaveYearRange}
          </div>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}
          >
            Entitlement Balance
          </div>
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginTop: '4px',
            }}
          >
            Annual Leave
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            {countdownText}
          </div>
        </div>

        {/* Donut Chart & Legend Display */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-around',
            gap: '1.5rem',
            padding: '1rem 0 1.5rem 0',
            borderBottom: '1px solid var(--border-light)',
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
            }}
          >
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              style={{ transform: 'rotate(-90deg)' }}
            >
              {/* Background Track */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
              />
              {/* Taken Segment (Green) */}
              {takenPct > 0 && (
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
              {/* Approved Segment (Blue) */}
              {approvedPct > 0 && (
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
              {/* Requested Segment (Yellow) */}
              {requestedPct > 0 && (
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
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  lineHeight: 1,
                }}
              >
                {remainingHours}
                <span style={{ fontSize: '1.4rem', fontWeight: 600 }}>h</span>
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                remaining
              </span>
            </div>
          </div>

          {/* Stats Legend (Requested / Approved / Taken) */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: '150px' }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
              }}
            >
              Hours
            </div>

            {/* Requested */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#eab308',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {requestedHours}
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Requested
              </span>
            </div>

            {/* Approved */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {approvedHours}
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Approved
              </span>
            </div>

            {/* Taken */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {takenHours}
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Taken
              </span>
            </div>
          </div>
        </div>

        {/* Entitlement Table Breakdown */}
        <div style={{ paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-main)' }}>Base</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                {entitlement.baseHours.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Carry Forward</span>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                {entitlement.carryOverHours.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>In Lieu</span>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Continuous Service</span>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Adjustment Amount</span>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>0</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.05rem',
                borderTop: '1px solid var(--border-light)',
                paddingTop: '0.65rem',
                marginTop: '0.2rem',
              }}
            >
              <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Total</span>
              <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                {entitlement.totalEntitlementHours.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
          }}
        >
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Episodes{' '}
            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)' }}>
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
            <Palmtree
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
              No Leave Booked Yet
            </h3>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                maxWidth: '380px',
                margin: '0 auto 1.25rem auto',
              }}
            >
              You have {entitlement.totalEntitlementHours}h of annual leave available for the{' '}
              {formattedLeaveYearRange} leave year.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onBookLeaveClick}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} />
              Book First Leave Shift
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {episodes.map((episode) => {
              const isRejected = episode.status === 'REJECTED';
              const isRequested = episode.status === 'REQUESTED';

              const statusBadgeColor = isRejected ? '#dc2626' : isRequested ? '#d97706' : '#059669';

              const barColor = isRejected ? '#f87171' : isRequested ? '#f59e0b' : '#10b981';

              const targetShift =
                onEditShift && episode.shiftIds.length > 0
                  ? shifts.find((s) => s.id === episode.shiftIds[0])
                  : undefined;

              return (
                <div
                  key={episode.id}
                  className="card"
                  onClick={() => {
                    if (targetShift && onEditShift) {
                      onEditShift(targetShift);
                    }
                  }}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    padding: '0.9rem 1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${barColor}`,
                    transition: 'box-shadow 0.15s ease',
                    cursor: targetShift ? 'pointer' : 'default',
                  }}
                  title={targetShift ? 'Click to edit leave shift' : undefined}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: statusBadgeColor,
                          textTransform: 'capitalize',
                        }}
                      >
                        {episode.status.toLowerCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}
                      >
                        {episode.daysCount} {episode.daysCount === 1 ? 'day' : 'days'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {episode.totalHours}h deducted
                      </div>
                    </div>

                    {isRejected ? (
                      <XCircle size={22} style={{ color: '#dc2626' }} />
                    ) : isRequested ? (
                      <AlertCircle size={22} style={{ color: '#d97706' }} />
                    ) : (
                      <CheckCircle2 size={22} style={{ color: '#059669' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AfC Section 13 Guidance Card */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '1.15rem 1.35rem',
          fontSize: '0.8125rem',
          color: 'var(--text-main)',
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Calendar size={16} style={{ color: 'var(--primary)' }} />
          NHS Agenda for Change (Section 13) Shift Rules
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: '1.25rem',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}
        >
          <li>
            <strong>Hours Deduction:</strong> When you book leave against a rostered shift, only the
            exact net hours of that shift are deducted (e.g. 10.0h for Night Duty, 11.0h for a Long
            Day).
          </li>
          <li>
            <strong>Unpaid Breaks:</strong> Meal breaks are unpaid and therefore never deducted from
            your annual leave allowance.
          </li>
          <li>
            <strong>Public Holidays:</strong> Bank holidays ({entitlement.bankHolidayHours}h) are
            included inside your {entitlement.totalEntitlementHours}h total entitlement.
          </li>
          <li>
            <strong>AfC Absence Pay:</strong> When you take annual leave, you receive your basic pay
            plus Section 13 "AfC Absence" enhancements for unsocial hours earned over prior months.
          </li>
        </ul>
      </div>
    </div>
  );
};
