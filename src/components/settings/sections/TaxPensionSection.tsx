import React from 'react';
import { EmployeeProfile } from '../../../domain/models/Contract';
import { Percent } from 'lucide-react';

interface TaxPensionSectionProps {
  profile: EmployeeProfile;
  onUpdateProfile: (updated: Partial<EmployeeProfile>) => void;
}

export const TaxPensionSection: React.FC<TaxPensionSectionProps> = ({
  profile,
  onUpdateProfile,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-title">
        <Percent size={17} />
        <span>Tax, National Insurance & Pension</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="settings-tax-code">
              Tax Code
            </label>
            <input
              id="settings-tax-code"
              type="text"
              className="form-input"
              value={profile.taxCode}
              onChange={(e) => onUpdateProfile({ taxCode: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settings-ni-category">
              NI Category
            </label>
            <input
              id="settings-ni-category"
              type="text"
              className="form-input"
              value={profile.niCategory}
              onChange={(e) => onUpdateProfile({ niCategory: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="settings-pension-rate">
            NHS Pension Contribution Rate
          </label>
          <select
            id="settings-pension-rate"
            className="form-select"
            value={profile.pensionContributionRate}
            onChange={(e) =>
              onUpdateProfile({ pensionContributionRate: parseFloat(e.target.value) })
            }
          >
            <option value={0.052}>Tier 1 - 5.2% (Up to £13,259)</option>
            <option value={0.065}>Tier 2 - 6.5% (£13,260 - £28,854)</option>
            <option value={0.083}>Tier 3 - 8.3% (£28,855 - £35,155)</option>
            <option value={0.098}>Tier 4 - 9.8% (£35,156 - £52,778)</option>
            <option value={0.107}>Tier 5 - 10.7% (£52,779 - £67,668)</option>
            <option value={0.125}>Tier 6 - 12.5% (£67,669+)</option>
            <option value={0.0}>0.0% (Opted Out)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="settings-afc-absence-rate">
            AfC Absence Historical Average (£/leave hour, optional)
          </label>
          <input
            id="settings-afc-absence-rate"
            type="number"
            step="0.0001"
            min="0"
            className="form-input"
            value={profile.afcAbsenceHourlyRateOverride ?? ''}
            placeholder="Calculated from the previous 3 months when blank"
            onChange={(event) =>
              onUpdateProfile({
                afcAbsenceHourlyRateOverride: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
          />
          <span className="form-help">
            Use payroll's historical average where known. Otherwise the forecast uses the previous
            three roster months stored in this calculator.
          </span>
        </div>
      </div>
    </div>
  );
};
