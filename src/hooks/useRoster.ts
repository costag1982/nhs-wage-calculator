import { useState, useEffect, useMemo, useCallback } from 'react';
import { Shift } from '../domain/models/Shift';
import { calculateShiftBreakdown } from '../domain/services/shiftIntervalCalculator';
import { manageShiftsUseCase } from '../application/use-cases/manageShiftsUseCase';
import {
  exportDatabaseBinary,
  importDatabaseBinary,
} from '../infrastructure/storage/sqlite/sqliteClient';

export const useRoster = (
  activeMonthDate: Date,
  onMutation?: () => void,
  shiftsUseCase = manageShiftsUseCase
) => {
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [isShiftsLoaded, setIsShiftsLoaded] = useState(false);

  const reloadShiftsFromDatabase = useCallback(async () => {
    try {
      const cleanShifts = await shiftsUseCase.loadCleanShifts();
      setAllShifts(cleanShifts);
    } catch (e) {
      console.error('Failed to reload shifts from SQLite', e);
    }
  }, [shiftsUseCase]);

  // Load shifts from database on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cleanShifts = await shiftsUseCase.loadCleanShifts();
        if (isMounted) {
          setAllShifts(cleanShifts);
          setIsShiftsLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load shifts from SQLite', e);
        if (isMounted) setIsShiftsLoaded(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [shiftsUseCase]);

  // Year-Month prefix e.g. "2026-07"
  const currentMonthPrefix = useMemo(() => {
    const year = activeMonthDate.getFullYear();
    const month = String(activeMonthDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [activeMonthDate]);

  // Filter shifts belonging to active month
  const monthShifts = useMemo(() => {
    return allShifts.filter((s) => s.date.startsWith(currentMonthPrefix));
  }, [allShifts, currentMonthPrefix]);

  const addShift = useCallback(
    (shiftData: Omit<Shift, 'id' | 'breakdown'>) => {
      setAllShifts((prev) => {
        // If a shift already exists on this date, replace it to prevent duplicates
        const existingIndex = prev.findIndex((s) => s.date === shiftData.date);
        const shiftId =
          existingIndex !== -1
            ? prev[existingIndex].id
            : typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const newShift: Shift = {
          ...shiftData,
          id: shiftId,
          breakdown: calculateShiftBreakdown({
            ...shiftData,
            id: shiftId,
          }),
        };

        const next =
          existingIndex !== -1
            ? prev.map((s, idx) => (idx === existingIndex ? newShift : s))
            : [...prev, newShift];

        shiftsUseCase.saveShift(newShift).catch((err) => {
          console.error('Failed to save shift to SQLite storage', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation, shiftsUseCase]
  );

  const addShiftsBatch = useCallback(
    (shiftsData: Omit<Shift, 'id' | 'breakdown'>[]) => {
      setAllShifts((prev) => {
        const updated = [...prev];
        const toPersist: Shift[] = [];

        for (const data of shiftsData) {
          const existingIndex = updated.findIndex((s) => s.date === data.date);
          const shiftId =
            existingIndex !== -1
              ? updated[existingIndex].id
              : typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          const newShift: Shift = {
            ...data,
            id: shiftId,
            breakdown: calculateShiftBreakdown({
              ...data,
              id: shiftId,
            }),
          };

          if (existingIndex !== -1) {
            updated[existingIndex] = newShift;
          } else {
            updated.push(newShift);
          }
          toPersist.push(newShift);
        }

        Promise.all(toPersist.map((s) => shiftsUseCase.saveShift(s))).catch((err) => {
          console.error('Failed to save shifts batch to SQLite', err);
        });
        onMutation?.();
        return updated;
      });
    },
    [onMutation, shiftsUseCase]
  );

  const updateShift = useCallback(
    (id: string, updatedData: Partial<Shift>) => {
      setAllShifts((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const merged = { ...s, ...updatedData };
          const withBreakdown = {
            ...merged,
            breakdown: calculateShiftBreakdown(merged),
          };
          shiftsUseCase.saveShift(withBreakdown).catch((err) => {
            console.error('Failed to update shift in SQLite', err);
          });
          onMutation?.();
          return withBreakdown;
        })
      );
    },
    [onMutation, shiftsUseCase]
  );

  const deleteShift = useCallback(
    (id: string) => {
      setAllShifts((prev) => prev.filter((s) => s.id !== id));
      shiftsUseCase.deleteShift(id).catch((err) => {
        console.error('Failed to delete shift from SQLite', err);
      });
      onMutation?.();
    },
    [onMutation, shiftsUseCase]
  );

  const clearMonthShifts = useCallback(() => {
    setAllShifts((prev) => prev.filter((s) => !s.date.startsWith(currentMonthPrefix)));
    shiftsUseCase.clearMonthShifts(currentMonthPrefix).catch((err) => {
      console.error('Failed to clear month shifts in SQLite', err);
    });
    onMutation?.();
  }, [currentMonthPrefix, onMutation, shiftsUseCase]);

  // Export SQLite database as a downloadable file
  const exportSqliteDatabase = useCallback(async () => {
    const binary = await exportDatabaseBinary();
    const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhs_roster_database_${new Date().toISOString().split('T')[0]}.sqlite`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Import SQLite database from a user file
  const importSqliteDatabase = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      await importDatabaseBinary(buffer);
      const cleanShifts = await shiftsUseCase.loadCleanShifts();
      setAllShifts(cleanShifts);
      onMutation?.();
    },
    [onMutation, shiftsUseCase]
  );

  return {
    allShifts,
    monthShifts,
    isShiftsLoaded,
    addShift,
    addShiftsBatch,
    updateShift,
    deleteShift,
    clearMonthShifts,
    exportSqliteDatabase,
    importSqliteDatabase,
    reloadShiftsFromDatabase,
  };
};
