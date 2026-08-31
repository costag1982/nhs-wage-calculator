import React, { useMemo } from 'react';
import { Shift } from '../../domain/models/Shift';
import { getBankHolidayTitle } from '../../domain/constants/bankHolidays';
import { formatDateIsoParts } from '../../domain/utils/dateUtils';
import { Moon, Sun, Palmtree } from 'lucide-react';

interface CalendarViewProps {
  activeMonthDate: Date;
  shifts: Shift[];
  hourlyRate: number;
  onSelectDate: (dateStr: string) => void;
  onEditShift: (shift: Shift) => void;
}

export interface CalendarCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TOTAL_CALENDAR_CELLS = 42; // 6 rows of 7 days

export const generateMonthCalendarCells = (activeMonthDate: Date): CalendarCell[] => {
  const year = activeMonthDate.getFullYear();
  const month = activeMonthDate.getMonth(); // 0-11

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Convert Sunday=0 to Monday=0, ..., Sunday=6
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const calendarCells: CalendarCell[] = [];

  // 1. Previous month trailing days
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 12 : month;
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const dateStr = formatDateIsoParts(prevYear, prevMonth, dayNum);
    const dayOfWeek = new Date(prevYear, prevMonth - 1, dayNum).getDay();
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateIsoParts(year, month + 1, day);
    const dayOfWeek = new Date(year, month, day).getDay();
    calendarCells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // 3. Next month leading days to complete 42 cells
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 1 : month + 2;
  const remainingCells = TOTAL_CALENDAR_CELLS - calendarCells.length;
  for (let day = 1; day <= remainingCells; day++) {
    const dateStr = formatDateIsoParts(nextYear, nextMonth, day);
    const dayOfWeek = new Date(nextYear, nextMonth - 1, day).getDay();
    calendarCells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return calendarCells;
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  activeMonthDate,
  shifts,
  onSelectDate,
  onEditShift,
}) => {
  const calendarCells = useMemo(
    () => generateMonthCalendarCells(activeMonthDate),
    [activeMonthDate]
  );

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const list = map.get(shift.date) || [];
      list.push(shift);
      map.set(shift.date, list);
    }
    return map;
  }, [shifts]);

  const today = new Date();
  const todayStr = formatDateIsoParts(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div className="calendar-card">
      <div className="calendar-weekdays-header">
        {WEEKDAY_NAMES.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="calendar-days-grid">
        {calendarCells.map((cell) => {
          const dayShifts = shiftsByDate.get(cell.dateStr) || [];
          const bankHoliday = getBankHolidayTitle(cell.dateStr);
          const isToday = cell.dateStr === todayStr;

          return (
            <div
              key={cell.dateStr}
              className={`calendar-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${
                cell.isWeekend ? 'is-weekend' : ''
              } ${isToday ? 'is-today' : ''}`}
              title={
                !cell.isCurrentMonth
                  ? 'Use the month navigation above to view and add shifts for this date'
                  : undefined
              }
              aria-disabled={!cell.isCurrentMonth}
              onClick={() => {
                if (!cell.isCurrentMonth) return;
                if (dayShifts.length > 0) {
                  onEditShift(dayShifts[0]);
                } else {
                  onSelectDate(cell.dateStr);
                }
              }}
            >
              <div className="day-header">
                <span className="day-number tabular-nums">{cell.dayNumber}</span>
                {bankHoliday && (
                  <span className="bank-holiday-tag" title={bankHoliday}>
                    {bankHoliday}
                  </span>
                )}
              </div>

              {/* Day Shifts */}
              <div className="shift-badge-container">
                {dayShifts.map((shift) => {
                  const breakdown = shift.breakdown;
                  const isLeave = shift.shiftType === 'ANNUAL_LEAVE';
                  const isNight = (breakdown?.nightHours || 0) > 4;
                  const isSunday = (breakdown?.sundayHours || 0) > 0;
                  const isSaturday = (breakdown?.saturdayHours || 0) > 0;
                  const isHoliday = (breakdown?.bankHolidayHours || 0) > 0;

                  let pillClass = 'shift-pill-day';
                  if (isLeave) pillClass = 'shift-pill-leave';
                  else if (shift.shiftType === 'OVERTIME') pillClass = 'shift-pill-overtime';
                  else if (isHoliday) pillClass = 'shift-pill-holiday';
                  else if (isSunday) pillClass = 'shift-pill-weekend';
                  else if (isSaturday) pillClass = 'shift-pill-weekend';
                  else if (isNight) pillClass = 'shift-pill-night';

                  return (
                    <div
                      key={shift.id}
                      className={`shift-pill ${pillClass}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditShift(shift);
                      }}
                      title="Click to edit"
                    >
                      <div className="shift-pill-title">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isLeave ? (
                            <Palmtree size={12} />
                          ) : isNight ? (
                            <Moon size={12} />
                          ) : (
                            <Sun size={12} />
                          )}
                          {isLeave
                            ? 'Annual Leave'
                            : shift.presetType
                              ? shift.presetType.replace('_', ' ')
                              : `${shift.startTime}-${shift.endTime}`}
                        </span>
                        <span className="tabular-nums font-bold">
                          {breakdown?.totalWorkedHours}h
                        </span>
                      </div>
                      <div className="shift-pill-time tabular-nums">
                        {shift.startTime} - {shift.endTime}
                      </div>

                      <div className="shift-pill-tags">
                        {isLeave && (
                          <span
                            className="enhancement-micro-badge"
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              borderColor: '#bbf7d0',
                              fontWeight: 700,
                            }}
                          >
                            🌴 Paid Leave
                          </span>
                        )}
                        {shift.shiftType === 'OVERTIME' && (
                          <span
                            className="enhancement-micro-badge"
                            style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              borderColor: '#fde68a',
                              fontWeight: 700,
                            }}
                          >
                            ⚡ Overtime
                          </span>
                        )}
                        {shift.shiftType === 'BANK' && (
                          <span
                            className="enhancement-micro-badge"
                            style={{
                              background: '#e0e7ff',
                              color: '#4338ca',
                              borderColor: '#c7d2fe',
                              fontWeight: 700,
                            }}
                          >
                            Bank
                          </span>
                        )}
                        {shift.overrideBand && (
                          <span
                            className="enhancement-micro-badge"
                            style={{
                              background: '#eff6ff',
                              color: 'var(--nhs-blue)',
                              borderColor: '#bfdbfe',
                              fontWeight: 700,
                            }}
                          >
                            {shift.overrideBand}
                          </span>
                        )}
                        {!isLeave && breakdown && breakdown.nightHours > 0 && (
                          <span className="enhancement-micro-badge">
                            🌙 {breakdown.nightHours}h
                          </span>
                        )}
                        {!isLeave && breakdown && breakdown.saturdayHours > 0 && (
                          <span className="enhancement-micro-badge">
                            Sat {breakdown.saturdayHours}h
                          </span>
                        )}
                        {!isLeave && breakdown && breakdown.sundayHours > 0 && (
                          <span className="enhancement-micro-badge">
                            Sun {breakdown.sundayHours}h
                          </span>
                        )}
                        {!isLeave && breakdown && breakdown.bankHolidayHours > 0 && (
                          <span
                            className="enhancement-micro-badge"
                            style={{
                              background: 'var(--amber-bg)',
                              color: 'var(--amber)',
                              borderColor: 'var(--amber-border)',
                            }}
                          >
                            Bank Hol {breakdown.bankHolidayHours}h
                          </span>
                        )}
                        {!isLeave &&
                          (shift.unpaidBreakMinutes > 0 ? (
                            <span
                              className="enhancement-micro-badge"
                              style={{
                                background: '#f0fdf4',
                                color: '#15803d',
                                borderColor: '#bbf7d0',
                              }}
                            >
                              ☕ {shift.unpaidBreakMinutes}m break
                            </span>
                          ) : (
                            <span
                              className="enhancement-micro-badge"
                              style={{
                                background: '#fafafa',
                                color: '#6b7280',
                                borderColor: '#e5e7eb',
                              }}
                            >
                              No break
                            </span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
