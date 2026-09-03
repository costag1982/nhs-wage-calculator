import { EmployeeProfile } from '../models/Contract';
import { RecurringCommitment } from '../models/Deductions';
import { Shift } from '../models/Shift';

/**
 * Portable schema for full multi-device synchronization payloads.
 */
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

export interface SyncConnectionResult {
  success: boolean;
  message: string;
}

export interface RemotePullResult {
  success: boolean;
  payload?: SyncPayload;
  notFound?: boolean;
  errorMessage?: string;
}

export interface RemotePushResult {
  success: boolean;
  gistId?: string;
  errorMessage?: string;
}

/**
 * Port representing external remote synchronization services (e.g. GitHub Gist REST API).
 */
export interface SyncGateway {
  readonly testConnection: (token: string, gistId: string) => Promise<SyncConnectionResult>;
  readonly pullRemote: (token: string, gistId: string) => Promise<RemotePullResult>;
  readonly pushRemote: (
    token: string,
    gistId: string,
    payload: SyncPayload
  ) => Promise<RemotePushResult>;
}

/**
 * Port representing configuration & timestamp persistence for synchronization.
 */
export interface SyncConfigStore {
  readonly getConfig: () => { token: string; gistId: string };
  readonly saveConfig: (token: string, gistId: string) => void;
  readonly getLastSyncedAt: () => string | null;
  readonly setLastSyncedAt: (timestamp: string) => void;
  readonly getLastLocalMutation: () => string;
  readonly recordLocalMutation: () => void;
}
