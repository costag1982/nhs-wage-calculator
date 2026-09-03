import { describe, it, expect, vi } from 'vitest';
import { createSynchroniseRotaUseCase } from '../application/use-cases/synchroniseRotaUseCase';
import { SyncGateway, SyncConfigStore, SyncPayload } from '../domain/ports/ISyncGateway';
import {
  DEFAULT_GEMMA_PROFILE,
  DEFAULT_GEMMA_COMMITMENTS,
} from '../domain/constants/defaultProfile';
import { DEFAULT_GEMMA_JUNE_SHIFTS } from '../domain/constants/defaultShifts';

describe('SynchroniseRotaUseCase (Clean Architecture Pure Unit Test)', () => {
  const sampleLocalPayload: SyncPayload = {
    version: 1,
    lastModified: '2026-08-01T12:00:00.000Z',
    profile: DEFAULT_GEMMA_PROFILE,
    commitments: DEFAULT_GEMMA_COMMITMENTS,
    shifts: DEFAULT_GEMMA_JUNE_SHIFTS,
  };

  const createMockConfigStore = (
    config = { token: 'ghp_test_token', gistId: 'gist_123' },
    lastLocalMutation = '2026-08-01T12:00:00.000Z'
  ): SyncConfigStore => {
    let currentConfig = { ...config };
    let syncedAt: string | null = null;
    let localMutation = lastLocalMutation;

    return {
      getConfig: vi.fn(() => currentConfig),
      saveConfig: vi.fn((token, gistId) => {
        currentConfig = { token, gistId };
      }),
      getLastSyncedAt: vi.fn(() => syncedAt),
      setLastSyncedAt: vi.fn((t) => {
        syncedAt = t;
      }),
      getLastLocalMutation: vi.fn(() => localMutation),
      recordLocalMutation: vi.fn(() => {
        localMutation = new Date().toISOString();
      }),
    };
  };

  it('returns unconfigured if no token is configured', async () => {
    const configStore = createMockConfigStore({ token: '', gistId: '' });
    const useCase = createSynchroniseRotaUseCase({
      configStore,
      exportPayload: async () => sampleLocalPayload,
    });

    const result = await useCase.execute();
    expect(result.status).toBe('unconfigured');
  });

  it('returns offline when offline checker returns false', async () => {
    const configStore = createMockConfigStore();
    const useCase = createSynchroniseRotaUseCase({
      configStore,
      isOnline: () => false,
      exportPayload: async () => sampleLocalPayload,
    });

    const result = await useCase.execute();
    expect(result.status).toBe('offline');
    expect(result.errorMessage).toContain('Offline');
  });

  it('creates new Gist if token exists but gistId is empty', async () => {
    const configStore = createMockConfigStore({ token: 'ghp_secret', gistId: '' });
    const mockGateway: SyncGateway = {
      testConnection: vi.fn(),
      pullRemote: vi.fn(),
      pushRemote: vi.fn(async () => ({ success: true, gistId: 'new_gist_id_999' })),
    };

    const useCase = createSynchroniseRotaUseCase({
      configStore,
      syncGateway: mockGateway,
      exportPayload: async () => sampleLocalPayload,
    });

    const result = await useCase.execute();
    expect(result.status).toBe('synced');
    expect(result.action).toBe('CREATED_GIST');
    expect(mockGateway.pushRemote).toHaveBeenCalledWith('ghp_secret', '', sampleLocalPayload);
    expect(configStore.saveConfig).toHaveBeenCalledWith('ghp_secret', 'new_gist_id_999');
  });

  it('safeguards fresh sessions by pulling remote when local has never mutated', async () => {
    const configStore = createMockConfigStore(
      { token: 'ghp_secret', gistId: 'gist_123' },
      new Date(0).toISOString() // No local mutations
    );

    const remotePayload: SyncPayload = {
      ...sampleLocalPayload,
      lastModified: '2026-08-01T10:00:00.000Z',
      shifts: [],
    };

    const mockGateway: SyncGateway = {
      testConnection: vi.fn(),
      pullRemote: vi.fn(async () => ({ success: true, payload: remotePayload })),
      pushRemote: vi.fn(),
    };

    let importedPayload: SyncPayload | null = null;
    const useCase = createSynchroniseRotaUseCase({
      configStore,
      syncGateway: mockGateway,
      exportPayload: async () => sampleLocalPayload,
      importPayload: async (p) => {
        importedPayload = p;
      },
    });

    const result = await useCase.execute();
    expect(result.status).toBe('synced');
    expect(result.action).toBe('PULLED_REMOTE');
    expect(importedPayload).toEqual(remotePayload);
  });

  it('pushes local when local modification time is newer than remote', async () => {
    const configStore = createMockConfigStore(
      { token: 'ghp_secret', gistId: 'gist_123' },
      '2026-08-02T15:00:00.000Z'
    );

    const remotePayload: SyncPayload = {
      ...sampleLocalPayload,
      lastModified: '2026-08-01T12:00:00.000Z',
    };

    const mockGateway: SyncGateway = {
      testConnection: vi.fn(),
      pullRemote: vi.fn(async () => ({ success: true, payload: remotePayload })),
      pushRemote: vi.fn(async () => ({ success: true, gistId: 'gist_123' })),
    };

    const localPayload = { ...sampleLocalPayload, lastModified: '2026-08-02T15:00:00.000Z' };

    const useCase = createSynchroniseRotaUseCase({
      configStore,
      syncGateway: mockGateway,
      exportPayload: async () => localPayload,
    });

    const result = await useCase.execute();
    expect(result.status).toBe('synced');
    expect(result.action).toBe('PUSHED_LOCAL');
    expect(mockGateway.pushRemote).toHaveBeenCalledWith('ghp_secret', 'gist_123', localPayload);
  });
});
