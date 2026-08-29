import { useState, useEffect, useCallback } from 'react';
import { EmployeeProfile } from '../domain/models/Contract';
import { RecurringCommitment } from '../domain/models/Deductions';
import { SqliteStorage } from '../domain/database/sqliteService';

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

export function useContractSettings() {
  const [profile, setProfile] = useState<EmployeeProfile>(DEFAULT_GEMMA_PROFILE);
  const [commitments, setCommitments] = useState<RecurringCommitment[]>(DEFAULT_GEMMA_COMMITMENTS);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Load from SQLite on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loadedProfile = await SqliteStorage.getProfile();
        const loadedCommitments = await SqliteStorage.getCommitments();
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

  const updateProfile = useCallback((updated: Partial<EmployeeProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      SqliteStorage.saveProfile(next);
      return next;
    });
  }, []);

  const addCommitment = useCallback((commitment: Omit<RecurringCommitment, 'id'>) => {
    const newCommitment: RecurringCommitment = {
      ...commitment,
      id: Date.now().toString(),
    };
    setCommitments((prev) => {
      const next = [...prev, newCommitment];
      SqliteStorage.saveCommitment(newCommitment);
      return next;
    });
  }, []);

  const removeCommitment = useCallback((id: string) => {
    setCommitments((prev) => {
      const next = prev.filter((c) => c.id !== id);
      SqliteStorage.deleteCommitment(id);
      return next;
    });
  }, []);

  const resetToGemmaDefaults = useCallback(() => {
    setProfile(DEFAULT_GEMMA_PROFILE);
    setCommitments(DEFAULT_GEMMA_COMMITMENTS);
    SqliteStorage.saveProfile(DEFAULT_GEMMA_PROFILE);
    for (const comm of DEFAULT_GEMMA_COMMITMENTS) {
      SqliteStorage.saveCommitment(comm);
    }
  }, []);

  return {
    profile,
    commitments,
    isDbLoaded,
    updateProfile,
    addCommitment,
    removeCommitment,
    resetToGemmaDefaults,
  };
}
