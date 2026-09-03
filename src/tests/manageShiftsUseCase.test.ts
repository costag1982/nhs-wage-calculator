import { describe, it, expect, vi } from 'vitest';
import { createManageShiftsUseCase } from '../application/use-cases/manageShiftsUseCase';
import { RotaRepository } from '../domain/ports/IRotaRepository';
import { Shift } from '../domain/models/Shift';

describe('ManageShiftsUseCase', () => {
  const createMockRepo = (initialShifts: Shift[] = []): RotaRepository => {
    let store = [...initialShifts];
    return {
      getAllShifts: vi.fn(async () => [...store]),
      saveShift: vi.fn(async (shift) => {
        store = [...store.filter((s) => s.id !== shift.id), shift];
      }),
      deleteShift: vi.fn(async (id) => {
        store = store.filter((s) => s.id !== id);
      }),
      clearMonthShifts: vi.fn(async (monthPrefix) => {
        store = store.filter((s) => !s.date.startsWith(monthPrefix));
      }),
      replaceAllShifts: vi.fn(async (shifts) => {
        store = [...shifts];
      }),
    };
  };

  it('loads clean shifts and deduplicates duplicate dates', async () => {
    const duplicateShifts: Shift[] = [
      {
        id: 'shift-1',
        date: '2026-06-10',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
      },
      {
        id: 'shift-duplicate',
        date: '2026-06-10',
        startTime: '09:00',
        endTime: '17:00',
        unpaidBreakMinutes: 30,
      },
      {
        id: 'shift-2',
        date: '2026-06-11',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 30,
      },
    ];

    const repo = createMockRepo(duplicateShifts);
    const useCase = createManageShiftsUseCase({ rotaRepository: repo });

    const clean = await useCase.loadCleanShifts();

    expect(clean.length).toBe(2);
    expect(clean[0].id).toBe('shift-1');
    expect(clean[1].id).toBe('shift-2');
    // Verifies duplicate was pruned from persistence
    expect(repo.deleteShift).toHaveBeenCalledWith('shift-duplicate');
    // Verifies shift breakdown was calculated and attached
    expect(clean[0].breakdown).toBeDefined();
    expect(clean[0].breakdown?.totalWorkedHours).toBe(7.5);
  });

  it('delegates shift saving, deleting, and clearing to repository', async () => {
    const repo = createMockRepo();
    const useCase = createManageShiftsUseCase({ rotaRepository: repo });

    const shift: Shift = {
      id: 's-1',
      date: '2026-07-01',
      startTime: '07:30',
      endTime: '15:30',
      unpaidBreakMinutes: 30,
    };

    await useCase.saveShift(shift);
    expect(repo.saveShift).toHaveBeenCalledWith(shift);

    await useCase.deleteShift('s-1');
    expect(repo.deleteShift).toHaveBeenCalledWith('s-1');

    await useCase.clearMonthShifts('2026-07');
    expect(repo.clearMonthShifts).toHaveBeenCalledWith('2026-07');
  });
});
