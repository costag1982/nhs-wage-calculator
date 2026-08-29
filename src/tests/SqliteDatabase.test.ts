import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { Shift } from '../domain/models/Shift';

describe('SQLite Database Schema & Operations', () => {
  let db: Database;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();

    db.run(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        unpaid_break_minutes INTEGER NOT NULL,
        preset_type TEXT,
        override_band TEXT,
        custom_hourly_rate REAL,
        shift_type TEXT
      );

      CREATE TABLE IF NOT EXISTS employee_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        employee_name TEXT,
        job_title TEXT,
        band TEXT,
        full_time_salary_fte REAL
      );
    `);
  });

  it('inserts and retrieves shifts via SQL queries', () => {
    const sampleShift: Shift = {
      id: 'test-shift-1',
      date: '2026-07-06',
      startTime: '22:00',
      endTime: '06:00',
      unpaidBreakMinutes: 30,
      presetType: 'TWILIGHT',
      shiftType: 'BANK',
    };

    db.run(
      'INSERT INTO shifts (id, date, start_time, end_time, unpaid_break_minutes, preset_type, override_band, custom_hourly_rate, shift_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sampleShift.id,
        sampleShift.date,
        sampleShift.startTime,
        sampleShift.endTime,
        sampleShift.unpaidBreakMinutes,
        sampleShift.presetType || null,
        sampleShift.overrideBand || null,
        sampleShift.customHourlyRate ?? null,
        sampleShift.shiftType || 'SUBSTANTIVE',
      ]
    );

    const res = db.exec('SELECT id, date, start_time, end_time, shift_type FROM shifts WHERE id = "test-shift-1"');
    expect(res.length).toBe(1);
    expect(res[0].values[0][0]).toBe('test-shift-1');
    expect(res[0].values[0][1]).toBe('2026-07-06');
    expect(res[0].values[0][2]).toBe('22:00');
    expect(res[0].values[0][3]).toBe('06:00');
    expect(res[0].values[0][4]).toBe('BANK');
  });

  it('exports and restores SQLite binary data correctly', async () => {
    db.run(
      'INSERT INTO employee_profile (id, employee_name, job_title, band, full_time_salary_fte) VALUES (1, "MISS GEMMA HOWARD", "Admin Support Clerk", "Band 2", 25272.0)'
    );

    const binaryExport = db.export();
    expect(binaryExport).toBeInstanceOf(Uint8Array);
    expect(binaryExport.length).toBeGreaterThan(0);

    const SQL = await initSqlJs();
    const restoredDb = new SQL.Database(binaryExport);
    const res = restoredDb.exec(
      'SELECT employee_name, full_time_salary_fte FROM employee_profile WHERE id = 1'
    );

    expect(res[0].values[0][0]).toBe('MISS GEMMA HOWARD');
    expect(res[0].values[0][1]).toBe(25272.0);
  });
});
