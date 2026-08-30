import React from 'react';
import { EmployeeProfile } from '../../domain/models/Contract';
import { RecurringCommitment } from '../../domain/models/Deductions';
import { SyncStatus } from '../../domain/services/cloudSyncService';
import { PayBandSection } from './sections/PayBandSection';
import { AnnualLeaveSection } from './sections/AnnualLeaveSection';
import { TaxPensionSection } from './sections/TaxPensionSection';
import { CommitmentsSection } from './sections/CommitmentsSection';
import { EmployeeDetailsSection } from './sections/EmployeeDetailsSection';
import { CloudSyncSection } from './sections/CloudSyncSection';
import { DatabaseSection } from './sections/DatabaseSection';
import { SecuritySection } from './sections/SecuritySection';
import { X, RotateCcw, Check } from 'lucide-react';

export interface SettingsDrawerProps {
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
  onLogout?: () => void;
  syncStatus?: SyncStatus;
  lastSyncedAt?: string | null;
  onTriggerSync?: () => void;
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
  onLogout,
  syncStatus = 'unconfigured',
  lastSyncedAt = null,
  onTriggerSync,
}) => {
  if (!isOpen) return null;

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
          {/* 1. Contract & Pay Band Section */}
          <PayBandSection profile={profile} onUpdateProfile={onUpdateProfile} />

          {/* 2. NHS Annual Leave Entitlement (AfC Section 13) */}
          <AnnualLeaveSection profile={profile} onUpdateProfile={onUpdateProfile} />

          {/* 3. Tax, NI & Pension Section */}
          <TaxPensionSection profile={profile} onUpdateProfile={onUpdateProfile} />

          {/* 4. Recurring Deductions & Commitments */}
          <CommitmentsSection
            commitments={commitments}
            onAddCommitment={onAddCommitment}
            onRemoveCommitment={onRemoveCommitment}
          />

          {/* 5. Employee & Hospital Info */}
          <EmployeeDetailsSection profile={profile} onUpdateProfile={onUpdateProfile} />

          {/* 6. Cloud Backup & Multi-Device Sync Section */}
          <CloudSyncSection
            syncStatus={syncStatus}
            lastSyncedAt={lastSyncedAt}
            onTriggerSync={onTriggerSync}
          />

          {/* 7. SQLite Database Storage Section */}
          <DatabaseSection onExportSqlite={onExportSqlite} onImportSqlite={onImportSqlite} />

          {/* 8. Security & Access Session */}
          {onLogout && <SecuritySection onLogout={onLogout} />}
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
