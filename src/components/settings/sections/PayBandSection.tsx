import React from 'react';
import { EmployeeProfile, NhsBandLevel, ContractType } from '../../../domain/models/Contract';
import { NHS_BAND_CONFIGS } from '../../../domain/constants/nhsBands';
import { Landmark } from 'lucide-react';

interface PayBandSectionProps {
  profile: EmployeeProfile;
  onUpdateProfile: (updated: Partial<EmployeeProfile>) => void;
}

export const PayBandSection: React.FC<PayBandSectionProps> = ({ profile, onUpdateProfile }) => {
  const handleBandChange = (newBand: NhsBandLevel) => {
    const config = NHS_BAND_CONFIGS[newBand];
    onUpdateProfile({
      band: newBand,
      fullTimeSalaryFte: config ? config.defaultFteSalary : profile.fullTimeSalaryFte,
    });
  };

  return (
    <div className="settings-section-card">
      <div className="settings-section-title">
        <Landmark size={17} />
        <span>NHS Pay Band & Contract</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="settings-band-select">
            Agenda for Change Band
          </label>
          <select
            id="settings-band-select"
            className="form-select"
            value={profile.band}
            onChange={(e) => handleBandChange(e.target.value as NhsBandLevel)}
          >
            {Object.values(NHS_BAND_CONFIGS).map((config) => (
              <option key={config.band} value={config.band}>
                {config.band} (Nights/Sat +{config.nightEnhancementRate * 100}%, Sun +
                {config.sundayAndHolidayEnhancementRate * 100}%)
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="settings-fte-salary">
              Full-Time FTE Salary (£)
            </label>
            <input
              id="settings-fte-salary"
              type="number"
              className="form-input"
              step="0.01"
              value={profile.fullTimeSalaryFte}
              onChange={(e) =>
                onUpdateProfile({ fullTimeSalaryFte: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settings-contract-type">
              Contract Type
            </label>
            <select
              id="settings-contract-type"
              className="form-select"
              value={profile.contractType}
              onChange={(e) => onUpdateProfile({ contractType: e.target.value as ContractType })}
            >
              <option value="SUBSTANTIVE">Substantive (Monthly Salary)</option>
              <option value="BANK_HOURLY">Bank / Hourly Only</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="settings-contracted-weekly">
              Contracted Weekly Hours
            </label>
            <input
              id="settings-contracted-weekly"
              type="number"
              className="form-input"
              step="0.25"
              value={profile.contractedWeeklyHours}
              onChange={(e) =>
                onUpdateProfile({ contractedWeeklyHours: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settings-standard-fte">
              Standard Full-Time (FTE) Hours
            </label>
            <input
              id="settings-standard-fte"
              type="number"
              className="form-input"
              step="0.25"
              value={profile.standardFullTimeHours}
              onChange={(e) =>
                onUpdateProfile({ standardFullTimeHours: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
