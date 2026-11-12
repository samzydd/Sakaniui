import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReasoningTrace } from './ReasoningTrace';

const meta = {
  title: 'AI/Reasoning Trace',
  component: ReasoningTrace,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `The thinking panel above a reply. Matches the Figma "Reasoning Trace" set: Streaming, Open, Closed.

- **streaming**: a ray spinner turns, "Thinking" shimmers and the seconds count. The reasoning streams in quietly (13/20, muted), each new word fading up out of a soft blur, inside a five-line window that glides up as text arrives, the oldest line fading out at the top.
- **done**: reads "Thought for 6s"; closed it shows \`summary\`, open the full reasoning folds down.
- Pass the reasoning as children, one paragraph each. Presentational: append text as it arrives (whole paragraphs or a paragraph growing word by word; only new words animate), then set \`status="done"\` with the final \`elapsed\`.` } } },
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

const THOUGHTS = [
  'They want the Q4 pipeline in a few lines, with the deals at risk called out. I should start from the opportunities closing this quarter, not the whole pipeline.',
  'Acme has a $48,000 renewal and no reply since the proposal went out nine days ago. That silence is the biggest risk. Globex asked for a revised quote, so it is moving, just slowly.',
  'Before I answer I will check the latest activity in the CRM, so the dates are right.',
];

/** Streams the reasoning word by word, then closes; it starts over after a pause. */
const LiveDemo = () => {
  const [run, setRun] = React.useState(0);
  const [lines, setLines] = React.useState<string[]>([]);
  const [elapsed, setElapsed] = React.useState(0);
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    const timers: number[] = [];
    const start = performance.now();
    setLines([]); setDone(false); setElapsed(0);
    const tick = window.setInterval(() => setElapsed((performance.now() - start) / 1000), 200);
    let t = 900;
    THOUGHTS.forEach((para, p) => {
      const words = para.split(' ');
      words.forEach((_, w) => { const next = [...THOUGHTS.slice(0, p), words.slice(0, w + 1).join(' ')]; timers.push(window.setTimeout(() => setLines(next), t)); t += 60; });
      t += 700;
    });
    timers.push(window.setTimeout(() => { window.clearInterval(tick); setDone(true); }, t));
    timers.push(window.setTimeout(() => setRun((r) => r + 1), t + 4000));
    return () => { timers.forEach(window.clearTimeout); window.clearInterval(tick); };
  }, [run]);
  return (
    <ReasoningTrace key={run} status={done ? 'done' : 'streaming'} elapsed={done ? Math.round(elapsed) : elapsed} summary="Found two deals to chase before Friday">
      {lines}
    </ReasoningTrace>
  );
};
export const Live: Story = { render: () => <LiveDemo /> };
