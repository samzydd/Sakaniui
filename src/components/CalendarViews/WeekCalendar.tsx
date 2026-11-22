/**
 * WeekCalendar
 *
 * A week as a time grid, for events (not a date picker: that is Calendar). Days run across, hours down; a timed event
 * is a card as tall as it is long, and events that overlap sit side by side. All-day and multi-day events run across
 * the days in a lane under the day heads. A line marks the current time.
 *
 *   date          any date in the week shown, controlled with `onDateChange`; the header has previous, next and Today
 *   days          7 (the default) or 5 for a work week
 *   events        plain data: you own it, the view reports changes (`onEventMove`)
 *   drag          drag an event to another day or time; it snaps to `snapMinutes` (15). Alt + arrows moves the focused
 *                 event a day (left, right) or one snap step (up, down)
 *   click         `onEventClick` for an event, `onSlotClick` for an empty slot (where you would add one)
 */

import React from 'react';
import { IconChevronLeft } from '../../icons/outline/chevron-left';
import { IconChevronRight } from '../../icons/outline/chevron-right';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { CalendarEvent } from './CalendarEvent';
import type { CalendarEventData, CalendarEventMove, WeekStartsOn } from './types';
import { addDays, byStart, fmtRange, isBanner, layoutDay, minutesOfDay, packBanners, sameDay, shiftEvent, startOfDay, startOfWeek, touchesDay } from './dates';
import styles from './WeekCalendar.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GUTTER = 56;

