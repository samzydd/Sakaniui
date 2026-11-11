import type { Meta, StoryObj } from '@storybook/react';
import { ReasoningTrace } from './ReasoningTrace';

const meta = {
  title: 'AI/Reasoning Trace',
  component: ReasoningTrace,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `The thinking panel above a reply. Matches the Figma "Reasoning Trace" set: Streaming, Open, Closed.

- **streaming**: a ray spinner turns, "Thinking" shimmers, the seconds count and each new line clears a soft blur, with a violet caret at the write frontier.
- **done**: reads "Thought for 6s"; closed it shows \`summary\`, open the lines fold down.
- Pass the reasoning as children, one paragraph per line. Presentational: append lines as they arrive, then set \`status="done"\` with the final \`elapsed\`.` } } },
  decorators: [(S) => <div style={{ width: 520, maxWidth: '100%', padding: 24, boxSizing: 'border-box' }}><S /></div>],
} satisfies Meta<typeof ReasoningTrace>;
export default meta;
type Story = StoryObj<typeof meta>;

const lines = [
  <p key="1">Looking at which deals changed stage in the last seven days.</p>,
  <p key="2">Three moved forward. Acme went quiet after the proposal and Globex asked for a quote.</p>,
  <p key="3">Checking when each of them was last contacted.</p>,
];

export const Streaming: Story = { args: { status: 'streaming', elapsed: 3.2, children: lines } };
export const Closed: Story = { args: { status: 'done', elapsed: 6, summary: 'Compared deal stages and found two to chase', children: lines } };
export const Open: Story = { args: { status: 'done', elapsed: 6, defaultOpen: true, children: lines } };
