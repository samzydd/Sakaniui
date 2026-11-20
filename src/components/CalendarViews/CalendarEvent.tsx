/**
 * CalendarEvent
 *
 * One event as the calendar views draw it. Three shapes:
 *   chip   a single-day timed event in a month cell: the time, then the title
 *   bar    an all-day or multi-day event: a tinted bar that runs across days
 *   block  a timed event in the week grid: a tinted card with a coloured edge, the title, the time range and a place
 *
 * The colour is one of the chart tokens, mixed into the surface so it follows light and dark. The views draw events
 * through this component; use it on its own to build your own list or agenda.
 */

import React from 'react';
import type { CalendarEventColor, CalendarEventData } from './types';
import { fmtTime, fmtTimeShort } from './dates';
import styles from './CalendarEvent.module.css';

export const EVENT_COLOR: Record<CalendarEventColor, string> = {
  blue: 'var(--color-chart-2)',
  green: 'var(--color-chart-6)',
  orange: 'var(--color-chart-1)',
  purple: 'var(--color-chart-4)',
  teal: 'var(--color-chart-3)',
  gold: 'var(--color-chart-5)',
  red: 'var(--color-danger-solid)',
  neutral: 'var(--color-fg-muted)',
};

export type CalendarEventShape = 'chip' | 'bar' | 'block';

export interface CalendarEventProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'children'> {
  event: CalendarEventData;
  shape?: CalendarEventShape;
  /** A bar that started before this row or goes on after it: its square end shows it. */
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  /** Lit while it is selected, or while its card is open. */
  selected?: boolean;
  /** Being dragged. */
  dragging?: boolean;
  /** Replaces the time text (a block being dragged shows its new time here). */
  timeLabel?: string;
  /** How much a block shows: just the title, the title and time, or the place too. Default "full". */
  detail?: 'title' | 'time' | 'full';
}

export const CalendarEvent = React.forwardRef<HTMLButtonElement, CalendarEventProps>(
  ({ event, shape = 'chip', continuesBefore, continuesAfter, selected, dragging, timeLabel, detail = 'full', className, style, ...rest }, ref) => {
    const color = EVENT_COLOR[event.color ?? 'blue'];
    const range = timeLabel ?? `${fmtTime(event.start)} – ${fmtTime(event.end)}`;
    return (
      <button
        ref={ref}
        type="button"
        className={[styles.event, styles[shape], className].filter(Boolean).join(' ')}
        style={{ ...style, ['--cv' as string]: color }}
        data-selected={selected ? '' : undefined}
        data-dragging={dragging ? '' : undefined}
        data-before={continuesBefore ? '' : undefined}
        data-after={continuesAfter ? '' : undefined}
        aria-label={`${event.title}, ${event.allDay ? 'all day' : range}${event.location ? `, ${event.location}` : ''}`}
        {...rest}
      >
        {shape === 'chip' && (
          <>
            <i className={styles.dot} aria-hidden />
            <span className={styles.time}>{timeLabel ?? fmtTimeShort(event.start)}</span>
            <span className={styles.title}>{event.title}</span>
          </>
        )}
        {shape === 'bar' && <span className={styles.title}>{event.title}</span>}
        {shape === 'block' && (
          <>
            <span className={styles.title}>{event.title}</span>
            {detail !== 'title' && <span className={styles.range}>{range}</span>}
            {detail === 'full' && event.location && <span className={styles.place}>{event.location}</span>}
          </>
        )}
      </button>
    );
  },
);
CalendarEvent.displayName = 'CalendarEvent';

export default CalendarEvent;
