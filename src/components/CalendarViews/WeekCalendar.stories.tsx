import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WeekCalendar } from './WeekCalendar';
import { SAMPLE_EVENTS, SAMPLE_TODAY } from './sample';
import type { CalendarEventData } from './types';

/**
 * A week as a time grid: events as tall as they are long, overlapping ones side by side, all-day events in a lane
 * under the day heads, and a line for now. Drag an event to another day or time (it snaps to 15 minutes), or focus it
 * and move it with Alt + arrows. The data is plain props and you own it.
 */
const meta = {
  title: 'Composite/Week Calendar',
  component: WeekCalendar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { events: SAMPLE_EVENTS, now: SAMPLE_TODAY, defaultDate: SAMPLE_TODAY },
  decorators: [(S) => <div style={{ width: 1000 }}><S /></div>],
} satisfies Meta<typeof WeekCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;

const Live: React.FC<React.ComponentProps<typeof WeekCalendar>> = (props) => {
  const [events, setEvents] = React.useState<CalendarEventData[]>(props.events);
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <WeekCalendar
      {...props}
      events={events}
      activeEventId={open}
      onEventClick={(e) => setOpen((o) => (o === e.id ? null : e.id))}
      onEventMove={(e, next) => setEvents((all) => all.map((x) => (x.id === e.id ? { ...x, ...next } : x)))}
    />
  );
};

export const Default: Story = { render: (args) => <Live {...args} /> };
export const WorkWeek: Story = { args: { days: 5 }, render: (args) => <Live {...args} /> };
export const Dark: Story = {
  render: (args) => <Live {...args} />,
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24 }}><S /></div>],
};
export const NextWeek: Story = { args: { defaultDate: new Date(2026, 10, 17), now: SAMPLE_TODAY } };
