import React from 'react';
import { Database, Download, Upload } from 'lucide-react';

interface DatabaseSectionProps {
  onExportSqlite: () => void;
  onImportSqlite: (file: File) => void;
}

export const DatabaseSection: React.FC<DatabaseSectionProps> = ({
  onExportSqlite,
  onImportSqlite,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-title">
        <Database size={17} />
        <span>SQLite Local Database (Wasm)</span>
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
          <strong>SQLite database</strong> with persistent local storage. You can back up your
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
  );
};
