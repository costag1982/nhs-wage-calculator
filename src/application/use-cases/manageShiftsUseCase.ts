import { Shift } from '../../domain/models/Shift';
import { RotaRepository } from '../../domain/ports/IRotaRepository';
import { calculateShiftBreakdown } from '../../domain/services/shiftIntervalCalculator';
import { sqliteRotaRepository } from '../../infrastructure/storage/sqlite/sqliteRotaRepository';

export interface ManageShiftsDependencies {
  readonly rotaRepository: RotaRepository;
}

export const createManageShiftsUseCase = (deps: Partial<ManageShiftsDependencies> = {}) => {
  const rotaRepo = deps.rotaRepository || sqliteRotaRepository;

  const loadCleanShifts = async (): Promise<Shift[]> => {
    const rawShifts = await rotaRepo.getAllShifts();
    const seenDates = new Set<string>();
    const cleanShifts: Shift[] = [];

    for (const s of rawShifts) {
      if (!seenDates.has(s.date)) {
        seenDates.add(s.date);
        cleanShifts.push(s);
      } else {
        // Clean up duplicate shifts from persistence
        await rotaRepo.deleteShift(s.id);
      }
    }

    return cleanShifts.map((s) => ({
      ...s,
      breakdown: calculateShiftBreakdown(s),
    }));
  };

  const saveShift = async (shift: Shift): Promise<void> => {
    await rotaRepo.saveShift(shift);
  };

  const deleteShift = async (id: string): Promise<void> => {
    await rotaRepo.deleteShift(id);
  };

  const clearMonthShifts = async (monthPrefix: string): Promise<void> => {
    await rotaRepo.clearMonthShifts(monthPrefix);
  };

  const replaceAllShifts = async (shifts: Shift[]): Promise<void> => {
    await rotaRepo.replaceAllShifts(shifts);
  };

  return {
    loadCleanShifts,
    saveShift,
    deleteShift,
    clearMonthShifts,
    replaceAllShifts,
  };
};

export const manageShiftsUseCase = createManageShiftsUseCase();
