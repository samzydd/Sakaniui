/**
 * MonthCalendarBlock - Blocks / Application / Month Calendar
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder and edit it. A complete calendar app: a sidebar
 * (a mini month, your calendars, the person), the month as a grid of events, and the selected day docked at the right
 * with how busy it is, its schedule and its free gaps.
 *
 *   click a day or "N more"   the panel shows that day
 *   click an event            its card (Delete, Done); drag it to another day, or Alt + arrows
 *   Block focus time          turns a free gap into an event
 *   calendars                 untick one in the sidebar and its events leave the grid
 *
 * Built from MonthCalendar, DayPanel and CalendarEvent, Calendar, Button, Avatar. The events are plain props: feed them
 * from your own query and listen to `onEventsChange` to save.
 */

import React from 'react';
import { IconPlus } from '../../icons/outline/plus';
import { Button } from '../../components/Button';
import { DayPanel, MonthCalendar } from '../../components/CalendarViews';
import type { CalendarEventData } from '../../components/CalendarViews';
import { CalendarSidebar, EventCard, cardAnchor } from './CalendarChrome';
import { SAMPLE_CALENDARS, SAMPLE_CALENDAR_EVENTS, SAMPLE_TODAY, type CalendarSource } from './sample';
import styles from './CalendarBlocks.module.css';

export interface MonthCalendarBlockProps {
  events?: CalendarEventData[];
  calendars?: CalendarSource[];
  workspace?: string;
  user?: { name: string; email: string };
  /** The month shown first, and the day selected first. */
  defaultDate?: Date;
  /** Fixes "today". Left out, it is the real date. */
  today?: Date;
  onEventsChange?: (events: CalendarEventData[]) => void;
  onCreate?: (date?: Date) => void;
  /** The height of the whole block. Default 760. */
  height?: number | string;
  className?: string;
}

export const MonthCalendarBlock: React.FC<MonthCalendarBlockProps> = ({
  events: eventsProp = SAMPLE_CALENDAR_EVENTS,
  calendars = SAMPLE_CALENDARS,
  workspace = 'Northwind',
  user = { name: 'Emma Collins', email: 'emma@northwind.studio' },
  defaultDate = SAMPLE_TODAY,
  today = SAMPLE_TODAY,
  onEventsChange,
  onCreate,
  height = 760,
  className,
}) => {
  const [events, setEvents] = React.useState(eventsProp);
  const [month, setMonth] = React.useState(defaultDate);
  const [day, setDay] = React.useState<Date>(defaultDate);
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
  const openCard = (e: CalendarEventData, el: HTMLElement) =>
    setOpen((o) => (o?.id === e.id || !root.current ? null : { id: e.id, anchor: cardAnchor(el, root.current) }));

  return (
    <div ref={root} className={[styles.block, className].filter(Boolean).join(' ')} style={{ height }}>
      <CalendarSidebar
        workspace={workspace}
        user={user}
        date={day}
        onDateChange={(d) => { setDay(d); setMonth(d); }}
        calendars={calendars}
        hidden={hidden}
        onToggle={(id) => setHidden((h) => { const n = new Set(h); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
      />
      <main className={styles.main}>
        <div className={styles.bar}>
          <div className={styles.barRight}>
            <Button variant="primary" size="sm" leftIcon={<IconPlus size={16} />} onClick={() => onCreate?.(day)}>New event</Button>
          </div>
        </div>
        <div className={styles.monthWrap}>
          <MonthCalendar
            events={visible}
            date={month}
            onDateChange={setMonth}
            today={today}
            selectedDate={day}
            onSelectedDateChange={setDay}
            activeEventId={open?.id ?? null}
            onEventClick={openCard}
            onEventMove={(e, next) => commit(events.map((x) => (x.id === e.id ? { ...x, ...next } : x)))}
            className={styles.view}
          />
          <div className={styles.dock} data-lenis-prevent>
            <DayPanel
              date={day}
              events={visible}
              today={today}
              activeEventId={open?.id ?? null}
              onEventClick={openCard}
              onCreate={(d) => onCreate?.(d)}
              onBlockFocus={(start, end) =>
                commit([...events, { id: `focus-${start.getTime()}`, title: 'Focus time', start, end, color: 'green', meta: { calendar: 'personal' } }])
              }
            />
          </div>
        </div>
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

export default MonthCalendarBlock;
