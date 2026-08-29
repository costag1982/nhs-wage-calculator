import React, { useState } from 'react';
import { EmployeeProfile, NhsBandLevel, ContractType } from '../../domain/models/Contract';
import { RecurringCommitment } from '../../domain/models/Deductions';
import { NHS_BAND_CONFIGS } from '../../domain/constants/nhsBands';
import {
  X,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  User,
  Building,
  Landmark,
  Percent,
  Database,
  Download,
  Upload,
} from 'lucide-react';

interface SettingsDrawerProps {
  isOpen: boolean;
  profile: EmployeeProfile;
  commitments: RecurringCommitment[];
  onClose: () => void;
  onUpdateProfile: (updated: Partial<EmployeeProfile>) => void;
  onAddCommitment: (commitment: Omit<RecurringCommitment, 'id'>) => void;
  onRemoveCommitment: (id: string) => void;
  onResetDefaults: () => void;
  onExportSqlite: () => void;
  onImportSqlite: (file: File) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  profile,
  commitments,
  onClose,
  onUpdateProfile,
  onAddCommitment,
  onRemoveCommitment,
  onResetDefaults,
  onExportSqlite,
  onImportSqlite,
}) => {
  const [newCommitmentName, setNewCommitmentName] = useState('');
  const [newCommitmentAmount, setNewCommitmentAmount] = useState('');

  if (!isOpen) return null;

  const handleBandChange = (newBand: NhsBandLevel) => {
    const config = NHS_BAND_CONFIGS[newBand];
    onUpdateProfile({
      band: newBand,
      fullTimeSalaryFte: config ? config.defaultFteSalary : profile.fullTimeSalaryFte,
    });
  };

  const handleAddCommitmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentName || !newCommitmentAmount) return;
    onAddCommitment({
      name: newCommitmentName,
      amount: parseFloat(newCommitmentAmount),
    });
    setNewCommitmentName('');
    setNewCommitmentAmount('');
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
              Staff & Pay Settings
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Configure your contract, NHS pay band, and deductions
            </p>
          </div>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Contract & Pay Band Section */}
          <div>
            <div className="settings-section-title">
              <Landmark size={16} style={{ display: 'inline', marginRight: '6px' }} />
              NHS Pay Band & Contract
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Agenda for Change Band</label>
                <select
                  className="form-select"
                  value={profile.band}
                  onChange={(e) => handleBandChange(e.target.value as NhsBandLevel)}
                >
                  {Object.keys(NHS_BAND_CONFIGS).map((band) => (
                    <option key={band} value={band}>
                      {band} (
                      {band === 'Band 2' || band === 'Band 3'
                        ? 'Nights/Sat +41%, Sun +83%'
                        : 'Nights/Sat +30%, Sun +60%'}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full-Time FTE Salary (£)</label>
                  <input
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
                  <label className="form-label">Contract Type</label>
                  <select
                    className="form-select"
                    value={profile.contractType}
                    onChange={(e) =>
                      onUpdateProfile({ contractType: e.target.value as ContractType })
                    }
                  >
                    <option value="SUBSTANTIVE">Substantive (Monthly Salary)</option>
                    <option value="BANK_HOURLY">Bank / Hourly Only</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contracted Weekly Hours</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.5"
                    value={profile.contractedWeeklyHours}
                    onChange={(e) =>
                      onUpdateProfile({ contractedWeeklyHours: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Standard Full-Time (FTE) Hours</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.5"
                    value={profile.standardFullTimeHours}
                    onChange={(e) =>
                      onUpdateProfile({ standardFullTimeHours: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tax, NI & Pension Section */}
          <div>
            <div className="settings-section-title">
              <Percent size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Tax, National Insurance & Pension
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tax Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profile.taxCode}
                    onChange={(e) => onUpdateProfile({ taxCode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">NI Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profile.niCategory}
                    onChange={(e) => onUpdateProfile({ niCategory: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">NHS Pension Contribution Rate</label>
                <select
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

          {/* Recurring Deductions & Commitments */}
          <div>
            <div className="settings-section-title">
              <Building size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Recurring Commitments & Voluntary Deductions
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {commitments.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</span>
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      (Monthly)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="tabular-nums font-bold" style={{ color: 'var(--rose)' }}>
                      -£{item.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="nav-arrow-btn"
                      style={{ color: 'var(--rose)', width: '28px', height: '28px' }}
                      onClick={() => onRemoveCommitment(item.id)}
                      title="Remove commitment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add New Commitment Form */}
              <form
                onSubmit={handleAddCommitmentSubmit}
                style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}
              >
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Unison Union Fee"
                  style={{ flex: 1.5 }}
                  value={newCommitmentName}
                  onChange={(e) => setNewCommitmentName(e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="£ Amount"
                  style={{ flex: 1 }}
                  value={newCommitmentAmount}
                  onChange={(e) => setNewCommitmentAmount(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 0.85rem' }}
                >
                  <Plus size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Employee & Hospital Info */}
          <div>
            <div className="settings-section-title">
              <User size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Employee & Hospital Details (ESR Header)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Employee Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.employeeName}
                  onChange={(e) => onUpdateProfile({ employeeName: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profile.department}
                    onChange={(e) => onUpdateProfile({ department: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profile.jobTitle}
                    onChange={(e) => onUpdateProfile({ jobTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hospital / Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.location}
                  onChange={(e) => onUpdateProfile({ location: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* SQLite Database Storage Section */}
          <div>
            <div className="settings-section-title">
              <Database size={16} style={{ display: 'inline', marginRight: '6px' }} />
              SQLite Local Database (Wasm)
            </div>

            <div
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Your shifts, contracts, and commitments are saved in an in-browser{' '}
                <strong>SQLite database</strong> with persistent local storage. You can backup your
                database or restore from a previous file.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.8125rem' }}
                  onClick={onExportSqlite}
                  title="Download .sqlite database file"
                >
                  <Download size={14} />
                  Export .sqlite DB
                </button>

                <label
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.8125rem', cursor: 'pointer' }}
                  title="Upload .sqlite database file"
                >
                  <Upload size={14} />
                  Import .sqlite DB
                  <input
                    type="file"
                    accept=".sqlite,.db"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onImportSqlite(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--bg-app)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetDefaults}
            title="Reset to Miss Gemma Howard Band 2 settings"
          >
            <RotateCcw size={14} />
            Reset to Gemma's Defaults
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            <Check size={16} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
