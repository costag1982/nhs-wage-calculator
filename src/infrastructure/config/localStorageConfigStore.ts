import { SyncConfigStore } from '../../domain/ports/ISyncGateway';

const STORAGE_KEY_GIST_TOKEN = 'nhs_sync_gist_token';
const STORAGE_KEY_GIST_ID = 'nhs_sync_gist_id';
const STORAGE_KEY_LAST_SYNCED = 'nhs_last_synced_at';
const STORAGE_KEY_LAST_LOCAL_MUTATION = 'nhs_last_local_mutation';

export interface ExtendedSyncConfigStore extends SyncConfigStore {
  readonly isManagedSyncConfig: () => boolean;
  readonly isConfigured: () => boolean;
}

export const createLocalStorageConfigStore = (): ExtendedSyncConfigStore => {
  const getConfig = (): { token: string; gistId: string } => {
    const token =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_GIST_TOKEN)) ||
      (import.meta.env.VITE_SYNC_GIST_TOKEN as string) ||
      '';
    const gistId =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_GIST_ID)) ||
      (import.meta.env.VITE_SYNC_GIST_ID as string) ||
      '';
    return { token: token.trim(), gistId: gistId.trim() };
  };

  const saveConfig = (token: string, gistId: string): void => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(STORAGE_KEY_GIST_TOKEN, token.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_GIST_TOKEN);
    }

    if (gistId) {
      localStorage.setItem(STORAGE_KEY_GIST_ID, gistId.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_GIST_ID);
    }
  };

  const getLastSyncedAt = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_LAST_SYNCED);
  };

  const setLastSyncedAt = (timestamp: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_LAST_SYNCED, timestamp);
  };

  const getLastLocalMutation = (): string => {
    if (typeof window === 'undefined') return new Date().toISOString();
    return localStorage.getItem(STORAGE_KEY_LAST_LOCAL_MUTATION) || new Date(0).toISOString();
  };

  const recordLocalMutation = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_LAST_LOCAL_MUTATION, new Date().toISOString());
  };

  const isManagedSyncConfig = (): boolean => {
    return Boolean(import.meta.env.VITE_SYNC_GIST_TOKEN);
  };

  const isConfigured = (): boolean => {
    return Boolean(getConfig().token);
  };

  return {
    getConfig,
    saveConfig,
    getLastSyncedAt,
    setLastSyncedAt,
    getLastLocalMutation,
    recordLocalMutation,
    isManagedSyncConfig,
    isConfigured,
  };
};

export const localStorageConfigStore = createLocalStorageConfigStore();
