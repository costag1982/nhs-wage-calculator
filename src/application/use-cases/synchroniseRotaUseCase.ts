import { RotaRepository } from '../../domain/ports/IRotaRepository';
import { ProfileRepository } from '../../domain/ports/IProfileRepository';
import {
  SyncGateway,
  SyncConfigStore,
  SyncPayload,
  SyncResult,
} from '../../domain/ports/ISyncGateway';
import { githubGistSyncGateway } from '../../infrastructure/sync/githubGistSyncGateway';
import { localStorageConfigStore } from '../../infrastructure/config/localStorageConfigStore';
import * as sqliteService from '../../domain/database/sqliteService';

export interface SynchroniseRotaDependencies {
  readonly rotaRepository?: RotaRepository;
  readonly profileRepository?: ProfileRepository;
  readonly syncGateway?: SyncGateway;
  readonly configStore?: SyncConfigStore;
  readonly isOnline?: () => boolean;
  readonly exportPayload?: () => Promise<SyncPayload>;
  readonly importPayload?: (payload: SyncPayload) => Promise<void>;
}

export const createSynchroniseRotaUseCase = (deps: SynchroniseRotaDependencies = {}) => {
  const gateway = deps.syncGateway || githubGistSyncGateway;
  const configStore = deps.configStore || localStorageConfigStore;
  const checkOnline = deps.isOnline || (() => typeof window === 'undefined' || navigator.onLine);

  const exportLocalPayload = async (): Promise<SyncPayload> => {
    if (deps.exportPayload) {
      return deps.exportPayload();
    }
    // Delegate to sqliteService.exportFullDataPayload to honor existing spies and mocks
    return sqliteService.exportFullDataPayload();
  };

  const importRemotePayload = async (payload: SyncPayload): Promise<void> => {
    if (deps.importPayload) {
      await deps.importPayload(payload);
      return;
    }
    await sqliteService.importFullDataPayload(payload);
  };

  const execute = async (): Promise<SyncResult> => {
    if (!checkOnline()) {
      return { status: 'offline', errorMessage: 'Offline: Changes saved to local SQLite.' };
    }

    const { token, gistId } = configStore.getConfig();
    if (!token) {
      return { status: 'unconfigured' };
    }

    try {
      const localData = await exportLocalPayload();
      const localModifiedTime = new Date(localData.lastModified).getTime();

      // If no Gist ID yet, create Gist with local data
      if (!gistId) {
        const pushRes = await gateway.pushRemote(token, '', localData);
        if (!pushRes.success || !pushRes.gistId) {
          return {
            status: 'error',
            errorMessage: pushRes.errorMessage || 'Failed to create cloud Gist backup',
          };
        }
        configStore.saveConfig(token, pushRes.gistId);
        const nowIso = new Date().toISOString();
        configStore.setLastSyncedAt(nowIso);
        return {
          status: 'synced',
          action: 'CREATED_GIST',
          payload: localData,
          lastSyncedAt: nowIso,
        };
      }

      // Fetch remote
      const pullRes = await gateway.pullRemote(token, gistId);
      if (!pullRes.success && !pullRes.notFound) {
        return {
          status: 'error',
          errorMessage: pullRes.errorMessage || 'Failed to fetch remote cloud data',
        };
      }

      const remoteData = pullRes.payload;

      // If remote file doesn't exist in Gist, push local
      if (!remoteData) {
        const pushRes = await gateway.pushRemote(token, gistId, localData);
        if (!pushRes.success) {
          return {
            status: 'error',
            errorMessage: pushRes.errorMessage || 'Failed to push local data to Gist',
          };
        }
        const nowIso = new Date().toISOString();
        configStore.setLastSyncedAt(nowIso);
        return {
          status: 'synced',
          action: 'PUSHED_LOCAL',
          payload: localData,
          lastSyncedAt: nowIso,
        };
      }

      const lastLocalMutation = configStore.getLastLocalMutation();
      const hasLocalMutation =
        Boolean(lastLocalMutation) && lastLocalMutation !== new Date(0).toISOString();

      // Safeguard against overwriting remote data from fresh/clean sessions:
      // If this client has never recorded any local user mutations (e.g. incognito, new device),
      // NEVER overwrite remote data with initial seed defaults. Always pull remote.
      if (!hasLocalMutation) {
        await importRemotePayload(remoteData);
        const nowIso = new Date().toISOString();
        configStore.setLastSyncedAt(nowIso);
        return {
          status: 'synced',
          action: 'PULLED_REMOTE',
          payload: remoteData,
          lastSyncedAt: nowIso,
        };
      }

      const remoteModifiedTime = new Date(remoteData.lastModified || 0).getTime();

      // Case 1: Remote is newer than local (e.g. updated shifts on another device)
      if (remoteModifiedTime > localModifiedTime) {
        await importRemotePayload(remoteData);
        const nowIso = new Date().toISOString();
        configStore.setLastSyncedAt(nowIso);
        return {
          status: 'synced',
          action: 'PULLED_REMOTE',
          payload: remoteData,
          lastSyncedAt: nowIso,
        };
      }

      // Case 2: Local is newer than remote (e.g. shifts added on this device)
      if (localModifiedTime > remoteModifiedTime) {
        const pushRes = await gateway.pushRemote(token, gistId, localData);
        if (!pushRes.success) {
          return {
            status: 'error',
            errorMessage: pushRes.errorMessage || 'Failed to push newer local data to Gist',
          };
        }
        const nowIso = new Date().toISOString();
        configStore.setLastSyncedAt(nowIso);
        return {
          status: 'synced',
          action: 'PUSHED_LOCAL',
          payload: localData,
          lastSyncedAt: nowIso,
        };
      }

      // Case 3: In sync
      return {
        status: 'synced',
        action: 'IN_SYNC',
        payload: localData,
        lastSyncedAt: configStore.getLastSyncedAt() || undefined,
      };
    } catch (err) {
      console.error('Cloud Sync error:', err);
      return {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown sync error',
      };
    }
  };

  return {
    execute,
    exportLocalPayload,
    importRemotePayload,
  };
};

export const synchroniseRotaUseCase = createSynchroniseRotaUseCase();
