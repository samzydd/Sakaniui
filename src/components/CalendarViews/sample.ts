import type { CalendarEventData, CalendarEventColor } from './types';

/** The day the samples are "today" (a Thursday), so every render and screenshot reads the same. */
export const SAMPLE_TODAY = new Date(2026, 10, 12, 10, 24);

const at = (day: number, h: number, m = 0, month = 10) => new Date(2026, month, day, h, m);
let n = 0;
const ev = (title: string, start: Date, end: Date, color: CalendarEventColor, extra: Partial<CalendarEventData> = {}): CalendarEventData => ({
  id: `e${++n}`,
  title,
  start,
  end,
  color,
  ...extra,
});

/** A busy November: all-day and multi-day events, timed meetings that overlap, and a busy Thursday. */
export const SAMPLE_EVENTS: CalendarEventData[] = [
  // all-day and multi-day
  ev('Halloween', at(31, 0, 0, 9), at(31, 23, 59, 9), 'orange', { allDay: true }),
  ev('Clocks go back', at(1, 0), at(1, 23, 59), 'red', { allDay: true }),
  ev('Launch week', at(16, 0), at(20, 23, 59), 'teal', { allDay: true }),
  ev('Weekend in Lucerne', at(7, 0), at(8, 23, 59), 'purple', { allDay: true }),
  ev('Quarterly planning', at(11, 0), at(13, 23, 59), 'green', { allDay: true }),
  ev("Ava's birthday", at(21, 0), at(21, 23, 59), 'gold', { allDay: true }),
  ev('Thanksgiving', at(26, 0), at(26, 23, 59), 'red', { allDay: true }),
  // week of Nov 2
  ev('Sprint planning', at(2, 9, 30), at(2, 10, 30), 'blue', { location: 'Room 4B' }),
  ev('Design review', at(3, 11), at(3, 12), 'purple', { location: 'Zoom' }),
  ev('Press kit', at(3, 11, 30), at(3, 12, 30), 'blue'),
  ev('Run club', at(4, 7), at(4, 8), 'green'),
  ev('Customer call', at(4, 14), at(4, 15), 'blue', { location: 'Google Meet' }),
  ev('Pricing page review', at(5, 9, 15), at(5, 10), 'teal'),
  ev('Dinner', at(5, 19, 30), at(5, 21), 'orange', { location: 'Via Carota' }),
  ev('Retro', at(6, 16), at(6, 17), 'blue'),
  // week of Nov 9
  ev('Sprint planning', at(9, 9, 30), at(9, 10, 30), 'blue', { location: 'Room 4B' }),
  ev('1:1 with Marcus', at(9, 15), at(9, 15, 30), 'purple'),
  ev('Design crit', at(10, 11), at(10, 12), 'purple', { location: 'Zoom' }),
  ev('Launch checklist', at(11, 10), at(11, 11), 'teal'),
  ev('Board prep', at(11, 15), at(11, 16, 30), 'blue', { location: 'Room 2A' }),
  ev('Standup', at(12, 9, 15), at(12, 9, 30), 'blue', { location: 'Google Meet' }),
  ev('Design crit', at(12, 10), at(12, 10, 45), 'purple', { location: 'Zoom' }),
  ev('Lunch with Sofia', at(12, 12, 30), at(12, 13, 30), 'green', { location: "Cafe Henri's" }),
  ev('Customer interviews', at(12, 14), at(12, 15), 'blue', { location: 'Zoom' }),
  ev('Launch go or no-go', at(12, 16, 30), at(12, 17), 'orange', { location: 'Google Meet' }),
  ev('Investor update', at(12, 11, 30), at(12, 12, 30), 'gold'),
  ev('Farmers market', at(14, 10), at(14, 11, 30), 'green'),
  ev('Brunch with Jasmine', at(15, 11), at(15, 12, 30), 'green', { location: '8 Bond St' }),
  // week of Nov 16
  ev('Hiring sync', at(17, 10), at(17, 10, 45), 'blue'),
  ev('Webinar: design systems', at(18, 14), at(18, 15), 'purple'),
  ev('Launch retro', at(19, 15), at(19, 16), 'teal'),
  ev('Team offsite', at(20, 9), at(20, 17), 'green', { location: 'Brooklyn Navy Yard' }),
  // week of Nov 23
  ev('Sprint planning', at(23, 9, 30), at(23, 10, 30), 'blue', { location: 'Room 4B' }),
  ev('Config Europe', at(24, 0), at(25, 23, 59), 'purple', { allDay: true }),
  ev('Talk: design systems', at(25, 14), at(25, 15), 'purple'),
  ev('Team lunch', at(27, 12), at(27, 13, 30), 'orange'),
  ev('Invoice run', at(30, 12), at(30, 12, 45), 'gold'),
];
