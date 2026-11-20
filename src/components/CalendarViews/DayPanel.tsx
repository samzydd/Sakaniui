/**
 * DayPanel
 *
 * One day, beside a month or week view: how busy it is, what is on it, and where the free time is. It says how many
 * events there are and how much of the working day is booked and free, draws the day as a strip (busy stretches in
 * their event colours), lists all-day events and then the schedule in order, and offers each free gap of 30 minutes or
 * more as a button (`onBlockFocus`) so someone can claim it as focus time.
 */

import React from 'react';
import { IconPlus } from '../../icons/outline/plus';
import { EVENT_COLOR } from './CalendarEvent';
import type { CalendarEventData } from './types';
import { byStart, fmtDuration, fmtTime, fmtTimeShort, isBanner, mergeBusy, minutesOfDay, sameDay, touchesDay } from './dates';
import styles from './DayPanel.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface DayPanelProps {
  date: Date;
  events: CalendarEventData[];
  /** The working day, in hours: free time is counted inside it. Default [9, 18]. */
  workHours?: [number, number];
  /** The smallest free gap offered, in minutes. Default 30. */
  minGap?: number;
  onEventClick?: (event: CalendarEventData, el: HTMLElement) => void;
  /** "Block focus time" was pressed on a free gap. */
  onBlockFocus?: (start: Date, end: Date) => void;
  /** "New event" was pressed. */
  onCreate?: (date: Date) => void;
  /** The id of the event whose card is open. */
  activeEventId?: string | null;
  /** Today, for the badge. Default: now. */
  today?: Date;
  className?: string;
}

const at = (day: Date, mins: number) => {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  d.setMinutes(mins);
  return d;
};

export const DayPanel: React.FC<DayPanelProps> = ({
  date,
  events,
  workHours = [9, 18],
  minGap = 30,
  onEventClick,
  onBlockFocus,
  onCreate,
  activeEventId,
  today: todayProp,
  className,
}) => {
  const today = todayProp ?? new Date();
  const day = events.filter((e) => touchesDay(e, date)).sort(byStart);
  const allDay = day.filter(isBanner);
  const timed = day.filter((e) => !isBanner(e));
  const [ws, we] = [workHours[0] * 60, workHours[1] * 60];

  const busy = mergeBusy(timed);
  const inWork = (a: number, b: number) => Math.max(0, Math.min(b, we) - Math.max(a, ws));
  const booked = busy.reduce((sum, [a, b]) => sum + inWork(a, b), 0);
  const free = Math.max(0, we - ws - booked);

  // free gaps inside the working day
  const gaps: [number, number][] = [];
  let cursor = ws;
  for (const [a, b] of busy) {
    if (a - cursor >= minGap && a > ws) gaps.push([Math.max(cursor, ws), Math.min(a, we)]);
    cursor = Math.max(cursor, b);
  }
  if (we - cursor >= minGap) gaps.push([Math.max(cursor, ws), we]);
  const gapsClean = gaps.filter(([a, b]) => b - a >= minGap);

  // schedule rows: events and the free gaps between them, in time order
  type Row = { kind: 'event'; at: number; e: CalendarEventData } | { kind: 'gap'; at: number; a: number; b: number };
  const rows: Row[] = [
    ...timed.map((e) => ({ kind: 'event' as const, at: minutesOfDay(e.start), e })),
    ...gapsClean.map(([a, b]) => ({ kind: 'gap' as const, at: a, a, b })),
  ].sort((x, y) => x.at - y.at || (x.kind === 'event' ? -1 : 1));

  const span = we - ws;
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')} aria-label={`${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`}>
      <header className={styles.head}>
        <h3 className={styles.title}>
          {DAYS[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}
          {sameDay(date, today) && <span className={styles.badge}>Today</span>}
        </h3>
        <p className={styles.sub}>
          {day.length} {day.length === 1 ? 'event' : 'events'}
          {timed.length > 0 && <> &middot; {fmtDuration(booked)} booked &middot; {fmtDuration(free)} free</>}
        </p>
        {timed.length > 0 && (
          <div className={styles.strip} role="img" aria-label={`${fmtDuration(booked)} booked of the working day`}>
            <div className={styles.track}>
              {timed.map((e) => {
                const a = Math.max(ws, minutesOfDay(e.start));
                const b = Math.min(we, Math.max(minutesOfDay(e.start) + 15, e.end.getHours() * 60 + e.end.getMinutes() || 1440));
                if (b <= a) return null;
                return <i key={e.id} style={{ left: `${((a - ws) / span) * 100}%`, width: `${((b - a) / span) * 100}%`, background: EVENT_COLOR[e.color ?? 'blue'] }} />;
              })}
            </div>
            <div className={styles.ticks} aria-hidden>
              <span>{fmtTimeShort(at(date, ws))}</span>
              <span>{fmtTimeShort(at(date, ws + span / 3))}</span>
              <span>{fmtTimeShort(at(date, ws + (2 * span) / 3))}</span>
              <span>{fmtTimeShort(at(date, we))}</span>
            </div>
          </div>
        )}
      </header>

      {allDay.length > 0 && (
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>All day</h4>
          <ul className={styles.list}>
            {allDay.map((e) => (
              <li key={e.id}>
                <button type="button" className={styles.allDay} data-active={activeEventId === e.id ? '' : undefined} style={{ ['--cv' as string]: EVENT_COLOR[e.color ?? 'blue'] }} onClick={(ev) => onEventClick?.(e, ev.currentTarget)}>
                  <span className={styles.allDayTitle}>{e.title}</span>
                  {!sameDay(e.start, e.end) && <span className={styles.allDayRange}>{MONTHS[e.start.getMonth()].slice(0, 3)} {e.start.getDate()} to {MONTHS[e.end.getMonth()].slice(0, 3)} {e.end.getDate()}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.group}>
        <h4 className={styles.groupTitle}>Schedule</h4>
        {rows.length === 0 ? (
          <p className={styles.empty}>Nothing scheduled.</p>
        ) : (
          <ul className={styles.list}>
            {rows.map((r) =>
              r.kind === 'event' ? (
                <li key={r.e.id}>
                  <button type="button" className={styles.row} data-active={activeEventId === r.e.id ? '' : undefined} style={{ ['--cv' as string]: EVENT_COLOR[r.e.color ?? 'blue'] }} onClick={(ev) => onEventClick?.(r.e, ev.currentTarget)}>
                    <span className={styles.when}>
                      <b>{fmtTime(r.e.start)}</b>
                      <small>{fmtDuration((r.e.end.getTime() - r.e.start.getTime()) / 60000)}</small>
                    </span>
                    <i className={styles.bar} aria-hidden />
                    <span className={styles.what}>
                      <span className={styles.name}>{r.e.title}</span>
                      {r.e.location && <span className={styles.place}>{r.e.location}</span>}
                    </span>
                  </button>
                </li>
              ) : (
                <li key={`gap-${r.a}`} className={styles.gap}>
                  <span>
                    Free {fmtTime(at(date, r.a))} to {fmtTime(at(date, r.b))} <em>{fmtDuration(r.b - r.a)}</em>
                  </span>
                  {onBlockFocus && (
                    <button type="button" className={styles.block} onClick={() => onBlockFocus(at(date, r.a), at(date, r.b))}>
                      Block focus time
                    </button>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {onCreate && (
        <footer className={styles.foot}>
          <button type="button" className={styles.create} onClick={() => onCreate(date)}>
            <IconPlus size={14} /> New event on {MONTHS[date.getMonth()].slice(0, 3)} {date.getDate()}
          </button>
        </footer>
      )}
    </section>
  );
};

export default DayPanel;
