import { Database } from 'sql.js';
import { Shift } from '../../../domain/models/Shift';
import { RotaRepository } from '../../../domain/ports/IRotaRepository';
import { getDb, persistToIndexedDb } from './sqliteClient';

export const createSqliteRotaRepository = (
  getDatabase: () => Promise<Database> = getDb
): RotaRepository => {
  const getAllShifts = async (): Promise<Shift[]> => {
    const db = await getDatabase();
    const res = db.exec(
      'SELECT id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate, shift_type, unpaid_break_start_time, custom_enhancement_hourly_rate, holiday_pay_hourly_rate, status FROM shifts ORDER BY date ASC'
    );
    if (!res || res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row) => {
      const rowObj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        rowObj[col] = row[idx];
      });
      return {
        id: rowObj.id as string,
        date: rowObj.date as string,
        startTime: rowObj.start_time as string,
        endTime: rowObj.end_time as string,
        unpaidBreakMinutes: (rowObj.unpaid_break_minutes as number) || 0,
        presetType: rowObj.preset_type as Shift['presetType'],
        shiftType: (rowObj.shift_type as Shift['shiftType']) || 'SUBSTANTIVE',
        status: rowObj.status ? (rowObj.status as Shift['status']) : undefined,
        overrideBand: rowObj.override_band
          ? (rowObj.override_band as Shift['overrideBand'])
          : undefined,
        customHourlyRate: rowObj.custom_hourly_rate
          ? (rowObj.custom_hourly_rate as number)
          : undefined,
        unpaidBreakStartTime: rowObj.unpaid_break_start_time
          ? (rowObj.unpaid_break_start_time as string)
          : undefined,
        customEnhancementHourlyRate: rowObj.custom_enhancement_hourly_rate
          ? (rowObj.custom_enhancement_hourly_rate as number)
          : undefined,
        holidayPayHourlyRate: rowObj.holiday_pay_hourly_rate
          ? (rowObj.holiday_pay_hourly_rate as number)
          : undefined,
      };
    });
  };

  const saveShift = async (shift: Shift): Promise<void> => {
    const db = await getDatabase();
    db.run(
      'INSERT OR REPLACE INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate, shift_type, unpaid_break_start_time, custom_enhancement_hourly_rate, holiday_pay_hourly_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        shift.id,
        shift.date,
        shift.startTime,
        shift.endTime,
        shift.unpaidBreakMinutes,
        shift.presetType || null,
        shift.overrideBand || null,
        shift.customHourlyRate ?? null,
        shift.shiftType || 'SUBSTANTIVE',
        shift.unpaidBreakStartTime ?? null,
        shift.customEnhancementHourlyRate ?? null,
        shift.holidayPayHourlyRate ?? null,
        shift.status ?? null,
      ]
    );
    await persistToIndexedDb(db);
  };

  const deleteShift = async (id: string): Promise<void> => {
    const db = await getDatabase();
    db.run('DELETE FROM shifts WHERE id = ?', [id]);
    await persistToIndexedDb(db);
  };

  const clearMonthShifts = async (monthPrefix: string): Promise<void> => {
    const db = await getDatabase();
    db.run('DELETE FROM shifts WHERE date LIKE ?', [`${monthPrefix}%`]);
    await persistToIndexedDb(db);
  };

  const replaceAllShifts = async (shifts: Shift[]): Promise<void> => {
    const db = await getDatabase();
    db.run('DELETE FROM shifts');
    for (const shift of shifts) {
      db.run(
        'INSERT INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate, shift_type, unpaid_break_start_time, custom_enhancement_hourly_rate, holiday_pay_hourly_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          shift.id,
          shift.date,
          shift.startTime,
          shift.endTime,
          shift.unpaidBreakMinutes,
          shift.presetType || null,
          shift.overrideBand || null,
          shift.customHourlyRate ?? null,
          shift.shiftType || 'SUBSTANTIVE',
          shift.unpaidBreakStartTime ?? null,
          shift.customEnhancementHourlyRate ?? null,
          shift.holidayPayHourlyRate ?? null,
          shift.status ?? null,
        ]
      );
    }
    await persistToIndexedDb(db);
  };

  return {
    getAllShifts,
    saveShift,
    deleteShift,
    clearMonthShifts,
    replaceAllShifts,
  };
};

export const sqliteRotaRepository = createSqliteRotaRepository();
