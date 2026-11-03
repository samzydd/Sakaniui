import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChainOfThought, ChainOfThoughtStep, SourceStack } from './ChainOfThought';
import { IconBulb } from '../../icons/outline/bulb';
import { IconBrandX } from '../../icons/outline/brand-x';
import { IconBrandReddit } from '../../icons/outline/brand-reddit';
import { IconBrandGithub } from '../../icons/outline/brand-github';
import { IconBrandLinkedin } from '../../icons/outline/brand-linkedin';
import { IconBrandFigma } from '../../icons/outline/brand-figma';
import { IconBrandNotion } from '../../icons/outline/brand-notion';
import { IconFileText } from '../../icons/outline/file-text';

const SOURCES = [
  { label: 'Reddit', icon: IconBrandReddit }, { label: 'LinkedIn', icon: IconBrandLinkedin },
  { label: 'GitHub', icon: IconBrandGithub }, { label: 'Figma', icon: IconBrandFigma },
];

const meta = {
  title: 'Composite/Chain of Thought',
  component: ChainOfThought,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `An agent's visible work. Matches the Figma "Chain of Thought" page: a header, steps joined by a rail,
and a live "Working" line.

- **ChainOfThought**: the container. \`title\`, \`open\` / \`defaultOpen\` (the header toggles it), and \`status\`
  ("working" or "done") with \`elapsed\` or \`startedAt\` for the working line.
- **ChainOfThoughtStep**: \`status\` pending, active or done; an \`icon\`, a \`label\`, an optional monospace \`query\`, a
  \`count\`, and a \`sources\` row (usually a **SourceStack**). The rail stops at the last step by itself.
- **SourceStack**: overlapping site-icon chips.
- **WorkingIndicator**: the working line on its own.

Done steps read muted and the active step reads in full. It is presentational: append a step as your agent
produces it and mark the previous one done.`,
      },
    },
  },
  decorators: [(S) => <div style={{ width: 560, maxWidth: '100%', padding: 24, boxSizing: 'border-box' }}><S /></div>],
  args: { title: 'Ran 3 searches' },
} satisfies Meta<typeof ChainOfThought>;

export default meta;
type Story = StoryObj<typeof meta>;

const steps = (last: 'active' | 'done' = 'active') => (
  <>
    <ChainOfThoughtStep icon={IconBulb} label="Searching for what teams pay for" count="5 results" sources={<SourceStack sources={SOURCES} />} onSourcesClick={() => {}} />
    <ChainOfThoughtStep icon={IconBrandX} label="Searched X for" query="design system pricing" count="7 posts" />
    <ChainOfThoughtStep icon={IconBrandReddit} label="Searched Reddit for" query="r/reactjs worth paying for" count="12 threads" />
    <ChainOfThoughtStep status={last} icon={IconFileText} label="Reading the strongest three threads" />
  </>
);

export const Working: Story = {
  args: { status: 'working', elapsed: 6.5, children: steps() },
};

export const Finished: Story = {
  args: { status: 'done', elapsed: 11.2, children: steps('done') },
};

export const Collapsed: Story = {
  args: { defaultOpen: false, status: 'done', elapsed: 11.2, children: steps('done') },
};

export const StepStates: Story = {
  name: 'Step states (pending, active, done)',
  render: () => (
    <ChainOfThought title="Step states">
      <ChainOfThoughtStep status="done" label="Searched X for" query="design system pricing" count="7 posts" sources={<SourceStack sources={SOURCES} />} />
      <ChainOfThoughtStep status="active" label="Searched Reddit for" query="r/reactjs worth paying for" count="12 threads" sources={<SourceStack sources={SOURCES.slice(0, 3)} />} />
      <ChainOfThoughtStep status="pending" label="Reading the strongest three threads" sources={<SourceStack sources={SOURCES.slice(0, 2)} />} />
    </ChainOfThought>
  ),
};

export const SourceStacks: Story = {
  name: 'Source stack (3, 4, 5)',
  render: () => {
    const all = [...SOURCES, { label: 'Notion', icon: IconBrandNotion }];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[3, 4, 5].map((n) => <SourceStack key={n} sources={all.slice(0, n)} />)}
      </div>
    );
  },
};

export const Dark: Story = {
  args: { status: 'working', elapsed: 6.5, children: steps() },
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24, borderRadius: 16 }}><S /></div>],
};

/** A simulated agent run: steps stream in, the previous one turns done, the timer counts up, then it finishes. */
function LiveRun() {
  // each step arrives without results, works for `ms`, then its results land and the next step starts
  const SCRIPT = [
    { icon: IconBulb, label: 'Searching for what teams pay for', count: '5 results', sources: SOURCES, ms: 1500 },
    { icon: IconBrandX, label: 'Searched X for', query: 'design system pricing', count: '7 posts', ms: 1900 },
    { icon: IconBrandReddit, label: 'Searched Reddit for', query: 'r/reactjs worth paying for', count: '12 threads', ms: 2300 },
    { icon: IconFileText, label: 'Reading the strongest three threads', ms: 2600 },
  ];
  const [run, setRun] = React.useState(0);
  const [shown, setShown] = React.useState(0);
  const [landed, setLanded] = React.useState(0);
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [finishedIn, setFinishedIn] = React.useState<number | undefined>();
  React.useEffect(() => {
    const start = Date.now();
    setShown(0); setLanded(0); setFinishedIn(undefined); setStartedAt(start);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 700;
    SCRIPT.forEach((s, i) => {
      timers.push(setTimeout(() => setShown(i + 1), at));
      at += s.ms;
      timers.push(setTimeout(() => setLanded(i + 1), at));
      at += 450;
    });
    timers.push(setTimeout(() => setFinishedIn((Date.now() - start) / 1000), at - 200));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const done = finishedIn != null;
  return (
    <div>
      <ChainOfThought title={done ? `Ran ${SCRIPT.filter((s) => s.query).length + 1} searches` : 'Researching'} status={done ? 'done' : 'working'} startedAt={startedAt} elapsed={finishedIn}>
        {SCRIPT.slice(0, shown).map((s, i) => (
          <ChainOfThoughtStep
            key={`${run}-${s.label}`}
            status={!done && i === shown - 1 && landed < shown ? 'active' : 'done'}
            icon={s.icon}
            label={s.label}
            query={s.query}
            count={i < landed ? s.count : undefined}
            sources={i < landed && s.sources ? <SourceStack sources={s.sources} /> : undefined}
            onSourcesClick={s.sources ? () => {} : undefined}
          />
        ))}
      </ChainOfThought>
      <button type="button" onClick={() => setRun((n) => n + 1)} style={{ marginTop: 16, font: '500 13px var(--font-sans)', padding: '6px 12px', border: '1px solid var(--color-border-default)', borderRadius: 8, background: 'var(--color-bg-surface)', color: 'var(--color-fg-default)', cursor: 'pointer' }}>
        Replay
      </button>
    </div>
  );
}

export const Live: Story = {
  render: () => <LiveRun />,
  parameters: { docs: { description: { story: 'A simulated run: each step arrives and works, its results land (the count ticks up, the sources fan out), the next step starts, and finishing sweeps the rail down to the check. Press Replay to watch again.' } } },
};
