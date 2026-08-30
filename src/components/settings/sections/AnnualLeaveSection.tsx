import React from 'react';
import { EmployeeProfile, NhsServiceYearsTier } from '../../../domain/models/Contract';
import { NHS_LEAVE_TIERS } from '../../../domain/constants/annualLeave';
import { AnnualLeaveCalculator } from '../../../domain/services/AnnualLeaveCalculator';
import { Palmtree } from 'lucide-react';

interface AnnualLeaveSectionProps {
  profile: EmployeeProfile;
  onUpdateProfile: (updated: Partial<EmployeeProfile>) => void;
}

export const AnnualLeaveSection: React.FC<AnnualLeaveSectionProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const leaveEntitlement = AnnualLeaveCalculator.calculateEntitlement(profile);

  return (
    <div>
      <div className="settings-section-title">
        <Palmtree size={16} style={{ display: 'inline', marginRight: '6px' }} />
        NHS Annual Leave Entitlement (AfC Section 13)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                {t.label} ({t.description})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="settings-carry-over">
              Annual Leave Carry-Over (Hours)
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

          <div className="form-group">
            <label className="form-label">Calculated Annual Entitlement</label>
            <div
              style={{
                padding: '0.6rem 0.75rem',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Total Pot:</span>
              <span>{leaveEntitlement.totalEntitlementHours} hrs</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 0.85rem',
            fontSize: '0.8125rem',
            color: '#065f46',
            lineHeight: 1.4,
          }}
        >
          <div>
            <strong>Pro-rata AfC Breakdown ({profile.contractedWeeklyHours}h/wk):</strong>
          </div>
          <div style={{ marginTop: '4px' }}>
            • Annual Leave: <strong>{leaveEntitlement.annualLeaveHours}h</strong> (
            {leaveEntitlement.annualLeaveDays} days ×{' '}
            {((profile.contractedWeeklyHours / 37.5) * 7.5).toFixed(2)}h)
          </div>
          <div>
            • General Public Holidays: <strong>{leaveEntitlement.bankHolidayHours}h</strong> (8 Bank
            Holidays × {((profile.contractedWeeklyHours / 37.5) * 7.5).toFixed(2)}h)
          </div>
          {leaveEntitlement.carryOverHours > 0 && (
            <div>
              • Carried forward: <strong>{leaveEntitlement.carryOverHours}h</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
