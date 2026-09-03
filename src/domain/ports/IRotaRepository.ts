import { Shift } from '../models/Shift';

/**
 * Port representing shift and rota persistence operations.
 */
export interface RotaRepository {
  readonly getAllShifts: () => Promise<Shift[]>;
  readonly saveShift: (shift: Shift) => Promise<void>;
  readonly deleteShift: (id: string) => Promise<void>;
  readonly clearMonthShifts: (monthPrefix: string) => Promise<void>;
  readonly replaceAllShifts: (shifts: Shift[]) => Promise<void>;
}
