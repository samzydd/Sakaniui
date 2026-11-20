import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DayPanel } from './DayPanel';
import { SAMPLE_EVENTS, SAMPLE_TODAY } from './sample';

/**
 * One day beside a month or week view: how busy it is (events, hours booked and free, a strip of the working day),
 * all-day events, the schedule in order, and each free gap of 30 minutes or more as a "Block focus time" button.
 */
const meta = {
  title: 'Composite/Day Panel',
  component: DayPanel,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { date: SAMPLE_TODAY, today: SAMPLE_TODAY, events: SAMPLE_EVENTS, onBlockFocus: () => {}, onCreate: () => {}, onEventClick: () => {} },
  decorators: [(S) => <div style={{ width: 340 }}><S /></div>],
} satisfies Meta<typeof DayPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Busy: Story = {};
export const QuietDay: Story = { args: { date: new Date(2026, 10, 13) } };
export const Dark: Story = { decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24, width: 340 }}><S /></div>] };
