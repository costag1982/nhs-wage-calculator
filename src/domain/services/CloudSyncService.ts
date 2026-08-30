import { Shift } from '../models/Shift';
import { EmployeeProfile } from '../models/Contract';
import { RecurringCommitment } from '../models/Deductions';
import { SqliteStorage } from '../database/sqliteService';

export interface SyncPayload {
  version: number;
  lastModified: string;
  profile: EmployeeProfile;
  commitments: RecurringCommitment[];
  shifts: Shift[];
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'unconfigured';

export interface SyncResult {
  status: SyncStatus;
  action?: 'PULLED_REMOTE' | 'PUSHED_LOCAL' | 'IN_SYNC' | 'CREATED_GIST';
  payload?: SyncPayload;
  errorMessage?: string;
  lastSyncedAt?: string;
}

const GIST_FILENAME = 'nhs-wage-calculator-data.json';
const STORAGE_KEY_GIST_TOKEN = 'nhs_sync_gist_token';
const STORAGE_KEY_GIST_ID = 'nhs_sync_gist_id';
const STORAGE_KEY_LAST_SYNCED = 'nhs_last_synced_at';
const STORAGE_KEY_LAST_LOCAL_MUTATION = 'nhs_last_local_mutation';

export class CloudSyncService {
  /**
   * Retrieves current sync configuration from localStorage or Vite environment variables.
   */
  public static getConfig(): { token: string; gistId: string } {
    const token =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_GIST_TOKEN)) ||
      (import.meta.env.VITE_SYNC_GIST_TOKEN as string) ||
      '';
    const gistId =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_GIST_ID)) ||
      (import.meta.env.VITE_SYNC_GIST_ID as string) ||
      '';
    return { token: token.trim(), gistId: gistId.trim() };
  }

  /**
   * Saves or clears custom token / gistId in localStorage.
   */
  public static saveConfig(token: string, gistId: string): void {
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
  }

  /**
   * Returns true if a GitHub token is configured.
   */
  public static isConfigured(): boolean {
    const { token } = this.getConfig();
    return Boolean(token);
  }

  /**
   * Records a local modification timestamp so sync knows local state has changed.
   */
  public static recordLocalMutation(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_LAST_LOCAL_MUTATION, new Date().toISOString());
  }

  public static getLastLocalMutation(): string {
    if (typeof window === 'undefined') return new Date().toISOString();
    return localStorage.getItem(STORAGE_KEY_LAST_LOCAL_MUTATION) || new Date(0).toISOString();
  }

  public static getLastSyncedAt(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_LAST_SYNCED);
  }

  /**
   * Tests connection to GitHub Gist with provided or saved credentials.
   */
  public static async testConnection(
    customToken?: string,
    customGistId?: string
  ): Promise<{ success: boolean; message: string; gistId?: string }> {
    const config = this.getConfig();
    const token = customToken !== undefined ? customToken.trim() : config.token;
    const gistId = customGistId !== undefined ? customGistId.trim() : config.gistId;

    if (!token) {
      return { success: false, message: 'GitHub Personal Access Token is required.' };
    }

    try {
      if (gistId) {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            return {
              success: false,
              message: 'Gist not found (404). Check Gist ID or token permissions.',
            };
          }
          if (res.status === 401) {
            return {
              success: false,
              message: 'Bad credentials (401). Check GitHub Personal Access Token.',
            };
          }
          return {
            success: false,
            message: `GitHub API error (${res.status}): ${res.statusText}`,
          };
        }

        return { success: true, message: 'Successfully connected to existing Gist.', gistId };
      }

      // Check user token validity
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!userRes.ok) {
        return {
          success: false,
          message: 'Invalid GitHub Token. Please check token permissions (must have "gist" scope).',
        };
      }

      const userData = await userRes.json();
      return {
        success: true,
        message: `Token valid for user @${userData.login}. Ready to create or sync Gist.`,
      };
    } catch (e) {
      return {
        success: false,
        message: `Network error: ${e instanceof Error ? e.message : 'Failed to reach GitHub'}`,
      };
    }
  }

  /**
   * Fetches remote payload from GitHub Gist.
   */
  public static async fetchRemotePayload(): Promise<SyncPayload | null> {
    const { token, gistId } = this.getConfig();
    if (!token || !gistId) return null;

    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Gist (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    const file = data.files?.[GIST_FILENAME];
    if (!file || !file.content) {
      return null;
    }

    return JSON.parse(file.content) as SyncPayload;
  }

  /**
   * Pushes payload to GitHub Gist (updates existing or creates new if gistId is empty).
   */
  public static async pushPayload(
    payload: SyncPayload
  ): Promise<{ gistId: string; lastSyncedAt: string }> {
    const { token, gistId } = this.getConfig();
    if (!token) {
      throw new Error('GitHub Token is not configured.');
    }

    const content = JSON.stringify(payload, null, 2);
    const nowIso = new Date().toISOString();

    if (gistId) {
      // Update existing Gist
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          description: 'NHS Wage & Shift Calculator Cloud Data Store',
          files: {
            [GIST_FILENAME]: {
              content,
            },
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update Gist (${res.status}): ${res.statusText}`);
      }

      localStorage.setItem(STORAGE_KEY_LAST_SYNCED, nowIso);
      return { gistId, lastSyncedAt: nowIso };
    }

    // Create new secret Gist
    const createRes = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        description: 'NHS Wage & Shift Calculator Cloud Data Store',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content,
          },
        },
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create Gist (${createRes.status}): ${createRes.statusText}`);
    }

    const createdData = await createRes.json();
    const newGistId = createdData.id as string;
    this.saveConfig(token, newGistId);
    localStorage.setItem(STORAGE_KEY_LAST_SYNCED, nowIso);
    return { gistId: newGistId, lastSyncedAt: nowIso };
  }

  /**
   * Master sync runner: compares local and remote data, resolving conflict via timestamp or merge.
   */
  public static async executeSync(): Promise<SyncResult> {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return { status: 'offline', errorMessage: 'Offline: Changes saved to local SQLite.' };
    }

    if (!this.isConfigured()) {
      return { status: 'unconfigured' };
    }

    try {
      const { gistId } = this.getConfig();
      const localData = await SqliteStorage.exportFullDataPayload();
      const localModifiedTime = new Date(localData.lastModified).getTime();

      // If no Gist ID yet, create Gist with local data
      if (!gistId) {
        const { lastSyncedAt } = await this.pushPayload(localData);
        return {
          status: 'synced',
          action: 'CREATED_GIST',
          payload: localData,
          lastSyncedAt,
        };
      }

      // Fetch remote
      const remoteData = await this.fetchRemotePayload();

      // If remote file doesn't exist in Gist, push local
      if (!remoteData) {
        const { lastSyncedAt } = await this.pushPayload(localData);
        return {
          status: 'synced',
          action: 'PUSHED_LOCAL',
          payload: localData,
          lastSyncedAt,
        };
      }

      const remoteModifiedTime = new Date(remoteData.lastModified || 0).getTime();

      // Case 1: Remote is newer than local (e.g. Gemma updated shifts on another device)
      if (remoteModifiedTime > localModifiedTime) {
        await SqliteStorage.importFullDataPayload(remoteData);
        const nowIso = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_LAST_SYNCED, nowIso);
        return {
          status: 'synced',
          action: 'PULLED_REMOTE',
          payload: remoteData,
          lastSyncedAt: nowIso,
        };
      }

      // Case 2: Local is newer than remote (e.g. Gemma added shifts on this device)
      if (localModifiedTime > remoteModifiedTime) {
        const { lastSyncedAt } = await this.pushPayload(localData);
        return {
          status: 'synced',
          action: 'PUSHED_LOCAL',
          payload: localData,
          lastSyncedAt,
        };
      }

      // Case 3: Already in sync
      const nowIso = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_LAST_SYNCED, nowIso);
      return {
        status: 'synced',
        action: 'IN_SYNC',
        payload: localData,
        lastSyncedAt: nowIso,
      };
    } catch (err) {
      console.error('Cloud Sync error:', err);
      return {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown sync error',
      };
    }
  }
}
