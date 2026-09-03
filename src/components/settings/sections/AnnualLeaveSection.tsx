import React from 'react';
import { EmployeeProfile, NhsServiceYearsTier } from '../../../domain/models/Contract';
import { NHS_LEAVE_TIERS } from '../../../domain/constants/annualLeave';
import { calculateAnnualLeaveEntitlement } from '../../../domain/services/annualLeaveCalculator';
import { Palmtree } from 'lucide-react';

interface AnnualLeaveSectionProps {
  profile: EmployeeProfile;
  onUpdateProfile: (updated: Partial<EmployeeProfile>) => void;
}

export const AnnualLeaveSection: React.FC<AnnualLeaveSectionProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const leaveEntitlement = calculateAnnualLeaveEntitlement(profile);

  return (
    <div className="settings-section-card">
      <div className="settings-section-title">
        <Palmtree size={17} />
        <span>NHS Annual Leave (AfC Section 13)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="settings-leave-tier">
            Continuous NHS Service Tier
          </label>
          <select
            id="settings-leave-tier"
            className="form-select"
            value={profile.yearsOfServiceTier || 'UNDER_5'}
            onChange={(e) =>
              onUpdateProfile({ yearsOfServiceTier: e.target.value as NhsServiceYearsTier })
            }
          >
            {Object.values(NHS_LEAVE_TIERS).map((t) => (
              <option key={t.tier} value={t.tier}>
                {t.label} ({t.annualLeaveDays}d Leave + {t.bankHolidayDays}d Bank Holidays)
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="settings-al-base-override">
              Base Entitlement (Hours)
            </label>
            <input
              id="settings-al-base-override"
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g. 192.5"
              className="form-input"
              value={profile.annualLeaveBaseHoursOverride ?? ''}
              onChange={(e) =>
                onUpdateProfile({
                  annualLeaveBaseHoursOverride: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Overrides standard formula (e.g. 192.5h from HealthRoster/ESR)
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settings-carry-over">
              Carry-Over (Hours)
            </label>
            <input
              id="settings-carry-over"
              type="number"
              step="0.5"
              min="0"
              className="form-input"
              value={profile.annualLeaveCarryOverHours || 0}
              onChange={(e) =>
                onUpdateProfile({
                  annualLeaveCarryOverHours: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Total Leave Pot</label>
          <div className="form-input-display">
            <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
              Total Entitlement (Base + Carry-Over):
            </span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem' }}>
              {leaveEntitlement.totalEntitlementHours} hrs
            </span>
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 0.85rem',
            fontSize: '0.8125rem',
            color: 'var(--text-main)',
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
            Pro-rata AfC Breakdown ({profile.contractedWeeklyHours}h/wk):
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            • Annual Leave:{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {leaveEntitlement.annualLeaveHours}h
            </strong>{' '}
            ({leaveEntitlement.annualLeaveDays} days ×{' '}
            {((profile.contractedWeeklyHours / 37.5) * 7.5).toFixed(2)}h)
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            • Public Holidays:{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {leaveEntitlement.bankHolidayHours}h
            </strong>{' '}
            (8 Bank Holidays × {((profile.contractedWeeklyHours / 37.5) * 7.5).toFixed(2)}h)
          </div>
          {leaveEntitlement.carryOverHours > 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              • Carried Forward:{' '}
              <strong style={{ color: 'var(--text-main)' }}>
                {leaveEntitlement.carryOverHours}h
              </strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
