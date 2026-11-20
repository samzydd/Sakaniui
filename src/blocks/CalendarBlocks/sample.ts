import { SAMPLE_EVENTS, SAMPLE_TODAY } from '../../components/CalendarViews/sample';
import type { CalendarEventColor, CalendarEventData } from '../../components/CalendarViews';

export interface CalendarSource {
  id: string;
  name: string;
  color: CalendarEventColor;
  /** The group it is listed under in the sidebar. */
  group?: string;
}

export const SAMPLE_CALENDARS: CalendarSource[] = [
  { id: 'work', name: 'Work', color: 'blue', group: 'Northwind' },
  { id: 'team', name: 'Team meetings', color: 'purple', group: 'Northwind' },
  { id: 'launch', name: 'Launch', color: 'teal', group: 'Northwind' },
  { id: 'personal', name: 'Personal', color: 'green', group: 'Personal' },
  { id: 'travel', name: 'Travel', color: 'orange', group: 'Personal' },
  { id: 'holidays', name: 'Holidays', color: 'red', group: 'Personal' },
];

const BY_COLOR: Record<string, string> = { blue: 'work', purple: 'team', teal: 'launch', green: 'personal', orange: 'travel', red: 'holidays', gold: 'work', neutral: 'work' };

/** The sample events, each tagged with the calendar it belongs to (`meta.calendar`). */
export const SAMPLE_CALENDAR_EVENTS: CalendarEventData[] = SAMPLE_EVENTS.map((e) => ({ ...e, meta: { calendar: BY_COLOR[e.color ?? 'blue'] } }));
export { SAMPLE_TODAY };
