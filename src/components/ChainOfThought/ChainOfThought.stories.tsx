import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChainOfThought, ChainOfThoughtStep, SourceStack } from './ChainOfThought';
import { Switch } from '../Switch';
import { SourceLogo } from './SourceLogo';
import { sourceLogo, sourceLogoNames } from './logoIcons';
import { EmojiLightBulb } from '../../emoji/art/light-bulb';
import { EmojiPageFacingUp } from '../../emoji/art/page-facing-up';
import { EmojiMagnifyingGlassTiltedLeft } from '../../emoji/art/magnifying-glass-tilted-left';
import { EmojiBrain } from '../../emoji/art/brain';
import { EmojiMemo } from '../../emoji/art/memo';
import { EmojiNewspaper } from '../../emoji/art/newspaper';

const X = sourceLogo('x'), Reddit = sourceLogo('reddit'), HackerNews = sourceLogo('hackernews'), Google = sourceLogo('google');

const SOURCES = [
  { label: 'Reddit', icon: sourceLogo('reddit') }, { label: 'LinkedIn', icon: sourceLogo('linkedin') },
  { label: 'GitHub', icon: sourceLogo('github') }, { label: 'Product Hunt', icon: sourceLogo('producthunt') },
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
- **WorkingIndicator**: the working line on its own: the Chat Orb (its eyes follow the newest step) and a shimmering "Working" with the time.

Done steps read muted and the active step reads in full. It is presentational: append a step as your agent
produces it and mark the previous one done.`,
      },
    },
  },
  decorators: [(S) => <div style={{ width: 560, maxWidth: '100%', padding: 24, boxSizing: 'border-box' }}><S /></div>],
  args: { title: 'Ran 3 searches', icon: EmojiMagnifyingGlassTiltedLeft },
} satisfies Meta<typeof ChainOfThought>;

export default meta;
type Story = StoryObj<typeof meta>;

const steps = (last: 'active' | 'done' = 'active') => (
  <>
    <ChainOfThoughtStep icon={EmojiLightBulb} label="Searching for what teams pay for" count="5 results" sources={<SourceStack sources={SOURCES} />} onSourcesClick={() => {}} />
    <ChainOfThoughtStep icon={X} label="Searched X for" query="design system pricing" count="7 posts" />
    <ChainOfThoughtStep icon={Reddit} label="Searched Reddit for" query="r/reactjs worth paying for" count="12 threads" />
    <ChainOfThoughtStep status={last} icon={EmojiPageFacingUp} label="Reading the strongest three threads" />
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
      <ChainOfThoughtStep status="done" icon={X} label="Searched X for" query="design system pricing" count="7 posts" sources={<SourceStack sources={SOURCES} />} />
      <ChainOfThoughtStep status="active" icon={Reddit} label="Searched Reddit for" query="r/reactjs worth paying for" count="12 threads" sources={<SourceStack sources={SOURCES.slice(0, 3)} />} />
      <ChainOfThoughtStep status="pending" icon={HackerNews} label="Searching Hacker News for" query="design system" sources={<SourceStack sources={SOURCES.slice(0, 2)} />} />
    </ChainOfThought>
  ),
};

export const SourceStacks: Story = {
  name: 'Source stack (3, 4, 5)',
  render: () => {
    const all = [...SOURCES, { label: 'Notion', icon: sourceLogo('notion') }];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[3, 4, 5].map((n) => <SourceStack key={n} sources={all.slice(0, n)} />)}
      </div>
    );
  },
};

export const Logos: Story = {
  name: 'Source logos (real, in brand colour)',
  parameters: { docs: { description: { story: 'The real logo of the site a result came from, in its brand colour, through `<SourceLogo name="reddit" />` or `sourceLogo(\'reddit\')` for any `icon` prop. Black brands (X, GitHub, Notion, Medium, Wikipedia) draw in the text colour so they stay visible in dark mode.' } } },
  decorators: [(S) => <div style={{ width: 720, maxWidth: '100%', padding: 24, boxSizing: 'border-box' }}><S /></div>],
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
      {sourceLogoNames.map((name) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--color-border-subtle)', borderRadius: 10, font: '500 13px var(--font-sans)', color: 'var(--color-fg-default)' }}>
          <SourceLogo name={name} size={20} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Colourful: Story = {
  name: 'Logos and emoji together',
  parameters: { docs: { description: { story: 'Thinking and reading steps carry an emoji; steps that searched a site carry that site\'s logo; the stack under a step shows where its results came from. A pending step is grey until it starts.' } } },
  render: () => (
    <ChainOfThought title="Researched the market" icon={EmojiBrain} status="done" elapsed={14.8}>
      <ChainOfThoughtStep icon={EmojiLightBulb} label="Planning the search" count="3 angles" />
      <ChainOfThoughtStep icon={Google} label="Searched Google for" query="design system pricing 2026" count="10 results" sources={<SourceStack sources={[{ label: 'Google', icon: Google }, { label: 'Product Hunt', icon: sourceLogo('producthunt') }, { label: 'Medium', icon: sourceLogo('medium') }, { label: 'Wikipedia', icon: sourceLogo('wikipedia') }]} />} onSourcesClick={() => {}} />
      <ChainOfThoughtStep icon={X} label="Searched X for" query="paid design systems" count="7 posts" />
      <ChainOfThoughtStep icon={Reddit} label="Searched Reddit for" query="r/reactjs worth paying for" count="12 threads" sources={<SourceStack sources={[{ label: 'Reddit', icon: Reddit }, { label: 'Hacker News', icon: HackerNews }, { label: 'Stack Overflow', icon: sourceLogo('stackoverflow') }]} />} onSourcesClick={() => {}} />
      <ChainOfThoughtStep icon={EmojiNewspaper} label="Reading the strongest three articles" count="3 pages" />
      <ChainOfThoughtStep icon={EmojiMemo} label="Writing the summary" />
    </ChainOfThought>
  ),
};

export const Dark: Story = {
  args: { status: 'working', elapsed: 6.5, children: steps() },
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24, borderRadius: 16 }}><S /></div>],
};

