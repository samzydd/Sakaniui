import type React from 'react';

/** The colour of an event, drawn from the chart tokens (and `neutral` from the muted foreground). */
export type CalendarEventColor = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'gold' | 'red' | 'neutral';

/** One event. Plain data: you own it, the views only show it and report changes through callbacks. */
export interface CalendarEventData {
  id: string;
  title: string;
  start: Date;
  /** The end. For an all-day event, the last day (or leave it equal to `start`). */
  end: Date;
  /** Shown in the all-day lane (week) or as a bar (month), whatever the times say. */
  allDay?: boolean;
  color?: CalendarEventColor;
  /** A second line: a place, a video link, who is invited. */
  location?: string;
  /** Anything you want to carry along (your own row, a calendar id). */
  meta?: unknown;
}

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** What a view reports when an event is moved: the event as it was, and its new times. */
export type CalendarEventMove = (event: CalendarEventData, next: { start: Date; end: Date }) => void;

export type RenderEvent = (event: CalendarEventData, defaults: { children: React.ReactNode }) => React.ReactNode;
