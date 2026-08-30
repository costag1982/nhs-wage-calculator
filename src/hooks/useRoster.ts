import { useState, useEffect, useMemo, useCallback } from 'react';
import { Shift } from '../domain/models/Shift';
import { ShiftIntervalCalculator } from '../domain/services/ShiftIntervalCalculator';
import { SqliteStorage } from '../domain/database/sqliteService';

export function useRoster(activeMonthDate: Date, onMutation?: () => void) {
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [isShiftsLoaded, setIsShiftsLoaded] = useState(false);

  const reloadShiftsFromDatabase = useCallback(async () => {
    try {
      const shifts = await SqliteStorage.getAllShifts();
      const seenDates = new Set<string>();
      const cleanShifts: Shift[] = [];
      for (const s of shifts) {
        if (!seenDates.has(s.date)) {
          seenDates.add(s.date);
          cleanShifts.push(s);
        } else {
          SqliteStorage.deleteShift(s.id);
        }
      }

      setAllShifts(
        cleanShifts.map((s) => ({
          ...s,
          breakdown: ShiftIntervalCalculator.calculateBreakdown(s),
        }))
      );
    } catch (e) {
      console.error('Failed to reload shifts from SQLite', e);
    }
  }, []);

  // Load shifts from SQLite database on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const shifts = await SqliteStorage.getAllShifts();
        if (isMounted) {
          // Clean up any historical duplicate shifts on the same date
          const seenDates = new Set<string>();
          const cleanShifts: Shift[] = [];
          for (const s of shifts) {
            if (!seenDates.has(s.date)) {
              seenDates.add(s.date);
              cleanShifts.push(s);
            } else {
              // Delete duplicate from SQLite
              SqliteStorage.deleteShift(s.id);
            }
          }

          setAllShifts(
            cleanShifts.map((s) => ({
              ...s,
              breakdown: ShiftIntervalCalculator.calculateBreakdown(s),
            }))
          );
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
  }, []);

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
          breakdown: ShiftIntervalCalculator.calculateBreakdown({
            ...shiftData,
            id: shiftId,
          }),
        };

        const next =
          existingIndex !== -1
            ? prev.map((s, idx) => (idx === existingIndex ? newShift : s))
            : [...prev, newShift];

        SqliteStorage.saveShift(newShift).catch((err) => {
          console.error('Failed to save shift to SQLite storage', err);
        });
        onMutation?.();
        return next;
      });
    },
    [onMutation]
  );

  const updateShift = useCallback(
    (id: string, updatedData: Partial<Shift>) => {
      setAllShifts((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const merged = { ...s, ...updatedData };
          const withBreakdown = {
            ...merged,
            breakdown: ShiftIntervalCalculator.calculateBreakdown(merged),
          };
          SqliteStorage.saveShift(withBreakdown).catch((err) => {
            console.error('Failed to update shift in SQLite', err);
          });
          onMutation?.();
          return withBreakdown;
        })
      );
    },
    [onMutation]
  );

  const deleteShift = useCallback(
    (id: string) => {
      setAllShifts((prev) => prev.filter((s) => s.id !== id));
      SqliteStorage.deleteShift(id).catch((err) => {
        console.error('Failed to delete shift from SQLite', err);
      });
      onMutation?.();
    },
    [onMutation]
  );

  const clearMonthShifts = useCallback(() => {
    setAllShifts((prev) => prev.filter((s) => !s.date.startsWith(currentMonthPrefix)));
    SqliteStorage.clearMonthShifts(currentMonthPrefix).catch((err) => {
      console.error('Failed to clear month shifts in SQLite', err);
    });
    onMutation?.();
  }, [currentMonthPrefix, onMutation]);

  // Export SQLite database as a downloadable file
  const exportSqliteDatabase = useCallback(async () => {
    const binary = await SqliteStorage.exportDatabaseBinary();
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
      await SqliteStorage.importDatabaseBinary(buffer);
      const shifts = await SqliteStorage.getAllShifts();
      setAllShifts(
        shifts.map((s) => ({
          ...s,
          breakdown: ShiftIntervalCalculator.calculateBreakdown(s),
        }))
      );
      onMutation?.();
    },
    [onMutation]
  );

  return {
    allShifts,
    monthShifts,
    isShiftsLoaded,
    addShift,
    updateShift,
    deleteShift,
    clearMonthShifts,
    exportSqliteDatabase,
    importSqliteDatabase,
    reloadShiftsFromDatabase,
  };
}
