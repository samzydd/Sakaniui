/**
 * MonthCalendar
 *
 * A month grid for events (not a date picker: that is Calendar). Six weeks of day cells, each with its date, the
 * events of that day as chips, and "N more" when they do not fit. All-day and multi-day events run across the cells
 * as bars. Click a day to select it (for a day panel beside the grid), click an event to open it, drag an event to
 * another day to move it.
 *
 *   date           the month shown (any date in it), controlled with `onDateChange`; the header has previous, next and Today
 *   events         plain data: you own it, the view reports changes (`onEventMove`)
 *   selectedDate   the day that is lit (`onSelectedDateChange`)
 *   keyboard       Tab to an event, Enter opens it; Alt + arrows moves it a day (left, right) or a week (up, down)
 *
 * Drag uses the browser's own drag and drop: it moves with a mouse. Touch and keyboard move events with Alt + arrows
 * or through your own card (`onEventClick`).
 */

import React from 'react';
import { IconChevronLeft } from '../../icons/outline/chevron-left';
import { IconChevronRight } from '../../icons/outline/chevron-right';
import { CalendarEvent } from './CalendarEvent';
import type { CalendarEventData, CalendarEventMove, WeekStartsOn } from './types';
import { addDays, byStart, dayDiff, isBanner, packBanners, sameDay, shiftEvent, startOfDay, startOfMonth, startOfWeek, touchesDay } from './dates';
import styles from './MonthCalendar.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface MonthCalendarProps {
  /** The month shown: any date inside it. Controlled with `onDateChange`; left out, the view keeps its own. */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  events: CalendarEventData[];
  /** The day that is lit. */
  selectedDate?: Date | null;
  onSelectedDateChange?: (date: Date) => void;
  /** 0 = Sunday, 1 = Monday (default). */
  weekStartsOn?: WeekStartsOn;
  /** How many rows of events a cell holds before it says "N more". Default 4. */
  maxRows?: number;
  onEventClick?: (event: CalendarEventData, el: HTMLElement) => void;
  /** An event was dragged to another day, or moved with Alt + arrows. */
  onEventMove?: CalendarEventMove;
  /** "N more" was pressed for a day. */
  onMoreClick?: (date: Date) => void;
  /** The id of the event whose card is open: it stays lit. */
  activeEventId?: string | null;
  /** Today, for the highlight. Default: now. */
  today?: Date;
  /** Hide the header (title and navigation) when you draw your own. */
  hideHeader?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  date: dateProp,
  defaultDate,
  onDateChange,
  events,
  selectedDate,
  onSelectedDateChange,
  weekStartsOn = 1,
  maxRows = 4,
  onEventClick,
  onEventMove,
  onMoreClick,
  activeEventId,
  today: todayProp,
  hideHeader,
  className,
  style,
}) => {
  const [inner, setInner] = React.useState<Date>(() => defaultDate ?? new Date());
  const date = dateProp ?? inner;
  const setDate = (d: Date) => {
    if (dateProp === undefined) setInner(d);
    onDateChange?.(d);
  };
  const today = todayProp ?? new Date();
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  // five weeks when the month fits, six when it does not
  const weekCount = Math.ceil((dayDiff(gridStart, new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)) + 1) / 7);
  const weeks = Array.from({ length: weekCount }, (_, w) => addDays(gridStart, w * 7));
  const sorted = React.useMemo(() => [...events].sort(byStart), [events]);

  const dragRef = React.useRef<{ id: string; from: Date } | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);

  const go = (months: number) => setDate(new Date(monthStart.getFullYear(), monthStart.getMonth() + months, 1));
  const move = (e: CalendarEventData, days: number) => onEventMove?.(e, shiftEvent(e, days));

  const onKey = (e: CalendarEventData) => (k: React.KeyboardEvent) => {
    if (!k.altKey) return;
    const delta = k.key === 'ArrowLeft' ? -1 : k.key === 'ArrowRight' ? 1 : k.key === 'ArrowUp' ? -7 : k.key === 'ArrowDown' ? 7 : 0;
    if (!delta) return;
    k.preventDefault();
    move(e, delta);
  };

  const dragProps = (e: CalendarEventData, from: () => Date) => ({
    draggable: !!onEventMove,
    onDragStart: (ev: React.DragEvent) => {
      dragRef.current = { id: e.id, from: from() };
      setDragId(e.id);
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', e.id);
    },
    onDragEnd: () => {
      dragRef.current = null;
      setDragId(null);
      setOver(null);
    },
    onKeyDown: onKey(e),
  });

  const dropOn = (day: Date) => (ev: React.DragEvent) => {
    ev.preventDefault();
    const d = dragRef.current;
    setOver(null);
    if (!d) return;
    const e = events.find((x) => x.id === d.id);
    const delta = dayDiff(d.from, day);
    if (e && delta !== 0) move(e, delta);
  };

  return (
    <div className={[styles.month, className].filter(Boolean).join(' ')} style={style}>
      {!hideHeader && (
        <div className={styles.header}>
          <h3 className={styles.title} aria-live="polite">
            {MONTHS[monthStart.getMonth()]} <span>{monthStart.getFullYear()}</span>
          </h3>
          <div className={styles.nav}>
            <button type="button" className={styles.navBtn} onClick={() => setDate(new Date())} data-text>Today</button>
            <button type="button" className={styles.navBtn} onClick={() => go(-1)} aria-label="Previous month"><IconChevronLeft size={16} /></button>
            <button type="button" className={styles.navBtn} onClick={() => go(1)} aria-label="Next month"><IconChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <div className={styles.weekdays} aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>{WEEKDAYS[(weekStartsOn + i) % 7]}</span>
        ))}
      </div>

      <div className={styles.grid} role="grid" aria-label={`${MONTHS[monthStart.getMonth()]} ${monthStart.getFullYear()}`}>
        {weeks.map((rowStart) => {
          const segs = packBanners(sorted, rowStart);
          const laneCount = Math.min(3, segs.reduce((m, s) => Math.max(m, s.lane + 1), 0));
          const shownSegs = segs.filter((s) => s.lane < laneCount);
          const hiddenSegs = segs.filter((s) => s.lane >= laneCount);
          return (
            <div key={rowStart.toISOString()} className={styles.week} role="row" style={{ ['--lanes' as string]: laneCount }}>
              {Array.from({ length: 7 }, (_, c) => {
                const day = addDays(rowStart, c);
                const outside = day.getMonth() !== monthStart.getMonth();
                const isToday = sameDay(day, today);
                const isSelected = !!selectedDate && sameDay(day, selectedDate);
                const timed = sorted.filter((e) => !isBanner(e) && touchesDay(e, day));
                const hiddenBanners = hiddenSegs.filter((s) => c >= s.c0 && c <= s.c1).length;
                const slots = Math.max(1, maxRows - laneCount);
                const overflow = timed.length + hiddenBanners > slots;
                const visible = overflow ? timed.slice(0, Math.max(0, slots - 1)) : timed;
                const more = timed.length - visible.length + hiddenBanners;
                const key = day.toISOString();
                return (
                  <div
                    key={key}
                    role="gridcell"
                    className={styles.cell}
                    data-outside={outside ? '' : undefined}
                    data-selected={isSelected ? '' : undefined}
                    data-over={over === key ? '' : undefined}
                    onClick={() => onSelectedDateChange?.(startOfDay(day))}
                    onDragOver={onEventMove ? (e) => { e.preventDefault(); setOver(key); } : undefined}
                    onDragLeave={() => setOver((o) => (o === key ? null : o))}
                    onDrop={onEventMove ? dropOn(day) : undefined}
                  >
                    <button
                      type="button"
                      className={styles.num}
                      data-today={isToday ? '' : undefined}
                      aria-label={`${MONTHS[day.getMonth()]} ${day.getDate()}${isToday ? ', today' : ''}`}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={(e) => { e.stopPropagation(); onSelectedDateChange?.(startOfDay(day)); }}
                    >
                      {day.getDate() === 1 ? `${MONTHS[day.getMonth()].slice(0, 3)} 1` : day.getDate()}
                    </button>
                    <div className={styles.chips}>
                      {visible.map((e) => (
                        <CalendarEvent
                          key={e.id}
                          event={e}
                          shape="chip"
                          selected={activeEventId === e.id}
                          dragging={dragId === e.id}
                          onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e, ev.currentTarget); }}
                          {...dragProps(e, () => startOfDay(e.start))}
                        />
                      ))}
                      {more > 0 && (
                        <button
                          type="button"
                          className={styles.more}
                          onClick={(ev) => { ev.stopPropagation(); onSelectedDateChange?.(startOfDay(day)); onMoreClick?.(startOfDay(day)); }}
                        >
                          {more} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* bars that run across days, drawn over the cells' reserved lanes */}
              <div className={styles.bars}>
                {shownSegs.map((s) => (
                  <CalendarEvent
                    key={`${s.event.id}-${s.c0}`}
                    event={s.event}
                    shape="bar"
                    continuesBefore={s.before}
                    continuesAfter={s.after}
                    selected={activeEventId === s.event.id}
                    dragging={dragId === s.event.id}
                    style={{ gridColumn: `${s.c0 + 1} / ${s.c1 + 2}`, gridRow: s.lane + 1 }}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick?.(s.event, ev.currentTarget); }}
                    {...dragProps(s.event, () => addDays(rowStart, s.c0))}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendar;
