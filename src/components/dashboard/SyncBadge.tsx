import React from 'react';
import { SyncStatus } from '../../domain/services/cloudSyncService';
import { Cloud, CloudCheck, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';

interface SyncBadgeProps {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage?: string | null;
  onSyncClick: () => void;
  onConfigureClick?: () => void;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({
  status,
  lastSyncedAt,
  errorMessage,
  onSyncClick,
  onConfigureClick,
}) => {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  if (status === 'unconfigured') {
    return (
      <button
        type="button"
        className="sync-badge sync-unconfigured"
        onClick={onConfigureClick || onSyncClick}
        title="Cloud backup is not configured. Click to connect GitHub Gist."
      >
        <Cloud size={14} />
        <span>Enable Cloud Sync</span>
      </button>
    );
  }

  if (status === 'syncing') {
    return (
      <div className="sync-badge sync-syncing" title="Synchronising with cloud...">
        <RefreshCw size={14} className="spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div
        className="sync-badge sync-offline"
        title="Working offline. All changes are saved locally in SQLite."
      >
        <CloudOff size={14} />
        <span>Offline Mode</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        type="button"
        className="sync-badge sync-error"
        onClick={onSyncClick}
        title={`Sync error: ${errorMessage || 'Failed to sync'}. Click to retry.`}
      >
        <AlertCircle size={14} />
        <span>Sync Failed • Retry</span>
      </button>
    );
  }

  // Synced status
  return (
    <button
      type="button"
      className="sync-badge sync-synced"
      onClick={onSyncClick}
      title={`Data safely synchronised with cloud.${lastSyncedAt ? ` Last synced at ${formatTime(lastSyncedAt)}.` : ''} Click to sync now.`}
    >
      <CloudCheck size={14} />
      <span>Cloud Synced {lastSyncedAt ? formatTime(lastSyncedAt) : ''}</span>
    </button>
  );
};
