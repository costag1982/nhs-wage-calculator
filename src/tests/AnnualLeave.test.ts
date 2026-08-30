import { describe, it, expect } from 'vitest';
import { WageCalculatorService } from '../domain/services/WageCalculatorService';
import { AnnualLeaveCalculator } from '../domain/services/AnnualLeaveCalculator';
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
      const entitlement = AnnualLeaveCalculator.calculateEntitlement(gemmaProfile);

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
      const entitlement = AnnualLeaveCalculator.calculateEntitlement(profile5Years);

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
      const entitlement = AnnualLeaveCalculator.calculateEntitlement(profile10Years);

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
      const entitlement = AnnualLeaveCalculator.calculateEntitlement(profileWithCarryOver);

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

      const balanceJune = AnnualLeaveCalculator.calculateLeaveBalance(
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
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        }, // 7.5h Worked
      ];

      const result = WageCalculatorService.calculateMonthlyPayslip(
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

      const result = WageCalculatorService.calculateMonthlyPayslip(
        gemmaProfile,
        shifts,
        [],
        new Date(2026, 6, 1)
      );

      // Monthly basic pay is fully paid
      expect(result.monthlyBasicPay).toBe(1460.16);
      expect(result.additionalHours).toBeUndefined();
      expect(result.overtimeHours).toBeUndefined();
      expect(result.annualLeaveHours).toBe(26.0);
      expect(result.grossPay).toBe(1460.16);
    });

    it('correctly calculates overtime (1.5x) when leave + worked shifts exceed FTE 37.5h threshold', () => {
      // Week 28: 7.5h AL + 35.0h worked shifts (total 42.5h accounted)
      // Paid excess = 16.5h.
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
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        }, // 7.5h
        {
          id: 'w-4',
          date: '2026-07-10',
          startTime: '08:00',
          endTime: '16:00',
          unpaidBreakMinutes: 30,
          shiftType: 'SUBSTANTIVE',
        }, // 7.5h
        {
          id: 'w-5',
          date: '2026-07-11',
          startTime: '08:00',
          endTime: '13:00',
          unpaidBreakMinutes: 0,
          shiftType: 'SUBSTANTIVE',
        }, // 5.0h
      ];

      const result = WageCalculatorService.calculateMonthlyPayslip(
        gemmaProfile,
        shifts,
        [],
        new Date(2026, 6, 1)
      );

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

      const result = WageCalculatorService.calculateMonthlyPayslip(
        gemmaProfile,
        shifts,
        [],
        new Date(2026, 5, 1)
      );

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

      const balance = AnnualLeaveCalculator.calculateLeaveBalance(
        gemmaProfile,
        shifts,
        new Date(2026, 5, 1)
      );

      expect(balance.takenThisMonthHours).toBe(3.75);
      expect(balance.takenYearToDateHours).toBe(3.75);
      expect(balance.remainingHours).toBe(178.25); // 182.0 - 3.75 = 178.25
    });
  });
});
