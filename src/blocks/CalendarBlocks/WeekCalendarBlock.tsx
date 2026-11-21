/**
 * WeekCalendarBlock - Blocks / Application / Week Calendar
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder and edit it. The week on its own: a header with
 * the month, a line about what is in view, previous / Today / next, a Week and Work week switch and New event, and the
 * week as a time grid below it.
 *
 *   click an event   its card: when, where, which calendar, Delete and Done (Escape closes it)
 *   drag an event    to another day or time; it snaps to 15 minutes. Alt + arrows moves a focused event
 *
 * Built from WeekCalendar and CalendarEvent, SegmentedControl and Button. The events are plain props: feed them from
 * your own query and listen to `onEventsChange` to save.
 */

import React from 'react';
import { IconPlus } from '../../icons/outline/plus';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { WeekCalendar } from '../../components/CalendarViews';
import type { CalendarEventData } from '../../components/CalendarViews';
import { CalendarHeader, EventCard, cardAnchor } from './CalendarChrome';
import { SAMPLE_CALENDARS, SAMPLE_CALENDAR_EVENTS, SAMPLE_TODAY, type CalendarSource } from './sample';
import styles from './CalendarBlocks.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface WeekCalendarBlockProps {
  events?: CalendarEventData[];
  /** The calendars an event can belong to (`meta.calendar`): they are the choices on its card. */
  calendars?: CalendarSource[];
  /** The first day shown. */
  defaultDate?: Date;
  /** Fixes "now" (the line and Today). Left out, it is the real time and it moves. */
  now?: Date;
  defaultView?: 'week' | 'work-week';
  /** Called with the whole list after a move, a calendar change or a delete. */
  onEventsChange?: (events: CalendarEventData[]) => void;
  /** "New event" was pressed, or an empty slot. */
  onCreate?: (start?: Date) => void;
  /** The height of the whole block. Default 720. */
  height?: number | string;
  className?: string;
}

export const WeekCalendarBlock: React.FC<WeekCalendarBlockProps> = ({
  events: eventsProp = SAMPLE_CALENDAR_EVENTS,
  calendars = SAMPLE_CALENDARS,
  defaultDate = SAMPLE_TODAY,
  now = SAMPLE_TODAY,
  defaultView = 'week',
  onEventsChange,
  onCreate,
  height = 720,
  className,
}) => {
  const [events, setEvents] = React.useState(eventsProp);
  const [date, setDate] = React.useState(defaultDate);
  const [view, setView] = React.useState(defaultView);
  const [open, setOpen] = React.useState<{ id: string; anchor: { left: number; top: number } } | null>(null);
  const root = React.useRef<HTMLDivElement>(null);

  const commit = (next: CalendarEventData[]) => {
    setEvents(next);
    onEventsChange?.(next);
  };
  const current = open ? events.find((e) => e.id === open.id) : undefined;

  // what is in view: the week's first day, and how many events touch it
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + (view === 'week' ? 7 : 5));
  const inView = events.filter((e) => e.end.getTime() >= weekStart.getTime() && e.start.getTime() < weekEnd.getTime()).length;
  const shift = (days: number) => setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));

  return (
    <div ref={root} className={[styles.block, className].filter(Boolean).join(' ')} style={{ height }}>
      <CalendarHeader
        month={MONTHS[weekStart.getMonth()]}
        year={weekStart.getFullYear()}
        subtitle={`${inView} ${inView === 1 ? 'event' : 'events'} ${view === 'week' ? 'this week' : 'this work week'}`}
        onPrev={() => shift(-7)}
        onNext={() => shift(7)}
        onToday={() => setDate(now)}
        prevLabel="Previous week"
        nextLabel="Next week"
      >
        <div className={styles.viewSwitch}>
          <SegmentedControl
            fullWidth
            options={[{ value: 'week', label: 'Week' }, { value: 'work-week', label: 'Work week' }]}
            value={view}
            onChange={(v) => setView(v as 'week' | 'work-week')}
          />
        </div>
        <Button variant="primary" size="md" leftIcon={<IconPlus size={16} />} onClick={() => onCreate?.()}>New event</Button>
      </CalendarHeader>
      <WeekCalendar
        hideHeader
        events={events}
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
