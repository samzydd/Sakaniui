import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThinkingLoader } from './ThinkingLoader';

const meta = {
  title: 'AI/Thinking Loader',
  component: ThinkingLoader,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `The status pill of an AI that is working: a gradient ray spinner and a shimmering label. Matches the Figma "Thinking Loader".

Change \`label\` as the work moves on and the text crossfades while the pill grows or shrinks to fit. You choose the label from what your model is doing; the component only shows it.` } } },
} satisfies Meta<typeof ThinkingLoader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Thinking: Story = { args: { label: 'Thinking' }, decorators: [(S) => <div style={{ padding: 24 }}><S /></div>] };

const STEPS = ['Thinking', 'Searching the web', 'Writing response'];
export const Cycling: Story = {
  args: { label: 'Thinking' },
  render: () => {
    const [i, setI] = React.useState(0);
    React.useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % STEPS.length), 2400); return () => clearInterval(t); }, []);
    return <div style={{ padding: 24 }}><ThinkingLoader label={STEPS[i]} /></div>;
  },
};
