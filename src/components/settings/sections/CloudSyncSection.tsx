import React, { useState } from 'react';
import {
  SyncStatus,
  getSyncConfig,
  saveSyncConfig,
  testSyncConnection,
  isManagedSyncConfig,
} from '../../../domain/services/cloudSyncService';
import { Cloud, RefreshCw, Lock, Key } from 'lucide-react';

interface CloudSyncSectionProps {
  syncStatus?: SyncStatus;
  lastSyncedAt?: string | null;
  onTriggerSync?: () => void;
}

export const CloudSyncSection: React.FC<CloudSyncSectionProps> = ({
  syncStatus = 'unconfigured',
  lastSyncedAt = null,
  onTriggerSync,
}) => {
  const initialConfig = getSyncConfig();
  const [syncToken, setSyncToken] = useState(initialConfig.token);
  const [syncGistId, setSyncGistId] = useState(initialConfig.gistId);
  const [isConfigOpen, setIsConfigOpen] = useState(!initialConfig.token);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(
    null
  );
  const [isTesting, setIsTesting] = useState(false);

  const handleTestAndSave = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSyncConnection(syncToken, syncGistId);
    setIsTesting(false);
    setTestResult(res);
    if (res.success) {
      saveSyncConfig(syncToken, syncGistId);
      onTriggerSync?.();
    }
  };

  const handleDisconnect = () => {
    saveSyncConfig('', '');
    setSyncToken('');
    setSyncGistId('');
    setTestResult({
      success: true,
      message: 'Cloud synchronisation credentials cleared.',
    });
  };

  return (
    <div>
      <div className="settings-section-title">
        <Cloud size={16} style={{ display: 'inline', marginRight: '6px' }} />
        Cloud Backup & Multi-Device Synchronisation
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {syncStatus === 'synced' && '🟢 Cloud Connected & Synced'}
              {syncStatus === 'syncing' && '🔄 Synchronising with Cloud...'}
              {syncStatus === 'offline' && '⚪ Offline Mode (Saved Locally)'}
              {syncStatus === 'error' && '🔴 Synchronisation Issue Detected'}
              {syncStatus === 'unconfigured' && '⚙️ Cloud Backup Not Configured'}
              {syncStatus === 'idle' && '🟢 Cloud Connected (Idle)'}
            </div>
            {lastSyncedAt && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Last backup: {new Date(lastSyncedAt).toLocaleString('en-GB')}
              </p>
            )}
          </div>

          {onTriggerSync && syncStatus !== 'unconfigured' && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
              onClick={onTriggerSync}
              disabled={syncStatus === 'syncing'}
            >
              <RefreshCw size={13} className={syncStatus === 'syncing' ? 'spin' : ''} />
              Sync Now
            </button>
          )}
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Synchronises your shifts and settings seamlessly to a private GitHub Gist so you never
          lose data across browsers or mobile devices.
        </p>

        {isManagedSyncConfig() ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: '#15803d',
              backgroundColor: '#f0fdf4',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #bbf7d0',
            }}
          >
            <Lock size={13} />
            <span>Securely connected via GitHub Repository Secrets (Automated & Protected)</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--nhs-blue)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              onClick={() => setIsConfigOpen(!isConfigOpen)}
            >
              <Key size={13} />
              {isConfigOpen ? 'Hide Custom Connection Settings' : 'Configure Custom Connection'}
            </button>

            {isConfigOpen && (
              <div
                style={{
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="settings-gist-token"
                    style={{ fontSize: '0.75rem' }}
                  >
                    GitHub Personal Access Token (with 'gist' permission)
                  </label>
                  <input
                    id="settings-gist-token"
                    type="password"
                    className="form-input"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={syncToken}
                    onChange={(e) => setSyncToken(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="settings-gist-id"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Private Gist ID (Optional - automatically created if left blank)
                  </label>
                  <input
                    id="settings-gist-id"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 7a3b4c5d6e7f8g9h..."
                    value={syncGistId}
                    onChange={(e) => setSyncGistId(e.target.value)}
                  />
                </div>

                {testResult && (
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      backgroundColor: testResult.success ? '#f0fdf4' : 'var(--rose-light)',
                      color: testResult.success ? '#15803d' : 'var(--rose)',
                      border: `1px solid ${testResult.success ? '#bbf7d0' : 'var(--rose-border)'}`,
                    }}
                  >
                    {testResult.message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.8125rem' }}
                    disabled={isTesting || !syncToken.trim()}
                    onClick={handleTestAndSave}
                  >
                    {isTesting ? 'Testing...' : 'Save & Connect'}
                  </button>
                  {syncToken && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem' }}
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
