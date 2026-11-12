import type { Meta, StoryObj } from '@storybook/react';
import { SuggestionChip } from './SuggestionChip';
import { IconChartBar } from '../../icons/outline/chart-bar';

const meta = {
  title: 'AI/Suggestion Chip',
  component: SuggestionChip,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `A suggested prompt. Matches the Figma "Suggestion Chip" set: Style Starter or Follow-up x Default or Hover.

A **starter** is a card (icon tile, title, hint) for the empty screen; give each an \`index\` and they rise and fade in 50ms apart. A **follow-up** is a pill under a reply. Choosing one is up to you: fill the prompt box with \`label\` and send it.` } } },
} satisfies Meta<typeof SuggestionChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Starter: Story = { args: { variant: 'starter', label: 'Summarize my pipeline', hint: 'Where deals are stuck this week', icon: IconChartBar }, decorators: [(S) => <div style={{ width: 232, padding: 24 }}><S /></div>] };
export const FollowUp: Story = { args: { variant: 'follow-up', label: 'Draft the follow-ups' }, decorators: [(S) => <div style={{ padding: 24 }}><S /></div>] };
