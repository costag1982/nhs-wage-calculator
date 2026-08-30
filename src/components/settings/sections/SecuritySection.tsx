import React from 'react';
import { Lock, LogOut } from 'lucide-react';

interface SecuritySectionProps {
  onLogout: () => void;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({ onLogout }) => {
  return (
    <div>
      <div className="settings-section-title">
        <Lock size={16} style={{ display: 'inline', marginRight: '6px' }} />
        Security & Session
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
          Lock this session and return to the authorisation screen. This will clear the cached
          passphrase from this device.
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--rose)',
            borderColor: 'var(--rose-border)',
            alignSelf: 'flex-start',
          }}
          onClick={onLogout}
          title="Log out and lock calculator"
        >
          <LogOut size={14} />
          Log Out & Lock Screen
        </button>
      </div>
    </div>
  );
};
