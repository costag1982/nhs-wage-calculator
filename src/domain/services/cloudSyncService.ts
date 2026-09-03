/**
 * @deprecated This module is retained for backward compatibility during architectural transition.
 * Use the Ports in `src/domain/ports/` and Use Cases in `src/application/use-cases/` instead.
 */
import { SyncPayload, SyncStatus, SyncResult } from '../ports/ISyncGateway';
import { localStorageConfigStore } from '../../infrastructure/config/localStorageConfigStore';
import { githubGistSyncGateway } from '../../infrastructure/sync/githubGistSyncGateway';
import { synchroniseRotaUseCase } from '../../application/use-cases/synchroniseRotaUseCase';

export type { SyncPayload, SyncStatus, SyncResult };

export const getSyncConfig = (): { token: string; gistId: string } =>
  localStorageConfigStore.getConfig();

export const saveSyncConfig = (token: string, gistId: string): void =>
  localStorageConfigStore.saveConfig(token, gistId);

export const isSyncConfigured = (): boolean => localStorageConfigStore.isConfigured();

export const isManagedSyncConfig = (): boolean => localStorageConfigStore.isManagedSyncConfig();

export const recordLocalMutation = (): void => localStorageConfigStore.recordLocalMutation();

export const getLastLocalMutation = (): string => localStorageConfigStore.getLastLocalMutation();

export const getLastSyncedAt = (): string | null => localStorageConfigStore.getLastSyncedAt();

export const testSyncConnection = (
  customToken?: string,
  customGistId?: string
): Promise<{ success: boolean; message: string; gistId?: string }> => {
  const config = localStorageConfigStore.getConfig();
  const token = customToken !== undefined ? customToken.trim() : config.token;
  const gistId = customGistId !== undefined ? customGistId.trim() : config.gistId;
  return githubGistSyncGateway.testConnection(token, gistId);
};

export const fetchRemotePayload = async (): Promise<SyncPayload | null> => {
  const { token, gistId } = localStorageConfigStore.getConfig();
  if (!token || !gistId) return null;
  const res = await githubGistSyncGateway.pullRemote(token, gistId);
  return res.payload || null;
};

export const pushPayload = async (
  payload: SyncPayload
): Promise<{ gistId: string; lastSyncedAt: string }> => {
  const { token, gistId } = localStorageConfigStore.getConfig();
  const res = await githubGistSyncGateway.pushRemote(token, gistId, payload);
  if (!res.success || !res.gistId) {
    throw new Error(res.errorMessage || 'Failed to push payload to remote Gist');
  }
  const nowIso = new Date().toISOString();
  localStorageConfigStore.setLastSyncedAt(nowIso);
  return { gistId: res.gistId, lastSyncedAt: nowIso };
};

export const executeSync = (): Promise<SyncResult> => synchroniseRotaUseCase.execute();
