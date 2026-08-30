import { ShiftPreset } from '../../../domain/models/Shift';

export const SHIFT_PRESETS: ShiftPreset[] = [
  {
    id: 'TWILIGHT',
    label: 'Twilight',
    startTime: '22:00',
    endTime: '06:00',
    unpaidBreakMinutes: 30,
    description: '22:00 - 06:00 (Night Duty)',
  },
  {
    id: 'HALF_TWILIGHT',
    label: 'Half Twilight',
    startTime: '22:00',
    endTime: '02:00',
    unpaidBreakMinutes: 0,
    description: '22:00 - 02:00 (4h Night)',
  },
  {
    id: 'MORNING',
    label: 'Morning',
    startTime: '07:30',
    endTime: '15:30',
    unpaidBreakMinutes: 30,
    description: '07:30 - 15:30 (Day)',
  },
  {
    id: 'LONG_DAY',
    label: 'Long Day',
    startTime: '12:00',
    endTime: '20:30',
    unpaidBreakMinutes: 30,
    description: '12:00 - 20:30 (Day & Unsocial)',
  },
  {
    id: 'EVENING',
    label: 'Evening',
    startTime: '16:00',
    endTime: '21:30',
    unpaidBreakMinutes: 30,
    description: '16:00 - 21:30 (Evening)',
  },
  {
    id: 'CUSTOM',
    label: 'Custom',
    startTime: '08:00',
    endTime: '16:00',
    unpaidBreakMinutes: 30,
    description: 'Enter custom times',
  },
];

export const ANNUAL_LEAVE_PRESETS: ShiftPreset[] = [
  {
    id: 'ANNUAL_LEAVE_FULL',
    label: 'Full Day (7.5h)',
    startTime: '08:00',
    endTime: '15:30',
    unpaidBreakMinutes: 0,
    description: 'Standard NHS full day (7.5 hrs)',
  },
  {
    id: 'ANNUAL_LEAVE_HALF',
    label: 'Half Day (3.75h)',
    startTime: '08:00',
    endTime: '11:45',
    unpaidBreakMinutes: 0,
    description: 'Standard NHS half day (3.75 hrs)',
  },
  {
    id: 'CUSTOM',
    label: 'Custom Hours',
    startTime: '08:00',
    endTime: '15:30',
    unpaidBreakMinutes: 0,
    description: 'Enter specific leave duration',
  },
];

export const BAND_OVERRIDE_OPTIONS = [
  { band: 'Band 2', label: 'Band 2 (£12.92/hr)' },
  { band: 'Band 3', label: 'Band 3 (£13.55/hr - Higher Band / Acting Up)' },
  { band: 'Band 4', label: 'Band 4 (£14.53/hr)' },
  { band: 'Band 5', label: 'Band 5 (£15.87/hr)' },
  { band: 'Band 6', label: 'Band 6 (£19.64/hr)' },
  { band: 'Band 7', label: 'Band 7 (£24.10/hr)' },
  { band: 'Band 8a', label: 'Band 8a (£28.13/hr)' },
];
