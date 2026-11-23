import type { Meta, StoryObj } from '@storybook/react';
import { KanbanBoardBlock } from './KanbanBoardBlock';

const meta = {
  title: 'Blocks/Data & Content/Kanban Board',
  component: KanbanBoardBlock,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: `A COMPOSITION EXAMPLE, not a configurable component. Copy this file and edit
it: change the columns, swap the sample tasks, adjust the card content.
Assembled entirely from Sakani components.

Mirrors the four states in the Figma block:
- **default** — columns with counts, cards, and an add affordance
- **loading** — card skeletons hold each column's shape
- **empty-column** — a column with no cards shows a dashed drop zone
- **dragging** — a card lifts while a placeholder marks the drop target

Moving a card without dragging: hover or focus a card and a "Move to" button (⇄) shows in its footer. It opens a
menu of every stage; pick one and the card slides across into that column, then glides up to the top. Alt + → / Alt + ←
move a focused card one stage.

The column is defined locally (below) rather than as a library component —
it exists to serve this block, so it lives with the block.` } }, layout: 'fullscreen' },
  argTypes: {
    state: { control: 'select', options: ['default', 'loading', 'empty-column', 'dragging'] },
  },
} satisfies Meta<typeof KanbanBoardBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Resting board: columns with counts, cards, and an add-task affordance. */
export const Default: Story = { args: { state: 'default' } };
/** Card skeletons hold each column's shape so nothing shifts on load. */
export const Loading: Story = { args: { state: 'loading' } };
/** A column with no cards shows a dashed drop zone rather than blank space. */
export const EmptyColumn: Story = { args: { state: 'empty-column' } };
/** A card lifts with raised elevation while a placeholder marks the drop target. */
export const Dragging: Story = { args: { state: 'dragging' } };

export const DarkMode: Story = {
  args: { state: 'default' },
  decorators: [(S) => (<div className="dark" style={{ background: 'var(--color-bg-canvas)' }}><S /></div>)],
};

/** Embedded taller than its real content (e.g. a demo frame) — every
 * column stretches to equal height and caps its real cards with a dashed
 * placeholder slot down to the bottom instead of leaving blank canvas. */
export const FilledHeight: Story = {
  args: { state: 'default', fillPlaceholders: true },
  decorators: [(S) => (<div style={{ display: 'flex', height: '100vh' }}><S /></div>)],
};
