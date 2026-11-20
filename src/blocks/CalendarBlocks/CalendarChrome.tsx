/**
 * The pieces the two calendar blocks share: the sidebar (a mini month, the calendars with their on/off boxes, the
 * person) and the event card that opens next to an event. Not exported on their own: copy them with the block.
 */

import React from 'react';
import { IconX } from '../../icons/outline/x';
import { IconTrash } from '../../icons/outline/trash';
import { IconMapPin } from '../../icons/outline/map-pin';
import { IconClock } from '../../icons/outline/clock';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Calendar } from '../../components/Calendar';
import { EVENT_COLOR } from '../../components/CalendarViews';
import type { CalendarEventData } from '../../components/CalendarViews';
import type { CalendarSource } from './sample';
import styles from './CalendarBlocks.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const t = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;

export const CalendarSidebar: React.FC<{
  workspace: string;
  user: { name: string; email: string };
  date: Date;
  onDateChange: (d: Date) => void;
  calendars: CalendarSource[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
}> = ({ workspace, user, date, onDateChange, calendars, hidden, onToggle }) => {
  const groups = Array.from(new Set(calendars.map((c) => c.group ?? 'Calendars')));
  return (
    <aside className={styles.sidebar} aria-label="Calendars">
      <div className={styles.workspace}>{workspace}</div>
      <div className={styles.mini}>
        <Calendar value={date} onChange={onDateChange} defaultMonth={date} />
      </div>
      <div className={styles.calendars} data-lenis-prevent>
        {groups.map((g) => (
          <div key={g} className={styles.group}>
            <h4>{g}</h4>
            {calendars
              .filter((c) => (c.group ?? 'Calendars') === g)
              .map((c) => {
                const on = !hidden.has(c.id);
                return (
                  <button key={c.id} type="button" role="checkbox" aria-checked={on} className={styles.calRow} style={{ ['--cv' as string]: EVENT_COLOR[c.color] }} onClick={() => onToggle(c.id)}>
                    <i data-on={on ? '' : undefined} aria-hidden>
                      {on && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                      )}
                    </i>
                    {c.name}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      <div className={styles.user}>
        <Avatar initials={user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)} size="sm" />
        <span>
          <b>{user.name}</b>
          <small>{user.email}</small>
        </span>
      </div>
    </aside>
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
