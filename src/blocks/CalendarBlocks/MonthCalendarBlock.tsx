/**
 * MonthCalendarBlock - Blocks / Application / Month Calendar
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder and edit it. The month on its own: a header
 * with the month, a line about what is in view, previous / Today / next and New event, and the month as a grid of events.
 *
 *   click an event    its card (Delete, Done); drag it to another day, or Alt + arrows
 *   click "N more"    that day's events as a short list; pick one to open its card
 *
 * Built from MonthCalendar and CalendarEvent, and Button. The events are plain props: feed them from your own query and
 * listen to `onEventsChange` to save.
 */

import React from 'react';
import { IconPlus } from '../../icons/outline/plus';
import { Button } from '../../components/Button';
import { MonthCalendar } from '../../components/CalendarViews';
import type { CalendarEventData } from '../../components/CalendarViews';
import { CalendarHeader, DayPopover, EventCard, cardAnchor } from './CalendarChrome';
import { SAMPLE_CALENDARS, SAMPLE_CALENDAR_EVENTS, SAMPLE_TODAY, type CalendarSource } from './sample';
import styles from './CalendarBlocks.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface MonthCalendarBlockProps {
  events?: CalendarEventData[];
  /** The calendars an event can belong to (`meta.calendar`): they are the choices on its card. */
  calendars?: CalendarSource[];
  /** The month shown first. */
  defaultDate?: Date;
  /** Fixes "today". Left out, it is the real date. */
  today?: Date;
  onEventsChange?: (events: CalendarEventData[]) => void;
  /** "New event" was pressed. */
  onCreate?: (date?: Date) => void;
  /** The height of the whole block. Default: as tall as the month needs. */
  height?: number | string;
  className?: string;
}

export const MonthCalendarBlock: React.FC<MonthCalendarBlockProps> = ({
  events: eventsProp = SAMPLE_CALENDAR_EVENTS,
  calendars = SAMPLE_CALENDARS,
  defaultDate = SAMPLE_TODAY,
  today = SAMPLE_TODAY,
  onEventsChange,
  onCreate,
  height,
  className,
}) => {
  const [events, setEvents] = React.useState(eventsProp);
  const [month, setMonth] = React.useState(defaultDate);
  const [open, setOpen] = React.useState<{ id: string; anchor: { left: number; top: number } } | null>(null);
  const [more, setMore] = React.useState<{ date: Date; anchor: { left: number; top: number } } | null>(null);
  const root = React.useRef<HTMLDivElement>(null);

  const commit = (next: CalendarEventData[]) => {
    setEvents(next);
    onEventsChange?.(next);
  };
  const current = open ? events.find((e) => e.id === open.id) : undefined;
  const openCard = (e: CalendarEventData, el: HTMLElement) => {
    setMore(null);
    setOpen((o) => (o?.id === e.id || !root.current ? null : { id: e.id, anchor: cardAnchor(el, root.current) }));
  };

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const inView = events.filter((e) => e.end.getTime() >= first.getTime() && e.start.getTime() < next.getTime()).length;
  const dayEvents = more
    ? events
        .filter((e) => e.start.getTime() < new Date(more.date.getFullYear(), more.date.getMonth(), more.date.getDate() + 1).getTime() && e.end.getTime() >= more.date.getTime())
        .sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || a.start.getTime() - b.start.getTime())
    : [];

  return (
    <div ref={root} className={[styles.block, className].filter(Boolean).join(' ')} style={{ height }}>
      <CalendarHeader
        month={MONTHS[first.getMonth()]}
        year={first.getFullYear()}
        subtitle={`${inView} ${inView === 1 ? 'event' : 'events'} this month`}
        onPrev={() => setMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1))}
        onNext={() => setMonth(next)}
        onToday={() => setMonth(today)}
        prevLabel="Previous month"
        nextLabel="Next month"
      >
        <Button variant="primary" size="md" leftIcon={<IconPlus size={16} />} onClick={() => onCreate?.()}>New event</Button>
      </CalendarHeader>
      <MonthCalendar
        hideHeader
        events={events}
        date={month}
        onDateChange={setMonth}
        today={today}
        activeEventId={open?.id ?? null}
        onEventClick={openCard}
        onMoreClick={(d, el) => { setOpen(null); if (root.current) setMore({ date: d, anchor: cardAnchor(el, root.current, 280, 240) }); }}
        onEventMove={(e, nextTimes) => commit(events.map((x) => (x.id === e.id ? { ...x, ...nextTimes } : x)))}
        className={styles.view}
      />
      {more && <DayPopover date={more.date} events={dayEvents} anchor={more.anchor} onClose={() => setMore(null)} onPick={openCard} />}
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
