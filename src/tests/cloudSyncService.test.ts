import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isSyncConfigured,
  getSyncConfig,
  saveSyncConfig,
  getLastLocalMutation,
  recordLocalMutation,
  testSyncConnection,
  executeSync,
  SyncPayload,
} from '../domain/services/cloudSyncService';
import * as sqliteService from '../domain/database/sqliteService';
import { DEFAULT_GEMMA_PROFILE, DEFAULT_GEMMA_COMMITMENTS } from '../hooks/useContractSettings';
import { DEFAULT_GEMMA_JUNE_SHIFTS } from '../domain/constants/defaultShifts';

// Simple in-memory localStorage mock for node environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Assign to global
vi.stubGlobal('localStorage', storageMock);
vi.stubGlobal('window', {
  localStorage: storageMock,
});
vi.stubGlobal('navigator', {
  onLine: true,
});

describe('cloudSyncService', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', storageMock);
    vi.stubGlobal('window', { localStorage: storageMock });
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
  });

  it('correctly reports unconfigured when no token is present', () => {
    expect(isSyncConfigured()).toBe(false);
    expect(getSyncConfig()).toEqual({ token: '', gistId: '' });
  });

  it('saves and retrieves configuration from localStorage', () => {
    saveSyncConfig('ghp_testtoken123', 'gist-abc-456');
    expect(isSyncConfigured()).toBe(true);
    expect(getSyncConfig()).toEqual({
      token: 'ghp_testtoken123',
      gistId: 'gist-abc-456',
    });

    // Clear config
    saveSyncConfig('', '');
    expect(isSyncConfigured()).toBe(false);
  });

  it('records local mutation timestamps', () => {
    expect(getLastLocalMutation()).toBe(new Date(0).toISOString());
    recordLocalMutation();
    const mutationTime = getLastLocalMutation();
    expect(new Date(mutationTime).getTime()).toBeGreaterThan(0);
  });

  it('tests connection and reports missing token', async () => {
    const res = await testSyncConnection('', '');
    expect(res.success).toBe(false);
    expect(res.message).toContain('GitHub Personal Access Token is required');
  });

  it('tests connection to existing Gist successfully with mock', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'gist123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await testSyncConnection('ghp_mocktoken', 'gist123');
    expect(res.success).toBe(true);
    expect(res.message).toContain('Successfully connected');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/gists/gist123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ghp_mocktoken',
        }),
      })
    );
  });

  it('handles 401 Bad Credentials during connection test', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await testSyncConnection('ghp_invalidtoken', 'gist123');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Bad credentials (401)');
  });

  it('returns unconfigured if executed without credentials', async () => {
    const result = await executeSync();
    expect(result.status).toBe('unconfigured');
  });

  it('pushes local payload to Gist when local is newer or remote file is missing', async () => {
    saveSyncConfig('ghp_token', 'gist123');

    // Local mutation is recent
    localStorage.setItem('nhs_last_local_mutation', new Date('2026-08-30T10:00:00Z').toISOString());

    vi.spyOn(sqliteService, 'exportFullDataPayload').mockResolvedValue({
      version: 1,
      lastModified: new Date('2026-08-30T10:00:00Z').toISOString(),
      profile: DEFAULT_GEMMA_PROFILE,
      commitments: DEFAULT_GEMMA_COMMITMENTS,
      shifts: DEFAULT_GEMMA_JUNE_SHIFTS,
    });

    const sampleRemote: SyncPayload = {
      version: 1,
      lastModified: new Date('2026-08-29T10:00:00Z').toISOString(), // older
      profile: DEFAULT_GEMMA_PROFILE,
      commitments: DEFAULT_GEMMA_COMMITMENTS,
      shifts: DEFAULT_GEMMA_JUNE_SHIFTS,
    };

    const mockFetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'gist123' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          files: {
            'nhs-wage-calculator-data.json': {
              content: JSON.stringify(sampleRemote),
            },
          },
        }),
      });
    });

    vi.stubGlobal('fetch', mockFetch);

    const result = await executeSync();
    expect(result.status).toBe('synced');
    expect(result.action).toBe('PUSHED_LOCAL');
  });

  it('pulls remote payload from Gist when remote is newer', async () => {
    saveSyncConfig('ghp_token', 'gist123');

    // Local mutation is old
    localStorage.setItem('nhs_last_local_mutation', new Date('2026-08-01T10:00:00Z').toISOString());

    vi.spyOn(sqliteService, 'exportFullDataPayload').mockResolvedValue({
      version: 1,
      lastModified: new Date('2026-08-01T10:00:00Z').toISOString(),
      profile: DEFAULT_GEMMA_PROFILE,
      commitments: DEFAULT_GEMMA_COMMITMENTS,
      shifts: DEFAULT_GEMMA_JUNE_SHIFTS,
    });
    vi.spyOn(sqliteService, 'importFullDataPayload').mockResolvedValue();

    const newerRemote: SyncPayload = {
      version: 1,
      lastModified: new Date('2026-08-30T12:00:00Z').toISOString(), // newer
      profile: DEFAULT_GEMMA_PROFILE,
      commitments: DEFAULT_GEMMA_COMMITMENTS,
      shifts: DEFAULT_GEMMA_JUNE_SHIFTS,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        files: {
          'nhs-wage-calculator-data.json': {
            content: JSON.stringify(newerRemote),
          },
        },
      }),
    });

    vi.stubGlobal('fetch', mockFetch);

    const result = await executeSync();
    expect(result.status).toBe('synced');
    expect(result.action).toBe('PULLED_REMOTE');
    expect(result.payload?.shifts.length).toBe(DEFAULT_GEMMA_JUNE_SHIFTS.length);
  });

  it('pulls remote payload on fresh client when no local mutations have ever occurred (e.g. incognito or new device)', async () => {
    saveSyncConfig('ghp_token', 'gist123');

    // Ensure NO local mutation has occurred (fresh client / incognito)
    expect(localStorage.getItem('nhs_last_local_mutation')).toBeNull();

    vi.spyOn(sqliteService, 'exportFullDataPayload').mockResolvedValue({
      version: 1,
      lastModified: new Date(0).toISOString(),
      profile: DEFAULT_GEMMA_PROFILE,
      commitments: DEFAULT_GEMMA_COMMITMENTS,
      shifts: DEFAULT_GEMMA_JUNE_SHIFTS,
    });
    vi.spyOn(sqliteService, 'importFullDataPayload').mockResolvedValue();

    const remoteWithCustomShifts: SyncPayload = {
      version: 1,
      lastModified: new Date('2026-08-31T12:00:00Z').toISOString(),
      profile: DEFAULT_GEMMA_PROFILE,
      commitments: DEFAULT_GEMMA_COMMITMENTS,
      shifts: [
        ...DEFAULT_GEMMA_JUNE_SHIFTS,
        {
          id: 'custom-shift-august',
          date: '2026-08-15',
          startTime: '08:00',
          endTime: '15:30',
          unpaidBreakMinutes: 0,
          shiftType: 'SUBSTANTIVE',
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        files: {
          'nhs-wage-calculator-data.json': {
            content: JSON.stringify(remoteWithCustomShifts),
          },
        },
      }),
    });

    vi.stubGlobal('fetch', mockFetch);

    const result = await executeSync();
    expect(result.status).toBe('synced');
    expect(result.action).toBe('PULLED_REMOTE');
    expect(result.payload?.shifts.length).toBe(DEFAULT_GEMMA_JUNE_SHIFTS.length + 1);
    expect(sqliteService.importFullDataPayload).toHaveBeenCalledWith(remoteWithCustomShifts);
  });
});
