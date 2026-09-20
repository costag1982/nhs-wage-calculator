import { describe, it, expect } from 'vitest';
import { EmployeeProfile } from '../domain/models/Contract';
import { Shift } from '../domain/models/Shift';
import {
  calculatePayPeriodRow,
  getAllPayPeriodSummaries,
  calculatePayPeriodsTotals,
  exportPayPeriodsToCsv,
  exportShiftsToCsv,
} from '../domain/services/payPeriodService';

const mockProfile: EmployeeProfile = {
  employeeName: 'Gemma Tester',
  jobTitle: 'Registered Nurse',
  department: 'Emergency Dept',
  location: 'Main Hospital',
  band: 'Band 5',
  contractType: 'SUBSTANTIVE',
  fullTimeSalaryFte: 32175,
  standardFullTimeHours: 37.5,
  contractedWeeklyHours: 26.0, // 112.67 monthly basic hours, hourly rate ~ £16.50
  taxCode: '1257L CUMUL',
  niCategory: 'A',
  pensionContributionRate: 0.083,
  taxOfficeName: 'HMRC Pay As You Earn',
  taxOfficeRef: '120/AA5842',
  niNumber: 'QQ123456A',
  employeeNumber: 'N00847291',
  payMethod: 'Bank Credit (BACS)',
};

const mockBankProfile: EmployeeProfile = {
  ...mockProfile,
  contractType: 'BANK_HOURLY',
  contractedWeeklyHours: 0,
};

