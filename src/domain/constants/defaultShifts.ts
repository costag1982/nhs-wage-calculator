import { Shift } from '../models/Shift';

/**
 * Historical benchmark shifts worked by Miss Gemma Howard in June 2026,
 * corresponding exactly to the unsocial hours paid on the July 2026 ESR payslip:
 * - Night Duty: 44.00 hrs (41% enhancement)
 * - Saturday: 4.00 hrs (41% enhancement)
 * - Sunday: 22.50 hrs (83% enhancement)
 */
export const DEFAULT_GEMMA_JUNE_SHIFTS: Shift[] = [
  {
    id: 's1-june-2026',
    date: '2026-06-03',
    startTime: '20:00',
    endTime: '06:00',
    unpaidBreakMinutes: 0,
    presetType: 'NIGHT_SHIFT',
  },
  {
    id: 's2-june-2026',
    date: '2026-06-08',
    startTime: '20:00',
    endTime: '06:00',
    unpaidBreakMinutes: 0,
    presetType: 'NIGHT_SHIFT',
  },
  {
    id: 's3-june-2026',
    date: '2026-06-15',
    startTime: '20:00',
    endTime: '06:00',
    unpaidBreakMinutes: 0,
    presetType: 'NIGHT_SHIFT',
  },
  {
    id: 's4-june-2026',
    date: '2026-06-22',
    startTime: '20:00',
    endTime: '06:00',
    unpaidBreakMinutes: 0,
    presetType: 'NIGHT_SHIFT',
  },
  {
    id: 's5-june-2026',
    date: '2026-06-29',
    startTime: '20:00',
    endTime: '00:00',
    unpaidBreakMinutes: 0,
    presetType: 'CUSTOM',
  },
  {
    id: 's6-june-2026',
    date: '2026-06-13', // Saturday
    startTime: '10:00',
    endTime: '14:00',
    unpaidBreakMinutes: 0,
    presetType: 'CUSTOM',
  },
  {
    id: 's7-june-2026',
    date: '2026-06-14', // Sunday
    startTime: '08:00',
    endTime: '19:30',
    unpaidBreakMinutes: 30,
    presetType: 'LONG_DAY',
  },
  {
    id: 's8-june-2026',
    date: '2026-06-28', // Sunday
    startTime: '07:30',
    endTime: '19:30',
    unpaidBreakMinutes: 30,
    presetType: 'LONG_DAY',
  },
];
