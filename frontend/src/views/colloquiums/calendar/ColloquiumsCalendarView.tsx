import { useMemo, useState } from 'react';
import type { Colloqium } from '../../../api';
import { useI18n } from '../../../i18n/i18n';
import { getColloqiumTypeColor } from '../typeColors';

interface Props {
  rows: Colloqium[];
  onOpenColloqium: (id: number) => void;
}

interface CalendarWeekRow {
  isoWeek: number;
  days: Date[];
}

const WEEKDAY_INDEXES = [1, 2, 3, 4, 5];
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDayDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}.${m}.${y}`;
}

function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function addDays(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + delta));
}

function startOfWeekMonday(date: Date): Date {
  const weekday = date.getUTCDay() || 7;
  return addDays(date, 1 - weekday);
}

function endOfWeekFriday(date: Date): Date {
  const weekday = date.getUTCDay() || 7;
  return addDays(date, 5 - weekday);
}

function getIsoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function toShortLabel(value: string, maxLength = 16): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function buildCalendarRows(monthStart: Date): CalendarWeekRow[] {
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const firstMonday = startOfWeekMonday(monthStart);
  const lastFriday = endOfWeekFriday(monthEnd);
  const weeks: CalendarWeekRow[] = [];
  let cursor = firstMonday;
  while (cursor.getTime() <= lastFriday.getTime()) {
    weeks.push({
      isoWeek: getIsoWeekNumber(cursor),
      days: WEEKDAY_INDEXES.map((offset) => addDays(startOfWeekMonday(cursor), offset - 1)),
    });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export default function ColloquiumsCalendarView({ rows, onOpenColloqium }: Props) {
  const { t } = useI18n();
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => getMonthStart(new Date()));
  const todayIso = formatIsoDate(new Date());

  const byDate = useMemo(() => {
    const grouped: Record<string, Colloqium[]> = {};
    rows.forEach((item) => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });
    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => {
        const aName = a.colloqium_type?.name ?? '';
        const bName = b.colloqium_type?.name ?? '';
        return aName.localeCompare(bName);
      });
    });
    return grouped;
  }, [rows]);

  const calendarRows = useMemo(() => buildCalendarRows(visibleMonth), [visibleMonth]);
  const monthLabel = `${visibleMonth.getUTCFullYear()} ${t(`colloquiums.calendar.month.${visibleMonth.getUTCMonth() + 1}`, visibleMonth.toLocaleString(undefined, { month: 'long' }))}`;

  return (
    <section className="colloquiums-calendar">
      <div className="colloquiums-calendar-toolbar">
        <button className="btn-secondary" onClick={() => setVisibleMonth((prev) => addMonths(prev, -1))}>
          {t('colloquiums.calendar.prevMonth', 'Previous')}
        </button>
        <button className="btn-secondary" onClick={() => setVisibleMonth((prev) => addMonths(prev, 1))}>
          {t('colloquiums.calendar.nextMonth', 'Next')}
        </button>
        <button className="btn-secondary" onClick={() => setVisibleMonth(getMonthStart(new Date()))}>
          {t('colloquiums.calendar.today', 'Today')}
        </button>
      </div>

      <div className="colloquiums-calendar-grid">
        <div className="colloquiums-calendar-header colloquiums-calendar-week-header">
          {monthLabel}
        </div>
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="colloquiums-calendar-header">
            {t(`colloquiums.calendar.day.${key}`, key.toUpperCase())}
          </div>
        ))}

        {calendarRows.map((week) => (
          <div className="colloquiums-calendar-row" key={`week-${week.isoWeek}-${formatIsoDate(week.days[0])}`}>
            <div className="colloquiums-calendar-week-number">{week.isoWeek}</div>
            {week.days.map((day) => {
              const dayIso = formatIsoDate(day);
              const isCurrentMonth = day.getUTCMonth() === visibleMonth.getUTCMonth()
                && day.getUTCFullYear() === visibleMonth.getUTCFullYear();
              const items = byDate[dayIso] ?? [];
              return (
                <div
                  key={dayIso}
                  className={`colloquiums-calendar-day${isCurrentMonth ? '' : ' is-outside-month'}${dayIso === todayIso ? ' is-today' : ''}`}
                >
                  <div className="colloquiums-calendar-day-date">{formatDayDate(day)}</div>
                  <div className="colloquiums-calendar-badges">
                    {items.map((item) => {
                      const color = getColloqiumTypeColor(item.colloqium_type_id);
                      const label = item.colloqium_type?.name || t('common.unnamed', 'Unnamed');
                      return (
                        <button
                          key={item.id}
                          className="colloquiums-calendar-badge"
                          style={{ backgroundColor: color.background, borderColor: color.border, color: color.text }}
                          title={`${label} (${item.date})`}
                          onClick={() => onOpenColloqium(item.id)}
                        >
                          {toShortLabel(label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
