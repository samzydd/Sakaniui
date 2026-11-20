import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MonthCalendar } from './MonthCalendar';
import { SAMPLE_EVENTS, SAMPLE_TODAY } from './sample';
import type { CalendarEventData } from './types';

/**
 * A month of events: chips, bars across days, "N more", a lit day, and drag to another day. It is the calendar view,
 * not a date picker (that is Calendar). The data is plain props and you own it: the view reports a move through
 * `onEventMove` and shows what you give it back.
 */
const meta = {
  title: 'Composite/Month Calendar',
  component: MonthCalendar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { events: SAMPLE_EVENTS, today: SAMPLE_TODAY, defaultDate: SAMPLE_TODAY },
  decorators: [(S) => <div style={{ width: 1000, height: 720 }}><S /></div>],
} satisfies Meta<typeof MonthCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;

const Live: React.FC<React.ComponentProps<typeof MonthCalendar>> = (props) => {
  const [events, setEvents] = React.useState<CalendarEventData[]>(props.events);
  const [day, setDay] = React.useState<Date | null>(SAMPLE_TODAY);
  return (
    <MonthCalendar
      {...props}
      events={events}
      selectedDate={day}
      onSelectedDateChange={setDay}
      onEventMove={(e, next) => setEvents((all) => all.map((x) => (x.id === e.id ? { ...x, ...next } : x)))}
    />
  );
};

/** Drag a chip or a bar to another day; Alt + arrows moves the focused event. */
export const Default: Story = { render: (args) => <Live {...args} /> };
export const Dark: Story = {
  render: (args) => <Live {...args} />,
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24 }}><S /></div>],
};
export const SundayFirst: Story = { args: { weekStartsOn: 0 } };
