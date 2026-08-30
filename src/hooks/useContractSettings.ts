import { useState, useEffect, useCallback } from 'react';
import { EmployeeProfile } from '../domain/models/Contract';
import { RecurringCommitment } from '../domain/models/Deductions';
import {
  getProfile,
  saveProfile,
  getCommitments,
  saveCommitment,
  deleteCommitment,
} from '../domain/database/sqliteService';

export const DEFAULT_GEMMA_PROFILE: EmployeeProfile = {
  employeeName: 'MISS GEMMA HOWARD',
  jobTitle: 'Admin Support Clerk',
  department: 'Emergency Depart',
  location: 'Airedale General Hospital',
  band: 'Band 2',
  contractType: 'SUBSTANTIVE',
  fullTimeSalaryFte: 25272.0,
  standardFullTimeHours: 37.5,
  contractedWeeklyHours: 26.0,
  yearsOfServiceTier: 'UNDER_5',
  annualLeaveCarryOverHours: 0,
  taxCode: '1257L CUMUL',
  niCategory: 'A',
  pensionContributionRate: 0.065,
  taxOfficeName: 'W Yorkshire And Crav',
  taxOfficeRef: '072/A7150',
  niNumber: 'JR087301B',
  employeeNumber: '31580711',
  payMethod: 'BACS',
};

export const DEFAULT_GEMMA_COMMITMENTS: RecurringCommitment[] = [
  { id: '1', name: '423 Car Permit P/T', amount: 9.1 },
  { id: '2', name: 'Staff Lottery', amount: 3.0 },
];

export const useContractSettings = (onMutation?: () => void) => {
  const [profile, setProfile] = useState<EmployeeProfile>(DEFAULT_GEMMA_PROFILE);
  const [commitments, setCommitments] = useState<RecurringCommitment[]>(DEFAULT_GEMMA_COMMITMENTS);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  const reloadSettingsFromDatabase = useCallback(async () => {
    try {
      const loadedProfile = await getProfile();
      const loadedCommitments = await getCommitments();
      setProfile(loadedProfile);
      setCommitments(loadedCommitments);
    } catch (e) {
      console.error('Failed to reload settings from SQLite', e);
    }
  }, []);

  // Load from SQLite on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loadedProfile = await getProfile();
        const loadedCommitments = await getCommitments();
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
  }, []);

  const updateProfile = useCallback(
    (updated: Partial<EmployeeProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...updated };
        saveProfile(next).catch((err) => {
          console.error('Failed to save profile to SQLite', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation]
  );

  const addCommitment = useCallback(
    (commitment: Omit<RecurringCommitment, 'id'>) => {
      const newCommitment: RecurringCommitment = {
        ...commitment,
        id: Date.now().toString(),
      };
      setCommitments((prev) => {
        const next = [...prev, newCommitment];
        saveCommitment(newCommitment).catch((err) => {
          console.error('Failed to save commitment to SQLite', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation]
  );

  const removeCommitment = useCallback(
    (id: string) => {
      setCommitments((prev) => {
        const next = prev.filter((c) => c.id !== id);
        deleteCommitment(id).catch((err) => {
          console.error('Failed to delete commitment from SQLite', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation]
  );

  const resetToGemmaDefaults = useCallback(() => {
    setProfile(DEFAULT_GEMMA_PROFILE);
    setCommitments(DEFAULT_GEMMA_COMMITMENTS);
    saveProfile(DEFAULT_GEMMA_PROFILE).catch((err) => {
      console.error('Failed to save default profile to SQLite', err);
    });
    for (const comm of DEFAULT_GEMMA_COMMITMENTS) {
      saveCommitment(comm).catch((err) => {
        console.error('Failed to save default commitment to SQLite', err);
      });
    }
    onMutation?.();
  }, [onMutation]);

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