/** A simulated agent run: steps stream in, the previous one turns done, the timer counts up, then it finishes. */
function LiveRun() {
  // each step arrives without results, works for `ms`, then its results land and the next step starts
  const SCRIPT = [
    { icon: EmojiLightBulb, label: 'Planning the search', count: '3 angles', ms: 1300 },
    { icon: Google, label: 'Searched Google for', query: 'design system pricing 2026', count: '10 results', sources: [{ label: 'Google', icon: Google }, { label: 'Product Hunt', icon: sourceLogo('producthunt') }, { label: 'Medium', icon: sourceLogo('medium') }, { label: 'Wikipedia', icon: sourceLogo('wikipedia') }], ms: 1900 },
    { icon: X, label: 'Searched X for', query: 'paid design systems', count: '7 posts', ms: 1800 },
    { icon: Reddit, label: 'Searched Reddit for', query: 'r/reactjs worth paying for', count: '12 threads', sources: [{ label: 'Reddit', icon: Reddit }, { label: 'Hacker News', icon: HackerNews }, { label: 'Stack Overflow', icon: sourceLogo('stackoverflow') }], ms: 2200 },
    { icon: EmojiPageFacingUp, label: 'Reading the strongest three threads', ms: 2400 },
  ];
  const [run, setRun] = React.useState(0);
  const [dark, setDark] = React.useState(false);
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
    // the same 24px padding in both modes, so flipping the switch does not move anything
    <div className={dark ? 'dark' : undefined} style={{ padding: 24, margin: -24, borderRadius: 16, background: dark ? 'var(--color-bg-canvas)' : 'transparent', transition: 'background-color 300ms ease' }}>
      <ChainOfThought title={done ? `Ran ${SCRIPT.filter((s) => s.query).length} searches` : 'Researching'} icon={EmojiMagnifyingGlassTiltedLeft} status={done ? 'done' : 'working'} startedAt={startedAt} elapsed={finishedIn}>
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
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" onClick={() => setRun((n) => n + 1)} style={{ font: '500 13px var(--font-sans)', padding: '6px 12px', border: '1px solid var(--color-border-default)', borderRadius: 8, background: 'var(--color-bg-surface)', color: 'var(--color-fg-default)', cursor: 'pointer' }}>
          Replay
        </button>
        <Switch label="Dark mode" checked={dark} onChange={(e) => setDark(e.target.checked)} />
      </div>
    </div>
  );
}

export const Live: Story = {
  render: () => <LiveRun />,
  parameters: { docs: { description: { story: 'A simulated run: each step arrives and works, its results land (the count ticks up, the sources fan out), the next step starts, and finishing sweeps the rail down to the check. Press Replay to watch again, and use the Dark mode switch to see the run on a dark surface.' } } },
};
