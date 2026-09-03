import { useState, useEffect, useCallback } from 'react';
import { EmployeeProfile } from '../domain/models/Contract';
import { RecurringCommitment } from '../domain/models/Deductions';
import {
  DEFAULT_GEMMA_PROFILE,
  DEFAULT_GEMMA_COMMITMENTS,
} from '../domain/constants/defaultProfile';
import { sqliteProfileRepository } from '../infrastructure/storage/sqlite/sqliteProfileRepository';
import { ProfileRepository } from '../domain/ports/IProfileRepository';

// Re-export constants for backward compatibility
export { DEFAULT_GEMMA_PROFILE, DEFAULT_GEMMA_COMMITMENTS };

export const useContractSettings = (
  onMutation?: () => void,
  repository: ProfileRepository = sqliteProfileRepository
) => {
  const [profile, setProfile] = useState<EmployeeProfile>(DEFAULT_GEMMA_PROFILE);
  const [commitments, setCommitments] = useState<RecurringCommitment[]>(DEFAULT_GEMMA_COMMITMENTS);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  const reloadSettingsFromDatabase = useCallback(async () => {
    try {
      const loadedProfile = await repository.getProfile();
      const loadedCommitments = await repository.getCommitments();
      setProfile(loadedProfile);
      setCommitments(loadedCommitments);
    } catch (e) {
      console.error('Failed to reload settings from SQLite', e);
    }
  }, [repository]);

  // Load from repository on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loadedProfile = await repository.getProfile();
        const loadedCommitments = await repository.getCommitments();
        if (mounted) {
          setProfile(loadedProfile);
          setCommitments(loadedCommitments);
          setIsDbLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load from SQLite', e);
        if (mounted) setIsDbLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [repository]);

  const updateProfile = useCallback(
    (updated: Partial<EmployeeProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...updated };
        repository.saveProfile(next).catch((err) => {
          console.error('Failed to save profile to SQLite', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation, repository]
  );

  const addCommitment = useCallback(
    (commitment: Omit<RecurringCommitment, 'id'>) => {
      const newCommitment: RecurringCommitment = {
        ...commitment,
        id: Date.now().toString(),
      };
      setCommitments((prev) => {
        const next = [...prev, newCommitment];
        repository.saveCommitment(newCommitment).catch((err) => {
          console.error('Failed to save commitment to SQLite', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation, repository]
  );

  const removeCommitment = useCallback(
    (id: string) => {
      setCommitments((prev) => {
        const next = prev.filter((c) => c.id !== id);
        repository.deleteCommitment(id).catch((err) => {
          console.error('Failed to delete commitment from SQLite', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation, repository]
  );

  const resetToGemmaDefaults = useCallback(() => {
    setProfile(DEFAULT_GEMMA_PROFILE);
    setCommitments(DEFAULT_GEMMA_COMMITMENTS);
    repository.saveProfile(DEFAULT_GEMMA_PROFILE).catch((err) => {
      console.error('Failed to save default profile to SQLite', err);
    });
    for (const comm of DEFAULT_GEMMA_COMMITMENTS) {
      repository.saveCommitment(comm).catch((err) => {
        console.error('Failed to save default commitment to SQLite', err);
      });
    }
    onMutation?.();
  }, [onMutation, repository]);

  return {
    profile,
    commitments,
    isDbLoaded,
    updateProfile,
    addCommitment,
    removeCommitment,
    resetToGemmaDefaults,
    reloadSettingsFromDatabase,
  };
};