describe('payPeriodService', () => {
  describe('calculatePayPeriodRow', () => {
    it('calculates contracted, actual, and extra hours correctly for substantive contract', () => {
      const rosterMonth = new Date(2026, 5, 1); // June 2026
      const shifts: Shift[] = [
        {
          id: 's1',
          date: '2026-06-02',
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30, // 7.5 hrs
          shiftType: 'SUBSTANTIVE',
        },
        {
          id: 's2',
          date: '2026-06-06',
          startTime: '22:00',
          endTime: '06:00',
          unpaidBreakMinutes: 30, // 7.5 hrs (overnight)
          shiftType: 'SUBSTANTIVE',
        },
      ];

      const row = calculatePayPeriodRow(mockProfile, shifts, [], rosterMonth, shifts);

      expect(row.rosterMonthIso).toBe('2026-06');
      expect(row.rosterMonthLabel).toBe('June 2026');
      expect(row.payMonthLabel).toBe('July 2026');
      expect(row.payPeriodDisplay).toBe('Worked June 2026 (Paid July 2026)');
      expect(row.shiftCount).toBe(2);
      expect(row.contractedHours).toBe(112.98);
      expect(row.actualHoursWorked).toBe(15.0);
      expect(row.extraHours).toBe(-97.98);
      expect(row.extraHoursPaid).toBe(0);
      expect(row.potentiallyUnpaidHours).toBe(0);
      expect(row.enhancementsDue).toBeGreaterThan(0);
    });

    it('identifies potentially unpaid excess hours when substantive hours exceed contracted hours without overtime logging', () => {
      const rosterMonth = new Date(2026, 5, 1); // June 2026
      // Create 18 shifts of 7.5 hrs = 135 hrs (exceeding 112.98 contracted by 22.02 hrs)
      const shifts: Shift[] = [];
      for (let i = 1; i <= 18; i++) {
        const dayStr = String(i).padStart(2, '0');
        shifts.push({
          id: `s-${i}`,
          date: `2026-06-${dayStr}`,
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        });
      }

      const row = calculatePayPeriodRow(mockProfile, shifts, [], rosterMonth, shifts);

      expect(row.actualHoursWorked).toBe(135.0);
      expect(row.contractedHours).toBe(112.98);
      expect(row.extraHours).toBe(22.02);
      expect(row.extraHoursPaid).toBe(0);
      expect(row.potentiallyUnpaidHours).toBe(22.02);
      expect(row.potentiallyUnpaidAmount).toBeGreaterThan(300);
    });

    it('credits extra hours paid when overtime or bank shifts are logged', () => {
      const rosterMonth = new Date(2026, 5, 1);
      const shifts: Shift[] = [
        {
          id: 's-ot',
          date: '2026-06-10',
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30, // 7.5 hrs
          shiftType: 'OVERTIME',
        },
        {
          id: 's-bank',
          date: '2026-06-15',
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30, // 7.5 hrs
          shiftType: 'BANK',
        },
      ];

      const row = calculatePayPeriodRow(mockProfile, shifts, [], rosterMonth, shifts);

      expect(row.actualHoursWorked).toBe(15.0);
      expect(row.extraHoursPaid).toBe(15.0);
      expect(row.potentiallyUnpaidHours).toBe(0);
    });

    it('handles bank hourly contracts where contracted hours is 0 and all hours are paid', () => {
      const rosterMonth = new Date(2026, 5, 1);
      const shifts: Shift[] = [
        {
          id: 'b1',
          date: '2026-06-05',
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30, // 7.5 hrs
          shiftType: 'BANK',
        },
      ];

      const row = calculatePayPeriodRow(mockBankProfile, shifts, [], rosterMonth, shifts);

      expect(row.contractedHours).toBe(0);
      expect(row.actualHoursWorked).toBe(7.5);
      expect(row.annualLeaveHours).toBe(0);
      expect(row.extraHours).toBe(7.5);
      expect(row.extraHoursPaid).toBe(7.5);
      expect(row.potentiallyUnpaidHours).toBe(0);
    });

    it('factors in annual leave taken in a given month by deducting it from monthly contracted hours', () => {
      const rosterMonth = new Date(2026, 7, 1); // August 2026
      // 8 substantive shifts of 10 hrs = 80.00 hrs
      const shifts: Shift[] = [];
      for (let i = 1; i <= 8; i++) {
        const dayStr = String(i).padStart(2, '0');
        shifts.push({
          id: `work-${i}`,
          date: `2026-08-${dayStr}`,
          startTime: '08:00',
          endTime: '18:00',
          unpaidBreakMinutes: 0,
          shiftType: 'SUBSTANTIVE',
        });
      }

      // Annual leave shift totaling 32.98 hours (e.g. block booking)
      // 32.98 hours = 32 hours 59 minutes (or two shifts: 22h and 10.98h)
      // For precise testing: 00:00 to 23:00 (23h) + 08:00 to 17:59 (9.98h)
      shifts.push(
        {
          id: 'leave-1',
          date: '2026-08-10',
          startTime: '00:00',
          endTime: '23:00',
          unpaidBreakMinutes: 0, // 23.0 hrs
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'leave-2',
          date: '2026-08-11',
          startTime: '08:00',
          endTime: '17:59', // 9h 59m = 9.983 hrs -> 9.98 hrs
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        }
      );

      const row = calculatePayPeriodRow(mockProfile, shifts, [], rosterMonth, shifts);

      expect(row.contractedHours).toBe(112.98);
      expect(row.actualHoursWorked).toBe(80.0);
      expect(row.annualLeaveHours).toBe(32.98);
      // Accounted hours = 80.00 + 32.98 = 112.98 hrs -> Extra hours = 0.00 hrs (no deficit!)
      expect(row.extraHours).toBe(0.0);
      expect(row.potentiallyUnpaidHours).toBe(0);
    });

    it('calculates extra hours when actual worked plus annual leave exceeds contracted hours', () => {
      const rosterMonth = new Date(2026, 7, 1); // August 2026
      // 9 substantive shifts of 10 hrs = 90.00 hrs
      const shifts: Shift[] = [];
      for (let i = 1; i <= 9; i++) {
        const dayStr = String(i).padStart(2, '0');
        shifts.push({
          id: `work-${i}`,
          date: `2026-08-${dayStr}`,
          startTime: '08:00',
          endTime: '18:00',
          unpaidBreakMinutes: 0,
          shiftType: 'SUBSTANTIVE',
        });
      }

      // Annual leave shifts: 23h + 9.98h = 32.98 hrs
      shifts.push(
        {
          id: 'leave-1',
          date: '2026-08-15',
          startTime: '00:00',
          endTime: '23:00',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'leave-2',
          date: '2026-08-16',
          startTime: '08:00',
          endTime: '17:59',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        }
      );

      const row = calculatePayPeriodRow(mockProfile, shifts, [], rosterMonth, shifts);

      expect(row.contractedHours).toBe(112.98);
      expect(row.actualHoursWorked).toBe(90.0);
      expect(row.annualLeaveHours).toBe(32.98);
      expect(row.totalAccountedHours).toBe(122.98);
      // Accounted hours = 90.00 + 32.98 = 122.98 hrs -> Extra hours = 10.00 hrs
      expect(row.extraHours).toBe(10.0);
      expect(row.potentiallyUnpaidHours).toBe(10.0);
    });
  });

  describe('getAllPayPeriodSummaries & calculatePayPeriodsTotals', () => {
    it('aggregates multi-month shifts and computes accurate totals', () => {
      const shifts: Shift[] = [
        {
          id: 's-may',
          date: '2026-05-15',
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        },
        {
          id: 's-jun',
          date: '2026-06-15',
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        },
      ];

      const rows = getAllPayPeriodSummaries(mockProfile, shifts, []);
      expect(rows.length).toBe(2);
      expect(rows[0].rosterMonthIso).toBe('2026-05');
      expect(rows[1].rosterMonthIso).toBe('2026-06');

      const totals = calculatePayPeriodsTotals(rows);
      expect(totals.totalShifts).toBe(2);
      expect(totals.totalActualHoursWorked).toBe(15.0);
      expect(totals.totalAccountedHours).toBe(15.0);
      expect(totals.totalContractedHours).toBe(225.96);
    });
  });

  describe('exportPayPeriodsToCsv', () => {
    it('generates valid CSV string with correct headers and rows', () => {
      const rosterMonth = new Date(2026, 5, 1);
      const shifts: Shift[] = [
        {
          id: 's1',
          date: '2026-06-02',
          startTime: '07:30',
          endTime: '15:30',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        },
      ];

      const row = calculatePayPeriodRow(mockProfile, shifts, [], rosterMonth, shifts);
      const csv = exportPayPeriodsToCsv([row], mockProfile);

      expect(csv).toContain(
        'Worked Month,Payment Month,Tax Period,Contracted Hours,Actual Hours Worked,Annual Leave Hours'
      );
      expect(csv).toContain('June 2026,July 2026,Month 4');
      expect(csv).toContain('TOTALS');
    });
  });

  describe('exportShiftsToCsv', () => {
    it('generates shift-by-shift CSV with week number, start date, end date over 2 days and breakdown', () => {
      const shifts: Shift[] = [
        {
          id: 's-twilight',
          date: '2026-06-06',
          startTime: '22:00',
          endTime: '06:00',
          unpaidBreakMinutes: 30,
          presetType: 'TWILIGHT',
          shiftType: 'SUBSTANTIVE',
        },
      ];

      const csv = exportShiftsToCsv(shifts, mockProfile);

      expect(csv).toContain('Week Number,Start Date,End Date,Start Time,End Time');
      expect(csv).toContain('Week 23,2026-06-06,2026-06-07,22:00,06:00,30');
    });
  });
});
