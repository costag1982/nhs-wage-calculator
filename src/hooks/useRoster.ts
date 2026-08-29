import { useState, useEffect, useMemo, useCallback } from 'react';
import { Shift } from '../domain/models/Shift';
import { ShiftIntervalCalculator } from '../domain/services/ShiftIntervalCalculator';
import { SqliteStorage } from '../domain/database/sqliteService';

export function useRoster(activeMonthDate: Date) {
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [isShiftsLoaded, setIsShiftsLoaded] = useState(false);

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

  const addShift = useCallback((shiftData: Omit<Shift, 'id' | 'breakdown'>) => {
    setAllShifts((prev) => {
      // If a shift already exists on this date, replace it to prevent duplicates
      const existingIndex = prev.findIndex((s) => s.date === shiftData.date);
      const shiftId =
        existingIndex !== -1
          ? prev[existingIndex].id
          : `shift-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

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

      SqliteStorage.saveShift(newShift);
      return next;
    });
  }, []);

  const updateShift = useCallback((id: string, updatedData: Partial<Shift>) => {
    setAllShifts((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const merged = { ...s, ...updatedData };
        const withBreakdown = {
          ...merged,
          breakdown: ShiftIntervalCalculator.calculateBreakdown(merged),
        };
        SqliteStorage.saveShift(withBreakdown);
        return withBreakdown;
      })
    );
  }, []);

  const deleteShift = useCallback((id: string) => {
    setAllShifts((prev) => prev.filter((s) => s.id !== id));
    SqliteStorage.deleteShift(id);
  }, []);

  const clearMonthShifts = useCallback(() => {
    setAllShifts((prev) => prev.filter((s) => !s.date.startsWith(currentMonthPrefix)));
    SqliteStorage.clearMonthShifts(currentMonthPrefix);
  }, [currentMonthPrefix]);

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
  const importSqliteDatabase = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    await SqliteStorage.importDatabaseBinary(buffer);
    const shifts = await SqliteStorage.getAllShifts();
    setAllShifts(
      shifts.map((s) => ({
        ...s,
        breakdown: ShiftIntervalCalculator.calculateBreakdown(s),
      }))
    );
  }, []);

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
  };
}