export interface WeekCalendarProps {
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  events: CalendarEventData[];
  weekStartsOn?: WeekStartsOn;
  /** 7 (default) or 5 for a work week (the first five days of the week). */
  days?: 5 | 7;
  /** Pixels per hour. Default 52. */
  hourHeight?: number;
  /** The hour scrolled to at the start. Default 8. */
  scrollToHour?: number;
  /** Drag and keyboard moves snap to this many minutes. Default 15. */
  snapMinutes?: number;
  /** The height of the scrolling grid (number = px). Default 640. */
  height?: number | string;
  onEventClick?: (event: CalendarEventData, el: HTMLElement) => void;
  onEventMove?: CalendarEventMove;
  /** An empty slot was pressed: the time under the pointer, snapped. */
  onSlotClick?: (start: Date) => void;
  /** The id of the event whose card is open: it stays lit. */
  activeEventId?: string | null;
  /** The current time, for the line and the Today highlight. Default: now, and it moves. */
  now?: Date;
  hideHeader?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface Drag {
  id: string;
  x0: number;
  y0: number;
  days: number;
  mins: number;
  moved: boolean;
}

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
  date: dateProp,
  defaultDate,
  onDateChange,
  events,
  weekStartsOn = 1,
  days = 7,
  hourHeight = 52,
  scrollToHour = 8,
  snapMinutes = 15,
  height = 640,
  onEventClick,
  onEventMove,
  onSlotClick,
  activeEventId,
  now: nowProp,
  hideHeader,
  className,
  style,
}) => {
  const [inner, setInner] = React.useState<Date>(() => defaultDate ?? nowProp ?? new Date());
  const date = dateProp ?? inner;
  const setDate = (d: Date) => {
    if (dateProp === undefined) setInner(d);
    onDateChange?.(d);
  };

  // the clock: moves every minute unless a fixed `now` is given
  const [tick, setTick] = React.useState(() => new Date());
  React.useEffect(() => {
    if (nowProp) return undefined;
    const t = window.setInterval(() => setTick(new Date()), 60000);
    return () => window.clearInterval(t);
  }, [nowProp]);
  const now = nowProp ?? tick;

  const weekStart = startOfWeek(date, weekStartsOn);
  const columns = Array.from({ length: days }, (_, i) => addDays(weekStart, i));
  const weekEnd = columns[columns.length - 1];
  const sorted = React.useMemo(() => [...events].sort(byStart), [events]);

  const scroller = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, (scrollToHour - 0.25) * hourHeight);
    // once, at the start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const dragRef = React.useRef<Drag | null>(null);
  const suppress = React.useRef(false);

  const colWidth = () => ((body.current?.clientWidth ?? 0) - GUTTER) / days;
  const pxPerMin = hourHeight / 60;

  const onPointerDown = (e: CalendarEventData) => (ev: React.PointerEvent<HTMLButtonElement>) => {
    if (!onEventMove || ev.button !== 0) return;
    dragRef.current = { id: e.id, x0: ev.clientX, y0: ev.clientY, days: 0, mins: 0, moved: false };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const onPointerMove = (e: CalendarEventData) => (ev: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.id) return;
    const dx = ev.clientX - d.x0;
    const dy = ev.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    const startMin = minutesOfDay(e.start);
    const endMin = startMin + Math.max(15, (e.end.getTime() - e.start.getTime()) / 60000);
    let mins = Math.round(dy / pxPerMin / snapMinutes) * snapMinutes;
    mins = Math.max(-startMin, Math.min(1440 - endMin, mins));
    let dd = Math.round(dx / (colWidth() || 1));
    // stay inside the week shown
    const firstIdx = Math.round((startOfDay(e.start).getTime() - weekStart.getTime()) / 86400000);
    dd = Math.max(-firstIdx, Math.min(days - 1 - firstIdx, dd));
    const next = { ...d, days: dd, mins, moved: true };
    dragRef.current = next;
    setDrag(next);
  };
  const onPointerUp = (e: CalendarEventData) => (ev: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (ev.currentTarget.hasPointerCapture(ev.pointerId)) ev.currentTarget.releasePointerCapture(ev.pointerId);
    setDrag(null);
    if (!d || d.id !== e.id || !d.moved) return;
    suppress.current = true;
    window.setTimeout(() => { suppress.current = false; }, 0);
    if (d.days !== 0 || d.mins !== 0) onEventMove?.(e, shiftEvent(e, d.days, d.mins));
  };
  const onKey = (e: CalendarEventData) => (k: React.KeyboardEvent) => {
    if (!k.altKey || !onEventMove) return;
    let dd = 0;
    let mm = 0;
    if (k.key === 'ArrowLeft') dd = -1;
    else if (k.key === 'ArrowRight') dd = 1;
    else if (k.key === 'ArrowUp') mm = -snapMinutes;
    else if (k.key === 'ArrowDown') mm = snapMinutes;
    else return;
    k.preventDefault();
    onEventMove(e, shiftEvent(e, dd, mm));
  };
  const click = (e: CalendarEventData) => (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.stopPropagation();
    if (suppress.current) return;
    onEventClick?.(e, ev.currentTarget);
  };

  const segs = packBanners(sorted, weekStart, days);
  const lanes = segs.reduce((m, s) => Math.max(m, s.lane + 1), 0);

  const slotClick = (day: Date) => (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const mins = Math.floor((ev.clientY - rect.top) / pxPerMin / snapMinutes) * snapMinutes;
    const d = new Date(day);
    d.setHours(0, mins, 0, 0);
    onSlotClick(d);
  };

  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${MONTHS[weekStart.getMonth()].slice(0, 3)} – ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;

  return (
    <div className={[styles.week, className].filter(Boolean).join(' ')} style={{ ...style, ['--gutter' as string]: `${GUTTER}px`, ['--cols' as string]: days }}>
      {!hideHeader && (
        <div className={styles.header}>
          <h3 className={styles.title} aria-live="polite">
            {rangeLabel}
          </h3>
          <div className={styles.nav}>
            <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>Today</Button>
            <IconButton variant="ghost" size="sm" icon={IconChevronLeft} aria-label="Previous week" onClick={() => setDate(addDays(date, -7))} />
            <IconButton variant="ghost" size="sm" icon={IconChevronRight} aria-label="Next week" onClick={() => setDate(addDays(date, 7))} />
          </div>
        </div>
      )}

      <div className={styles.frame}>
      <div className={styles.head}>
        <span />
        {columns.map((d) => {
          const isToday = sameDay(d, now);
          return (
            <div key={d.toISOString()} className={styles.dayHead} data-today={isToday ? '' : undefined}>
              <span className={styles.dow}>{WEEKDAYS[d.getDay()]}</span>
              <span className={styles.dom} aria-label={`${MONTHS[d.getMonth()]} ${d.getDate()}${isToday ? ', today' : ''}`}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      {lanes > 0 && (
        <div className={styles.allDay}>
          <span className={styles.allDayLabel}>All day</span>
          <div className={styles.allDayGrid} style={{ gridTemplateRows: `repeat(${lanes}, 20px)` }}>
            {segs.map((s) => (
              <CalendarEvent
                key={`${s.event.id}-${s.c0}`}
                event={s.event}
                shape="bar"
                continuesBefore={s.before}
                continuesAfter={s.after}
                selected={activeEventId === s.event.id}
                style={{ gridColumn: `${s.c0 + 1} / ${s.c1 + 2}`, gridRow: s.lane + 1 }}
                onClick={click(s.event)}
                onKeyDown={onKey(s.event)}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={scroller} className={styles.scroller} style={{ height: height === '100%' ? undefined : height, flex: height === '100%' ? '1 1 0' : undefined }} data-lenis-prevent>
        <div ref={body} className={styles.body} style={{ height: 24 * hourHeight }}>
          <div className={styles.hours} aria-hidden>
            {Array.from({ length: 23 }, (_, h) => (
              <span key={h} style={{ top: (h + 1) * hourHeight }}>
                {(h + 1) % 12 || 12} {h + 1 < 12 ? 'AM' : 'PM'}
              </span>
            ))}
          </div>
          {columns.map((day) => {
            const timed = sorted.filter((e) => !isBanner(e) && touchesDay(e, day));
            const placed = layoutDay(timed);
            const isToday = sameDay(day, now);
            return (
              <div
                key={day.toISOString()}
                className={styles.col}
                data-today={isToday ? '' : undefined}
                style={{ backgroundSize: `100% ${hourHeight}px` }}
                onClick={slotClick(day)}
              >
                {placed.map(({ event: e, col, cols }) => {
                  const startMin = minutesOfDay(e.start);
                  const lenMin = Math.max(15, (e.end.getTime() - e.start.getTime()) / 60000);
                  const dragging = drag?.id === e.id && drag.moved;
                  const dx = dragging ? drag.days * colWidth() : 0;
                  const dy = dragging ? drag.mins * pxPerMin : 0;
                  const label = dragging
                    ? fmtRange(shiftEvent(e, 0, drag.mins).start, shiftEvent(e, 0, drag.mins).end)
                    : undefined;
                  const top = startMin * pxPerMin;
                  const h = Math.max(20, lenMin * pxPerMin - 2);
                  return (
                    <div
                      key={e.id}
                      className={styles.slot}
                      data-dragging={dragging ? '' : undefined}
                      style={{
                        top,
                        height: h,
                        left: `calc(${(col / cols) * 100}% + 3px)`,
                        width: `calc(${100 / cols}% - ${cols > 1 ? 5 : 6}px)`,
                        transform: dragging ? `translate(${dx}px, ${dy}px)` : undefined,
                        zIndex: dragging ? 5 : col + 1,
                      }}
                    >
                      <CalendarEvent
                        event={e}
                        shape="block"
                        timeLabel={label}
                        detail={h < 46 ? 'title' : h < 70 ? 'time' : 'full'}
                        selected={activeEventId === e.id}
                        dragging={dragging}
                        onClick={click(e)}
                        onKeyDown={onKey(e)}
                        onPointerDown={onPointerDown(e)}
                        onPointerMove={onPointerMove(e)}
                        onPointerUp={onPointerUp(e)}
                        onPointerCancel={onPointerUp(e)}
                        style={{ touchAction: onEventMove ? 'none' : undefined }}
                      />
                    </div>
                  );
                })}
                {isToday && (
                  <div className={styles.now} style={{ top: minutesOfDay(now) * pxPerMin }} aria-hidden>
                    <i />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};

export default WeekCalendar;
