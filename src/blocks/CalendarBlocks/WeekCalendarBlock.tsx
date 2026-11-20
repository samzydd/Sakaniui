/**
 * WeekCalendarBlock - Blocks / Application / Week Calendar
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder and edit it. A complete calendar app: a
 * sidebar (a mini month, your calendars with on/off boxes, the person) and the week as a time grid, with Week and Work
 * week, Today and previous/next in the header, and a card that opens on an event.
 *
 *   click an event   its card: when, where, which calendar, Delete and Done (Escape closes it)
 *   drag an event    to another day or time; it snaps to 15 minutes. Alt + arrows moves a focused event
 *   calendars        untick one in the sidebar and its events leave the grid
 *   mini month       pick a day and the week follows
 *
 * Built from WeekCalendar and CalendarEvent, Calendar, SegmentedControl, Button, Avatar. The events are plain props:
 * feed them from your own query and listen to `onEventsChange` to save.
 */

import React from 'react';
import { IconPlus } from '../../icons/outline/plus';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { WeekCalendar } from '../../components/CalendarViews';
import type { CalendarEventData } from '../../components/CalendarViews';
import { CalendarSidebar, EventCard, cardAnchor } from './CalendarChrome';
import { SAMPLE_CALENDARS, SAMPLE_CALENDAR_EVENTS, SAMPLE_TODAY, type CalendarSource } from './sample';
import styles from './CalendarBlocks.module.css';

export interface WeekCalendarBlockProps {
  events?: CalendarEventData[];
  /** The calendars in the sidebar. An event belongs to one through `meta.calendar`. */
  calendars?: CalendarSource[];
  workspace?: string;
  user?: { name: string; email: string };
  /** The first day shown. */
  defaultDate?: Date;
  /** Fixes "now" (the line and Today). Left out, it is the real time and it moves. */
  now?: Date;
  defaultView?: 'week' | 'work-week';
  /** Called with the whole list after a move, a calendar change or a delete. */
  onEventsChange?: (events: CalendarEventData[]) => void;
  /** "New event" was pressed, or an empty slot. */
  onCreate?: (start?: Date) => void;
  /** The height of the whole block. Default 760. */
  height?: number | string;
  className?: string;
}

export const WeekCalendarBlock: React.FC<WeekCalendarBlockProps> = ({
  events: eventsProp = SAMPLE_CALENDAR_EVENTS,
  calendars = SAMPLE_CALENDARS,
  workspace = 'Northwind',
  user = { name: 'Emma Collins', email: 'emma@northwind.studio' },
  defaultDate = SAMPLE_TODAY,
  now = SAMPLE_TODAY,
  defaultView = 'week',
  onEventsChange,
  onCreate,
  height = 760,
  className,
}) => {
  const [events, setEvents] = React.useState(eventsProp);
  const [date, setDate] = React.useState(defaultDate);
  const [view, setView] = React.useState(defaultView);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<{ id: string; anchor: { left: number; top: number } } | null>(null);
  const root = React.useRef<HTMLDivElement>(null);

  const commit = (next: CalendarEventData[]) => {
    setEvents(next);
    onEventsChange?.(next);
  };
  const calOf = (e: CalendarEventData) => (e.meta as { calendar?: string } | undefined)?.calendar;
  const visible = events.filter((e) => !hidden.has(calOf(e) ?? ''));
  const current = open ? events.find((e) => e.id === open.id) : undefined;

  return (
    <div ref={root} className={[styles.block, className].filter(Boolean).join(' ')} style={{ height }}>
      <CalendarSidebar
        workspace={workspace}
        user={user}
        date={date}
        onDateChange={setDate}
        calendars={calendars}
        hidden={hidden}
        onToggle={(id) => setHidden((h) => { const n = new Set(h); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
      />
      <main className={styles.main}>
        <div className={styles.bar}>
          <div className={styles.barRight}>
            <div style={{ width: 220 }}>
              <SegmentedControl
                fullWidth
                options={[{ value: 'week', label: 'Week' }, { value: 'work-week', label: 'Work week' }]}
                value={view}
                onChange={(v) => setView(v as 'week' | 'work-week')}
              />
            </div>
            <Button variant="primary" size="sm" leftIcon={<IconPlus size={16} />} onClick={() => onCreate?.()}>New event</Button>
          </div>
        </div>
        <WeekCalendar
          events={visible}
          date={date}
          onDateChange={setDate}
          days={view === 'week' ? 7 : 5}
          now={now}
          height="100%"
          className={styles.view}
          activeEventId={open?.id ?? null}
          onEventClick={(e, el) => setOpen((o) => (o?.id === e.id || !root.current ? null : { id: e.id, anchor: cardAnchor(el, root.current) }))}
          onEventMove={(e, next) => commit(events.map((x) => (x.id === e.id ? { ...x, ...next } : x)))}
          onSlotClick={(start) => { setOpen(null); onCreate?.(start); }}
        />
      </main>
      {current && open && (
        <EventCard
          event={current}
          calendars={calendars}
          anchor={open.anchor}
          onClose={() => setOpen(null)}
          onDelete={() => { commit(events.filter((x) => x.id !== current.id)); setOpen(null); }}
          onCalendar={(id) => {
            const c = calendars.find((k) => k.id === id);
            if (c) commit(events.map((x) => (x.id === current.id ? { ...x, color: c.color, meta: { ...(x.meta as object), calendar: id } } : x)));
          }}
        />
      )}
    </div>
  );
};

export default WeekCalendarBlock;
