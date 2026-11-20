import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WeekCalendarBlock } from './WeekCalendarBlock';
import { MonthCalendarBlock } from './MonthCalendarBlock';

/**
 * Two full calendar screens built from the calendar views: Week (a time grid) and Month (a grid of events with the
 * selected day docked at the right). Both have a sidebar with a mini month and your calendars, and an event card.
 */
const meta = {
  title: 'Blocks/Application/Calendar',
  parameters: { layout: 'fullscreen' },
  decorators: [(S) => <div style={{ width: 1280, padding: 24 }}><S /></div>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Week: Story = { render: () => <WeekCalendarBlock /> };
export const WorkWeek: Story = { render: () => <WeekCalendarBlock defaultView="work-week" /> };
export const Month: Story = { render: () => <MonthCalendarBlock /> };
export const MonthDark: Story = {
  render: () => <MonthCalendarBlock />,
  decorators: [(S) => <div className="dark" style={{ width: 1280, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
