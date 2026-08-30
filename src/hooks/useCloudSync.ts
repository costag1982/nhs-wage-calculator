import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SyncStatus,
  SyncPayload,
  isSyncConfigured,
  getLastSyncedAt,
  executeSync,
  recordLocalMutation,
} from '../domain/services/cloudSyncService';

interface UseCloudSyncProps {
  isStorageReady: boolean;
  onRemoteDataLoaded?: (payload: SyncPayload) => void;
}

export const useCloudSync = ({ isStorageReady, onRemoteDataLoaded }: UseCloudSyncProps) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    if (typeof window !== 'undefined' && !navigator.onLine) return 'offline';
    return isSyncConfigured() ? 'idle' : 'unconfigured';
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => getLastSyncedAt());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const onRemoteDataLoadedRef = useRef(onRemoteDataLoaded);

  useEffect(() => {
    onRemoteDataLoadedRef.current = onRemoteDataLoaded;
  }, [onRemoteDataLoaded]);

  const performSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    if (!isSyncConfigured()) {
      setSyncStatus('unconfigured');
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setErrorMessage(null);

    try {
      const result = await executeSync();
      setSyncStatus(result.status);

      if (result.status === 'synced') {
        if (result.lastSyncedAt) {
          setLastSyncedAt(result.lastSyncedAt);
        }
        if (result.action === 'PULLED_REMOTE' && result.payload) {
          onRemoteDataLoadedRef.current?.(result.payload);
        }
      } else if (result.status === 'error') {
        setErrorMessage(result.errorMessage || 'Cloud synchronisation failed');
      } else if (result.status === 'offline') {
        setSyncStatus('offline');
      }
    } catch (err) {
      setSyncStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Debounced sync for local changes
  const scheduleAutoSync = useCallback(() => {
    recordLocalMutation();
    if (!isSyncConfigured()) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSync();
    }, 1500);
  }, [performSync]);

  // Initial sync when SQLite storage is ready
  useEffect(() => {
    if (isStorageReady && isSyncConfigured()) {
      const timer = setTimeout(() => {
        performSync();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isStorageReady, performSync]);

  // Listen for Online/Offline and Tab Visibility Focus events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('idle');
      performSync();
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSyncConfigured()) {
        performSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [performSync]);

  return {
    syncStatus,
    lastSyncedAt,
    errorMessage,
    isConfigured: isSyncConfigured(),
    triggerSync: performSync,
    scheduleAutoSync,
  };
};
