import { describe, it, expect } from 'vitest';
import { calculateMonthlyPayslip } from '../domain/services/wageCalculatorService';
import {
  calculateAnnualLeaveEntitlement,
  calculateAnnualLeaveBalance,
} from '../domain/services/annualLeaveCalculator';
import { EmployeeProfile } from '../domain/models/Contract';
import { Shift } from '../domain/models/Shift';

describe('NHS Annual Leave & Entitlement (AfC Section 13)', () => {
  const gemmaProfile: EmployeeProfile = {
    employeeName: 'MISS GEMMA HOWARD',
    jobTitle: 'Admin Support Clerk',
    department: 'Emergency Depart',
    location: 'Airedale General Hospital',
    band: 'Band 2',
    contractType: 'SUBSTANTIVE',
    fullTimeSalaryFte: 25272.0,
    standardFullTimeHours: 37.5,
    contractedWeeklyHours: 26.0,
    yearsOfServiceTier: 'UNDER_5',
    annualLeaveCarryOverHours: 0,
    taxCode: '1257L CUMUL',
    niCategory: 'A',
    pensionContributionRate: 0.065,
    taxOfficeName: 'W Yorkshire And Crav',
    taxOfficeRef: '072/A7150',
    niNumber: 'JR087301B',
    employeeNumber: '31580711',
    payMethod: 'BACS',
  };

  describe('AfC Section 13 Pro-Rata Hours Entitlement Formula', () => {
    it('calculates correct pro-rata entitlement for Gemma (<5 years service: 182.0 hours total)', () => {
      const entitlement = calculateAnnualLeaveEntitlement(gemmaProfile);

      // (26 / 37.5) * (27 * 7.5) = 140.4 hours
      expect(entitlement.annualLeaveDays).toBe(27);
      expect(entitlement.annualLeaveHours).toBe(140.4);

      // (26 / 37.5) * (8 * 7.5) = 41.6 hours
      expect(entitlement.bankHolidayDays).toBe(8);
      expect(entitlement.bankHolidayHours).toBe(41.6);

      // Total Pot = 140.4 + 41.6 = 182.0 hours
      expect(entitlement.totalEntitlementHours).toBe(182.0);
    });

    it('calculates correct pro-rata entitlement for 5-10 years service tier (192.4 hours total)', () => {
      const profile5Years: EmployeeProfile = {
        ...gemmaProfile,
        yearsOfServiceTier: 'FIVE_TO_TEN',
      };
      const entitlement = calculateAnnualLeaveEntitlement(profile5Years);

      // (26 / 37.5) * (29 * 7.5) = 150.8 hours AL + 41.6 hours BH = 192.4 hours
      expect(entitlement.annualLeaveDays).toBe(29);
      expect(entitlement.annualLeaveHours).toBe(150.8);
      expect(entitlement.bankHolidayHours).toBe(41.6);
      expect(entitlement.totalEntitlementHours).toBe(192.4);
    });

    it('calculates correct pro-rata entitlement for 10+ years service tier (213.2 hours total)', () => {
      const profile10Years: EmployeeProfile = {
        ...gemmaProfile,
        yearsOfServiceTier: 'TEN_PLUS',
      };
      const entitlement = calculateAnnualLeaveEntitlement(profile10Years);

      // (26 / 37.5) * (33 * 7.5) = 171.6 hours AL + 41.6 hours BH = 213.2 hours
      expect(entitlement.annualLeaveDays).toBe(33);
      expect(entitlement.annualLeaveHours).toBe(171.6);
      expect(entitlement.bankHolidayHours).toBe(41.6);
      expect(entitlement.totalEntitlementHours).toBe(213.2);
    });

    it('includes carry-over hours from previous leave year into total pot', () => {
      const profileWithCarryOver: EmployeeProfile = {
        ...gemmaProfile,
        annualLeaveCarryOverHours: 15.0,
      };
      const entitlement = calculateAnnualLeaveEntitlement(profileWithCarryOver);

      expect(entitlement.carryOverHours).toBe(15.0);
      expect(entitlement.totalEntitlementHours).toBe(197.0); // 182.0 + 15.0
    });
  });

  describe('Leave Balance & Leave Year Tracking (1 April – 31 March)', () => {
    it('calculates taken year-to-date and remaining balance accurately', () => {
      const shifts: Shift[] = [
        // 2 days of AL in June 2026 (7.5h each = 15h)
        {
          id: 'al-1',
          date: '2026-06-08',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'al-2',
          date: '2026-06-09',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        // 1 day of AL in July 2026 (7.5h)
        {
          id: 'al-3',
          date: '2026-07-15',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
      ];

      const balanceJune = calculateAnnualLeaveBalance(
        gemmaProfile,
        shifts,
        new Date(2026, 5, 1) // June 2026
      );

      expect(balanceJune.leaveYearLabel).toBe('2026/27');
      expect(balanceJune.takenThisMonthHours).toBe(15.0);
      expect(balanceJune.takenYearToDateHours).toBe(22.5);
      expect(balanceJune.remainingHours).toBe(159.5); // 182.0 - 22.5
    });
  });

  describe('Integration with Weekly Contracted Hours & Additional Hours Engine', () => {
    it('counts Annual Leave hours towards weekly 26.0h threshold so worked shifts trigger Additional Hours', () => {
      // In Week 28 (2026-07-06 to 2026-07-12):
      // Gemma takes 1 day of AL (7.5h) and works 3x 7.5h shifts (22.5h)
      // Total accounted hours = 30.0h. Excess over 26.0h contracted = 4.0h Additional Hours (@ £12.9245 = £51.70)
      const shifts: Shift[] = [
        {
          id: 'al-1',
          date: '2026-07-06', // Monday
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        }, // 7.5h AL
        {
          id: 'w-1',
          date: '2026-07-07', // Tuesday
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        }, // 7.5h Worked
        {
          id: 'w-2',
          date: '2026-07-08', // Wednesday
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        }, // 7.5h Worked
        {
          id: 'w-3',
          date: '2026-07-09', // Thursday
          startTime: '08:00',
          endTime: '12:00',
          unpaidBreakMinutes: 0,
          shiftType: 'OVERTIME',
        }, // 4.0h Extra OVERTIME Worked
      ];

      const result = calculateMonthlyPayslip(
        gemmaProfile,
        shifts,
        [],
        new Date(2026, 6, 1) // July 2026
      );

      // Monthly basic pay: £1,460.16
      expect(result.monthlyBasicPay).toBe(1460.16);

      // Additional hours: 4.0h @ plain time = £51.70
      expect(result.additionalHours).toBe(4.0);
      expect(result.additionalHoursPay).toBe(51.7);
      expect(result.overtimeHours).toBeUndefined();

      // Annual leave hours recorded in month
      expect(result.annualLeaveHours).toBe(7.5);

      // Gross pay: £1460.16 (Basic) + £51.70 (Additional) = £1511.86
      expect(result.grossPay).toBe(1511.86);
    });

    it('pays normal basic salary with 0 additional hours when employee takes full week of annual leave (26.0h)', () => {
      // Week 28: 26.0h of AL booked, 0 shifts worked
      const shifts: Shift[] = [
        {
          id: 'al-1',
          date: '2026-07-06',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        }, // 7.5h
        {
          id: 'al-2',
          date: '2026-07-07',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        }, // 7.5h
        {
          id: 'al-3',
          date: '2026-07-08',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        }, // 7.5h
        {
          id: 'al-4',
          date: '2026-07-09',
          startTime: '08:00',
          endTime: '11:30',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        }, // 3.5h (Total = 26.0h)
      ];

      const result = calculateMonthlyPayslip(gemmaProfile, shifts, [], new Date(2026, 6, 1));

      // Monthly basic pay is fully paid
      expect(result.monthlyBasicPay).toBe(1460.16);
      expect(result.additionalHours).toBeUndefined();
      expect(result.overtimeHours).toBeUndefined();
      expect(result.annualLeaveHours).toBe(26.0);
      expect(result.grossPay).toBe(1460.16);
    });

    it('correctly calculates overtime (1.5x) when leave + extra OVERTIME shifts exceed FTE 37.5h threshold', () => {
      // Week 28: 7.5h AL + 18.5h substantive = 26.0h rostered + 16.5h extra OVERTIME shifts (total 42.5h accounted)
      // Overtime above FTE 37.5h = 5.0h @ 1.5x (£19.3868) = £96.93
      // Additional hours (26.0h to 37.5h) = 11.5h @ 1.0x (£12.9245) = £148.63
      const shifts: Shift[] = [
        {
          id: 'al-1',
          date: '2026-07-06',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        }, // 7.5h AL
        {
          id: 'w-1',
          date: '2026-07-07',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        }, // 7.5h
        {
          id: 'w-2',
          date: '2026-07-08',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        }, // 7.5h
        {
          id: 'w-3',
          date: '2026-07-09',
          startTime: '08:00',
          endTime: '11:30',
          unpaidBreakMinutes: 0,
          shiftType: 'SUBSTANTIVE',
        }, // 3.5h (Total rostered = 26.0h)
        {
          id: 'w-4',
          date: '2026-07-10',
          startTime: '07:30',
          endTime: '19:00',
          unpaidBreakMinutes: 0,
          shiftType: 'OVERTIME',
        }, // 11.5h OVERTIME
        {
          id: 'w-5',
          date: '2026-07-11',
          startTime: '08:00',
          endTime: '13:00',
          unpaidBreakMinutes: 0,
          shiftType: 'OVERTIME',
        }, // 5.0h OVERTIME
      ];

      const result = calculateMonthlyPayslip(gemmaProfile, shifts, [], new Date(2026, 6, 1));

      expect(result.additionalHours).toBe(11.5);
      expect(result.additionalHoursPay).toBe(148.63);
      expect(result.overtimeHours).toBe(5.0);
      expect(result.overtimePay).toBe(96.93);
    });

    it('does not accrue unsocial enhancements on annual leave booked on weekends or bank holidays', () => {
      const shifts: Shift[] = [
        {
          id: 'al-sun',
          date: '2026-06-14', // Sunday
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
      ];

      const result = calculateMonthlyPayslip(gemmaProfile, shifts, [], new Date(2026, 5, 1));

      expect(result.enhancementsTotal).toBe(0);
      expect(result.payLineItems.find((p) => p.description.includes('Sunday EN'))).toBeUndefined();
    });

    it('correctly handles Half Day (3.75h) annual leave booking in monthly balance calculation', () => {
      const shifts: Shift[] = [
        {
          id: 'al-half',
          date: '2026-06-15',
          startTime: '08:00',
          endTime: '11:45',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
          presetType: 'ANNUAL_LEAVE_HALF',
        },
      ];

      const balance = calculateAnnualLeaveBalance(gemmaProfile, shifts, new Date(2026, 5, 1));

      expect(balance.takenThisMonthHours).toBe(3.75);
      expect(balance.takenYearToDateHours).toBe(3.75);
      expect(balance.remainingHours).toBe(178.25); // 182.0 - 3.75 = 178.25
    });
  });

  describe('NHS Acute Ward Shift Deductions & Allocate HealthRoster Leave Tracking (192.5h Base)', () => {
    const liveGemmaProfile: EmployeeProfile = {
      ...gemmaProfile,
      yearsOfServiceTier: 'FIVE_TO_TEN',
      annualLeaveBaseHoursOverride: 192.5,
    };

    it('calculates 192.5h Base Entitlement matching Allocate HealthRoster', () => {
      const entitlement = calculateAnnualLeaveEntitlement(liveGemmaProfile);

      expect(entitlement.baseHours).toBe(192.5);
      expect(entitlement.totalEntitlementHours).toBe(192.5);
      // Split proportionally (29 AL days / 37 total days)
      expect(entitlement.annualLeaveDays).toBe(29);
      expect(entitlement.bankHolidayDays).toBe(8);
      expect(entitlement.annualLeaveHours + entitlement.bankHolidayHours).toBe(192.5);
    });

    it('deducts exact net working hours per shift (excluding unpaid meal breaks)', () => {
      const wardShifts: Shift[] = [
        // 10.0h Night Duty (20:00 - 06:00, 0m break)
        {
          id: 'al-night',
          date: '2026-06-03',
          startTime: '20:00',
          endTime: '06:00',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
          presetType: 'ANNUAL_LEAVE_NIGHT',
        },
        // 11.0h Long Day (08:00 - 19:30, 30m break: 11.5h - 0.5h = 11.0h)
        {
          id: 'al-longday',
          date: '2026-06-14',
          startTime: '08:00',
          endTime: '19:30',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
          presetType: 'ANNUAL_LEAVE_LONG_DAY',
        },
        // 4.0h Twilight Shift (10:00 - 14:00, 0m break)
        {
          id: 'al-twilight',
          date: '2026-06-17',
          startTime: '10:00',
          endTime: '14:00',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
          presetType: 'ANNUAL_LEAVE_TWILIGHT',
        },
        // 7.5h Standard Day (08:00 - 16:00, 30m break: 8.0h - 0.5h = 7.5h)
        {
          id: 'al-standard',
          date: '2026-06-22',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
          presetType: 'ANNUAL_LEAVE_FULL',
        },
      ];

      const balance = calculateAnnualLeaveBalance(
        liveGemmaProfile,
        wardShifts,
        new Date(2026, 5, 1)
      );

      // Total deducted: 10.0 + 11.0 + 4.0 + 7.5 = 32.5 hours
      expect(balance.takenYearToDateHours).toBe(32.5);
      expect(balance.remainingHours).toBe(160.0); // 192.5 - 32.5 = 160.0
    });

    it('reproduces Gemma live HealthRoster numbers: 192.5h Base, 111.5h Taken, 74.0h Approved -> 7.0h Remaining', () => {
      // Past taken shifts: 111.5 hours
      const pastShifts: Shift[] = [
        {
          id: 'past-1',
          date: '2026-04-02',
          startTime: '08:00',
          endTime: '19:30',
          unpaidBreakMinutes: 30, // 11.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'past-2',
          date: '2026-05-10',
          startTime: '20:00',
          endTime: '06:00',
          unpaidBreakMinutes: 0, // 10.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'past-3',
          date: '2026-06-01',
          startTime: '08:00',
          endTime: '19:30',
          unpaidBreakMinutes: 30, // 11.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'past-bulk',
          date: '2026-07-01',
          startTime: '00:00',
          endTime: '23:30',
          unpaidBreakMinutes: 0, // 23.5h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'past-bulk-2',
          date: '2026-08-01',
          startTime: '00:00',
          endTime: '23:00',
          unpaidBreakMinutes: 0, // 23.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'past-bulk-3',
          date: '2026-08-15',
          startTime: '00:00',
          endTime: '23:00',
          unpaidBreakMinutes: 0, // 23.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'past-bulk-4',
          date: '2026-09-01',
          startTime: '10:00',
          endTime: '20:00',
          unpaidBreakMinutes: 0, // 10.0h
          shiftType: 'ANNUAL_LEAVE',
        },
      ]; // Total past: 11 + 10 + 11 + 23.5 + 23 + 23 + 10 = 111.5h

      // Future approved shifts: 74.0 hours
      const futureShifts: Shift[] = [
        {
          id: 'future-1',
          date: '2026-10-12',
          startTime: '08:00',
          endTime: '19:30',
          unpaidBreakMinutes: 30, // 11.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'future-2',
          date: '2026-11-05',
          startTime: '20:00',
          endTime: '06:00',
          unpaidBreakMinutes: 0, // 10.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'future-bulk-1',
          date: '2026-12-20',
          startTime: '00:00',
          endTime: '23:00',
          unpaidBreakMinutes: 0, // 23.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'future-bulk-2',
          date: '2027-01-10',
          startTime: '00:00',
          endTime: '23:00',
          unpaidBreakMinutes: 0, // 23.0h
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'future-3',
          date: '2027-02-14',
          startTime: '10:00',
          endTime: '17:00',
          unpaidBreakMinutes: 0, // 7.0h
          shiftType: 'ANNUAL_LEAVE',
        },
      ]; // Total future: 11 + 10 + 23 + 23 + 7 = 74.0h

      const allLeave = [...pastShifts, ...futureShifts];
      const balance = calculateAnnualLeaveBalance(liveGemmaProfile, allLeave, new Date(2026, 8, 3)); // Sept 3, 2026

      expect(balance.entitlement.totalEntitlementHours).toBe(192.5);
      expect(balance.takenHours).toBe(111.5);
      expect(balance.approvedHours).toBe(74.0);
      expect(balance.remainingHours).toBe(7.0);
      expect(balance.countdownText).toBe('Entitlement ends in 6 months and 28 days');
    });

    it('groups consecutive dates into a single leave episode (e.g. 7 days)', () => {
      const episodeShifts: Shift[] = [
        {
          id: 'ep1',
          date: '2026-04-02',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'ep2',
          date: '2026-04-03',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'ep3',
          date: '2026-04-04',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'ep4',
          date: '2026-04-05',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'ep5',
          date: '2026-04-06',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'ep6',
          date: '2026-04-07',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'ep7',
          date: '2026-04-08',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'ANNUAL_LEAVE',
        },
      ];

      const balance = calculateAnnualLeaveBalance(
        liveGemmaProfile,
        episodeShifts,
        new Date(2026, 3, 1)
      );
      expect(balance.episodes).toHaveLength(1);
      expect(balance.episodes[0].daysCount).toBe(7);
      expect(balance.episodes[0].startDate).toBe('2026-04-02');
      expect(balance.episodes[0].endDate).toBe('2026-04-08');
      expect(balance.episodes[0].formattedDateRange).toBe('02 Apr 2026 - 08 Apr 2026');
      expect(balance.episodes[0].totalHours).toBe(52.5); // 7 * 7.5h
    });

    it('handles 7-day full week block booking deducting exactly 26.0 contracted hours', () => {
      // 7 days distributed totaling 26.0h (5x 3.7h + 2x 3.75h = 26.0h)
      const weekBlockShifts: Shift[] = [
        {
          id: 'b1',
          date: '2026-04-02',
          startTime: '08:00',
          endTime: '11:42',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'b2',
          date: '2026-04-03',
          startTime: '08:00',
          endTime: '11:42',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'b3',
          date: '2026-04-04',
          startTime: '08:00',
          endTime: '11:42',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'b4',
          date: '2026-04-05',
          startTime: '08:00',
          endTime: '11:42',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'b5',
          date: '2026-04-06',
          startTime: '08:00',
          endTime: '11:42',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'b6',
          date: '2026-04-07',
          startTime: '08:00',
          endTime: '11:45',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
        {
          id: 'b7',
          date: '2026-04-08',
          startTime: '08:00',
          endTime: '11:45',
          unpaidBreakMinutes: 0,
          shiftType: 'ANNUAL_LEAVE',
        },
      ];

      const balance = calculateAnnualLeaveBalance(
        liveGemmaProfile,
        weekBlockShifts,
        new Date(2026, 3, 1)
      );
      expect(balance.episodes).toHaveLength(1);
      expect(balance.episodes[0].daysCount).toBe(7);
      expect(balance.episodes[0].formattedDateRange).toBe('02 Apr 2026 - 08 Apr 2026');
      expect(balance.episodes[0].totalHours).toBe(26.0);
      expect(balance.takenYearToDateHours).toBe(26.0);
      expect(balance.remainingHours).toBe(166.5); // 192.5 - 26.0 = 166.5
    });
  });
});
