import type { CalendarEventData, WeekStartsOn } from './types';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const startOfWeek = (d: Date, weekStartsOn: WeekStartsOn) => {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() - weekStartsOn + 7) % 7));
};
export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();
/** Whole days between two dates, by calendar day (DST-safe). */
export const dayDiff = (a: Date, b: Date) =>
  Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);

/** "9a", "9:30a", "12p": compact, for a chip. */
export const fmtTimeShort = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes();
  return `${h}${m ? `:${pad(m)}` : ''}${d.getHours() < 12 ? 'a' : 'p'}`;
};
/** "9:30 AM": for a card or a row. */
export const fmtTime = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
};
export const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

export const isBanner = (e: CalendarEventData) => {
  if (e.allDay) return true;
  // a timed event that crosses midnight (ending exactly at 00:00 does not count)
  return !sameDay(e.start, new Date(e.end.getTime() - 1)) && e.end.getTime() > e.start.getTime();
};
/** First and last calendar day an event touches. */
export const eventDays = (e: CalendarEventData): [Date, Date] => {
  const first = startOfDay(e.start);
  const lastMoment = e.allDay || e.end.getTime() <= e.start.getTime() ? e.end : new Date(e.end.getTime() - 1);
  const last = startOfDay(lastMoment.getTime() < e.start.getTime() ? e.start : lastMoment);
  return [first, last];
};
export const touchesDay = (e: CalendarEventData, day: Date) => {
  const [a, b] = eventDays(e);
  const d = startOfDay(day).getTime();
  return a.getTime() <= d && d <= b.getTime();
};

export const byStart = (a: CalendarEventData, b: CalendarEventData) =>
  a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime();

/** Moves an event by whole days and minutes, keeping its length. */
export const shiftEvent = (e: CalendarEventData, days: number, minutes = 0) => {
  const move = (d: Date) => {
    const x = addDays(d, days);
    x.setMinutes(x.getMinutes() + minutes);
    return x;
  };
  return { start: move(e.start), end: move(e.end) };
};

/* ---------- week: timed events side by side when they overlap ---------- */
export interface Placed {
  event: CalendarEventData;
  /** 0-based column among the events it overlaps. */
  col: number;
  /** How many columns that cluster of overlapping events needs. */
  cols: number;
}
export function layoutDay(events: CalendarEventData[]): Placed[] {
  const sorted = [...events].sort(byStart);
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const p of cluster) p.cols = colEnds.length;
    out.push(...cluster);
    cluster = [];
    colEnds = [];
  };
  for (const e of sorted) {
    const s = e.start.getTime();
    const en = Math.max(e.end.getTime(), s + 15 * 60000);
    if (cluster.length && s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= s);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(en);
    } else colEnds[col] = en;
    clusterEnd = Math.max(clusterEnd, en);
    cluster.push({ event: e, col, cols: 1 });
  }
  flush();
  return out;
}

/* ---------- month and all-day: events that span days, packed into lanes ---------- */
export interface Segment {
  event: CalendarEventData;
  /** 0-based first and last column (day of the row) the bar covers. */
  c0: number;
  c1: number;
  /** The event started before this row / goes on after it. */
  before: boolean;
  after: boolean;
  lane: number;
}
export function packBanners(events: CalendarEventData[], rowStart: Date, days = 7): Segment[] {
  const rowEnd = addDays(rowStart, days - 1);
  const segs: Omit<Segment, 'lane'>[] = [];
  for (const e of events) {
    if (!isBanner(e)) continue;
    const [a, b] = eventDays(e);
    if (b.getTime() < rowStart.getTime() || a.getTime() > rowEnd.getTime()) continue;
    const c0 = Math.max(0, dayDiff(rowStart, a));
    const c1 = Math.min(days - 1, dayDiff(rowStart, b));
    segs.push({ event: e, c0, c1, before: a.getTime() < rowStart.getTime(), after: b.getTime() > rowEnd.getTime() });
  }
  segs.sort((x, y) => x.c0 - y.c0 || y.c1 - y.c0 - (x.c1 - x.c0) || byStart(x.event, y.event));
  const laneEnds: number[] = [];
  return segs.map((s) => {
    let lane = laneEnds.findIndex((end) => end < s.c0);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(s.c1);
    } else laneEnds[lane] = s.c1;
    return { ...s, lane };
  });
}

/* ---------- day panel: busy time and free gaps ---------- */
export function mergeBusy(events: CalendarEventData[]): [number, number][] {
  const spans = events
    .filter((e) => !isBanner(e))
    .map((e) => [minutesOfDay(e.start), Math.max(minutesOfDay(e.start) + 15, e.end.getHours() * 60 + e.end.getMinutes() || 1440)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else out.push([s[0], s[1]]);
  }
  return out;
}
