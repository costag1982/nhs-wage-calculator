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
            <option value={0.052}>Tier 1 - 5.2% (Up to £13,245)</option>
            <option value={0.065}>Tier 2 / Band 2 - 6.5% (£13,246 - £25,147)</option>
            <option value={0.083}>Tier 5 - 8.3% (£25,148 - £31,349)</option>
            <option value={0.098}>Tier 6 - 9.8% (£31,350 - £49,245)</option>
            <option value={0.107}>Tier 7 - 10.7% (£49,246 - £62,925)</option>
            <option value={0.125}>Tier 8 - 12.5% (£62,926+)</option>
            <option value={0.0}>0.0% (Opted Out)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
