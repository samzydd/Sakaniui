/**
 * The pieces the two calendar blocks share: the header, the card that opens next to an event, and the short list that
 * "N more" opens. Not exported on their own: copy them with the block.
 */

import React from 'react';
import { IconX } from '../../icons/outline/x';
import { IconChevronLeft } from '../../icons/outline/chevron-left';
import { IconChevronRight } from '../../icons/outline/chevron-right';
import { IconTrash } from '../../icons/outline/trash';
import { IconMapPin } from '../../icons/outline/map-pin';
import { IconClock } from '../../icons/outline/clock';
import { Button } from '../../components/Button';
import { EVENT_COLOR } from '../../components/CalendarViews';
import type { CalendarEventData } from '../../components/CalendarViews';
import type { CalendarSource } from './sample';
import styles from './CalendarBlocks.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const t = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;

/** The block's header: the month and year, a line about what is in view, then the controls (children) on the right. */
export const CalendarHeader: React.FC<{
  month: string;
  year: string | number;
  subtitle: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prevLabel: string;
  nextLabel: string;
  children?: React.ReactNode;
}> = ({ month, year, subtitle, onPrev, onNext, onToday, prevLabel, nextLabel, children }) => (
  <header className={styles.header}>
    <div className={styles.headTitle}>
      <h3 aria-live="polite">
        {month} <span>{year}</span>
      </h3>
      <p>{subtitle}</p>
    </div>
    <div className={styles.headTools}>
      <div className={styles.navGroup} role="group" aria-label="Navigate">
        <button type="button" onClick={onPrev} aria-label={prevLabel}><IconChevronLeft size={16} /></button>
        <button type="button" onClick={onToday}>Today</button>
        <button type="button" onClick={onNext} aria-label={nextLabel}><IconChevronRight size={16} /></button>
      </div>
      {children}
    </div>
  </header>
);

/** What "N more" opens: the day's events as a short list. Pick one to open its card. */
export const DayPopover: React.FC<{
  date: Date;
  events: CalendarEventData[];
  anchor: { left: number; top: number };
  onClose: () => void;
  onPick: (event: CalendarEventData, el: HTMLElement) => void;
}> = ({ date, events, anchor, onClose, onPick }) => {
  React.useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className={`${styles.card} ${styles.popover}`} role="dialog" aria-label={`${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`} style={{ left: anchor.left, top: anchor.top, width: 280 }}>
      <header>
        <h4>{DAYS[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}</h4>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><IconX size={14} /></button>
      </header>
      <ul className={styles.dayList}>
        {events.map((e) => (
          <li key={e.id}>
            <button type="button" style={{ ['--cv' as string]: EVENT_COLOR[e.color ?? 'blue'] }} onClick={(ev) => onPick(e, ev.currentTarget)}>
              <i aria-hidden />
              <span className={styles.dayTime}>{e.allDay ? 'All day' : t(e.start)}</span>
              <span className={styles.dayTitle}>{e.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The card that opens on an event: when, where, which calendar, and Delete / Done. */
export const EventCard: React.FC<{
  event: CalendarEventData;
  calendars: CalendarSource[];
  anchor: { left: number; top: number };
  onClose: () => void;
  onDelete: () => void;
  onCalendar: (id: string) => void;
}> = ({ event, calendars, anchor, onClose, onDelete, onCalendar }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button[data-done]')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [event.id, onClose]);
  const cal = (event.meta as { calendar?: string } | undefined)?.calendar;
  const color = EVENT_COLOR[event.color ?? 'blue'];
  const multi = event.start.toDateString() !== event.end.toDateString();
  return (
    <div ref={ref} className={styles.card} role="dialog" aria-label={event.title} style={{ left: anchor.left, top: anchor.top, ['--cv' as string]: color }}>
      <header>
        <i aria-hidden />
        <h4>{event.title}</h4>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><IconX size={14} /></button>
      </header>
      <p className={styles.cardRow}>
        <IconClock size={14} aria-hidden />
        <span>
          {DAYS[event.start.getDay()]}, {MONTHS[event.start.getMonth()]} {event.start.getDate()}
          {multi && ` to ${MONTHS[event.end.getMonth()]} ${event.end.getDate()}`}
          {event.allDay ? <em> All day</em> : <em> {t(event.start)} to {t(event.end)}</em>}
        </span>
      </p>
      {event.location && (
        <p className={styles.cardRow}>
          <IconMapPin size={14} aria-hidden />
          <span>{event.location}</span>
        </p>
      )}
      <div className={styles.cardCals} role="radiogroup" aria-label="Calendar">
        {calendars.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={cal === c.id} data-on={cal === c.id ? '' : undefined} style={{ ['--cv' as string]: EVENT_COLOR[c.color] }} onClick={() => onCalendar(c.id)}>
            <i aria-hidden />
            {c.name}
          </button>
        ))}
      </div>
      <footer>
        <Button variant="ghost" size="sm" leftIcon={<IconTrash size={16} />} onClick={onDelete}>Delete</Button>
        <Button variant="primary" size="sm" data-done onClick={onClose}>Done</Button>
      </footer>
    </div>
  );
};

/** Where the card goes: beside the event if there is room, else on its other side, kept inside the block. */
export function cardAnchor(el: HTMLElement, root: HTMLElement, cardW = 300, cardH = 280): { left: number; top: number } {
  const r = el.getBoundingClientRect();
  const c = root.getBoundingClientRect();
  let left = r.right - c.left + 8;
  if (left + cardW > c.width - 8) left = r.left - c.left - cardW - 8;
  left = Math.max(8, Math.min(left, c.width - cardW - 8));
  const top = Math.max(8, Math.min(r.top - c.top - 8, c.height - cardH - 8));
  return { left, top };
}
