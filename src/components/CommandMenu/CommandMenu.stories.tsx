import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CommandMenu, CommandMenuTrigger, CommandMenuAnswer } from './CommandMenu';
import type { CommandMenuFilter, CommandMenuGroup, CommandMenuItem } from './CommandMenu';
import type { IconComponent } from '../../icons/types';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { ChainOfThought, ChainOfThoughtStep } from '../ChainOfThought';
import { Avatar } from '../Avatar';
import amaraPhoto from '../../assets/avatars/r1-owner-kende-attila.jpg';
import kamalPhoto from '../../assets/avatars/r2-owner-orosz-boldizsar.jpg';
import samPhoto from '../../assets/avatars/activity-amara-kalu.jpg';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { IconCreditCard } from '../../icons/outline/credit-card';
import { IconSettings } from '../../icons/outline/settings';
import { IconSearch } from '../../icons/outline/search';
import { IconPlus } from '../../icons/outline/plus';
import { IconUsers } from '../../icons/outline/users';
import { IconMoon } from '../../icons/outline/moon';
import { IconLock } from '../../icons/outline/lock';
import { IconBell } from '../../icons/outline/bell';
import { IconRefresh } from '../../icons/outline/refresh';
import { IconFilePlus } from '../../icons/outline/file-plus';
import { IconFileText } from '../../icons/outline/file-text';
import { IconFolder } from '../../icons/outline/folder';
import { IconTextSpellcheck } from '../../icons/outline/text-spellcheck';
import { IconX } from '../../icons/outline/x';
import { IconMail } from '../../icons/outline/mail';
import { IconUsersGroup } from '../../icons/outline/users-group';
import { IconClock } from '../../icons/outline/clock';
import { IconMessageCircle } from '../../icons/outline/message-circle';
import { IconLayoutDashboard } from '../../icons/outline/layout-dashboard';

const SCOPES = [
  { value: 'all', label: 'All' }, { value: 'pages', label: 'Pages' }, { value: 'people', label: 'People' },
  { value: 'files', label: 'Files' }, { value: 'actions', label: 'Actions' },
];

export const GROUPS: CommandMenuGroup[] = [
  {
    id: 'recent', label: 'Recent',
    items: [
      { id: 'q4', type: 'file', label: 'Q4 revenue report.pdf', description: 'Finance / Reports', meta: 'Edited 2h ago', tags: ['Files'] },
      { id: 'amara', type: 'person', label: 'Amara Chen', description: 'Product designer · Design', meta: 'Online', avatar: { src: amaraPhoto, initials: 'AC', status: 'online' }, tags: ['People', 'team: Design'] },
      { id: 'billing', type: 'page', label: 'Billing settings', description: 'Workspace / Settings', meta: 'Page', icon: IconCreditCard },
    ],
  },
  {
    id: 'pages', label: 'Pages', action: { label: 'See all', onClick: () => {} },
    items: [
      { id: 'account', type: 'page', label: 'Settings → Account', description: 'Workspace / Settings', meta: 'Page', icon: IconSettings, keywords: ['profile'] },
      { id: 'security', type: 'page', label: 'Settings → Security', description: 'Workspace / Settings', meta: 'Page', icon: IconLock, keywords: ['password', '2fa'] },
      { id: 'notifications', type: 'page', label: 'Settings → Notifications', description: 'Workspace / Settings', meta: 'Page', icon: IconBell },
    ],
  },
  {
    id: 'people', label: 'People · Design',
    items: [
      { id: 'kamal', type: 'person', label: 'Kamal Reyes', description: 'Design lead', meta: 'Away', avatar: { src: kamalPhoto, initials: 'KR', status: 'away' }, tags: ['People', 'team: Design'] },
      { id: 'sam', type: 'person', label: 'Sam Okoye', description: 'Brand designer', meta: 'Online', avatar: { src: samPhoto, initials: 'SO', status: 'online' }, tags: ['People', 'team: Design'] },
    ],
  },
  {
    id: 'actions', label: 'Suggested',
    items: [
      { id: 'create', type: 'action', label: 'Create project', icon: IconPlus, shortcut: ['⌘', 'N'] },
      { id: 'invite', type: 'action', label: 'Invite a teammate', icon: IconUsers, shortcut: ['⌘', 'I'] },
      { id: 'dark', type: 'action', label: 'Switch to dark mode', icon: IconMoon, shortcut: ['⌘', 'J'] },
      { id: 'reset', type: 'action', label: 'Reset settings to default', icon: IconRefresh, meta: 'Action' },
    ],
  },
];

const SIMPLE: CommandMenuGroup[] = [
  {
    id: 'suggestions', label: 'Suggestions',
    items: [
      { id: 'dash', type: 'action', label: 'Go to dashboard', icon: IconLayoutDashboard, shortcut: ['⌘', 'D'] },
      { id: 'settings', type: 'action', label: 'Open settings', icon: IconSettings, shortcut: ['⌘', ','] },
      { id: 'newfile', type: 'action', label: 'New file', icon: IconFilePlus, shortcut: ['⌘', 'N'] },
    ],
  },
];

const FALLBACK: CommandMenuGroup[] = [
  {
    id: 'try', label: 'Try instead',
    items: [
      { id: 'everywhere', type: 'action', label: 'Search everywhere for “invoice”', description: '12 results in Pages, Files and Actions', icon: IconSearch },
      { id: 'ai', type: 'ai', label: 'Ask AI “invoce”', description: 'It can look through your docs, data and the web', meta: 'Ask AI', shortcut: ['⌘', '↵'] },
      { id: 'create-file', type: 'action', label: 'Create a file named “invoce”', description: 'In Finance / Reports', icon: IconFilePlus },
    ],
  },
];

/* The detail pane from Figma "Command Preview": who, tags, a divider, details, recent activity, and two actions pinned to the bottom. */
const previewText = { font: '500 12px/16px var(--font-sans)', color: 'var(--color-fg-muted)' } as const;
const previewButton = { flex: 1, height: 32, padding: '0 12px', fontSize: 14, lineHeight: '20px' } as const; // Figma's small Button is 32px high
function PersonPreview({ item }: { item: CommandMenuItem }) {
  const first = item.label.split(' ')[0].toLowerCase();
  const detail = (Icon: IconComponent, text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={14} strokeWidth={iconStrokeWidth(14)} style={{ flexShrink: 0, color: 'var(--color-fg-subtle)' }} aria-hidden="true" />
      <span style={previewText}>{text}</span>
    </div>
  );
  const activity = (Icon: IconComponent, text: string, ago: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={14} strokeWidth={iconStrokeWidth(14)} style={{ flexShrink: 0, color: 'var(--color-fg-subtle)' }} aria-hidden="true" />
      <span style={{ ...previewText, color: 'var(--color-fg-default)' }}>{text}</span>
      <span style={previewText}>{ago}</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, minHeight: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size="lg" src={item.avatar?.src} alt={item.avatar?.alt ?? item.label} initials={item.avatar?.initials} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: '500 16px/22px var(--font-sans)', color: 'var(--color-fg-default)' }}>{item.label}</span>
            <span style={previewText}>{item.description}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Figma's Badge is 20px high (a 16px line); the library's is 16px, so the label carries its own line height here */}
          <Badge variant={item.meta === 'Online' ? 'success' : 'neutral'}><span style={{ lineHeight: '16px' }}>{item.meta}</span></Badge>
          <Badge variant="neutral"><span style={{ lineHeight: '16px' }}>Lagos · 14:32</span></Badge>
        </div>
        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {detail(IconMail, `${first}@acme.com`)}
          {detail(IconUsersGroup, 'Design team · 6 people')}
          {detail(IconClock, 'Usually replies in 1 hour')}
        </div>
        <span style={{ font: '600 11px/16px var(--font-sans)', color: 'var(--color-fg-muted)' }}>Recent</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activity(IconFileText, 'Edited Checkout redesign', '2h')}
          {activity(IconMessageCircle, 'Commented on Q4 roadmap', '5h')}
        </div>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* The Ask AI run: nothing until you ask, then it thinks and writes     */
/* ------------------------------------------------------------------ */
const askSteps = (question = '') => [
  { icon: IconSearch, label: 'Searched the docs for', query: question.replace(/[?.!]+$/, '').slice(0, 28) || 'your question', count: '3 pages', ms: 800 },
  { icon: IconFileText, label: 'Read Theming', ms: 650 },
  { icon: IconFileText, label: 'Read Tokens', ms: 650 },
  { icon: IconMessageCircle, label: 'Writing the answer', ms: 550 },
];
const answerFor = (question = '') => (/dark|theme|token/i.test(question) ? ANSWER_TEXT : 'I did not find a page that answers that directly, but these are the closest: they cover the basics of how SakaniUI is set up. Open one to read on, or ask me a follow-up and I will narrow it down.');
const ANSWER_TEXT = 'Wrap your app in the theme provider and toggle the dark class on <html>. Every component reads the semantic tokens, so nothing else changes. For a smooth switch, wrap the toggle in document.startViewTransition().';
const SUGGESTED = ['How do I add dark mode?', 'How do I change the theme tokens?', 'What changed in the latest release?'];

/** Plays one run: each step arrives and works, its result lands, the sweep finishes the rail, the Chain of Thought folds shut
 *  and the answer card arrives (`answered`) and writes itself in; `streamed` is true once the text is complete.
 *  `runKey` starts it (a new key replays); null resets it, so nothing shows until something is asked. */
export function useAskRun(runKey: number | string | null) {
  const [shown, setShown] = React.useState(0);
  const [landed, setLanded] = React.useState(0);
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [finishedIn, setFinishedIn] = React.useState<number | undefined>();
  const [answered, setAnswered] = React.useState(false);
  const [streamed, setStreamed] = React.useState(false);
  React.useEffect(() => {
    setShown(0); setLanded(0); setFinishedIn(undefined); setAnswered(false); setStreamed(false);
    if (runKey == null) return;
    const start = Date.now();
    setStartedAt(start);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 250;
    askSteps().forEach((st, i) => {
      timers.push(setTimeout(() => setShown(i + 1), at));
      at += st.ms;
      timers.push(setTimeout(() => setLanded(i + 1), at));
      at += 200;
    });
    timers.push(setTimeout(() => setFinishedIn((Date.now() - start) / 1000), at));
    // the finish sweep runs down the rail first; then it folds shut and the answer card arrives
    timers.push(setTimeout(() => setAnswered(true), at + 900));
    return () => timers.forEach(clearTimeout);
  }, [runKey]);
  return { running: runKey != null, shown, landed, startedAt, finishedIn, answered, streamed, markStreamed: () => setStreamed(true) };
}
export type AskRun = ReturnType<typeof useAskRun>;

/** The menu's `answer` slot for a run: the live Chain of Thought, then (once `answered`) the answer card under it, writing itself in. */
export function AskAnswer({ run, question }: { run: AskRun; question?: string }) {
  const done = run.finishedIn != null;
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => { setOpen(!run.answered); }, [run.answered]);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <ChainOfThought title={done ? 'Read 3 docs pages' : 'Thinking'} open={open} onOpenChange={setOpen} status={done ? 'done' : 'working'} startedAt={run.startedAt} elapsed={run.finishedIn}>
        {askSteps(question).slice(0, run.shown).map((st, i) => (
          <ChainOfThoughtStep
            key={st.label}
            status={!done && i === run.shown - 1 && run.landed < run.shown ? 'active' : 'done'}
            icon={st.icon} label={st.label} query={st.query} count={i < run.landed ? st.count : undefined}
          />
        ))}
      </ChainOfThought>
      {run.answered && (
        <CommandMenuAnswer stream onStreamEnd={run.markStreamed} status={`Thought for ${(run.finishedIn ?? 0).toFixed(1)}s`} onCopy={() => {}} onFollowUp={() => {}} onOpenInChat={() => {}} sources={[{ label: 'Theming' }, { label: 'Tokens' }, { label: 'Installation' }]}>
          {answerFor(question)}
        </CommandMenuAnswer>
      )}
    </div>
  );
}

const AI_SCOPES = [{ value: 'all', label: 'All', count: null }, { value: 'ai', label: 'Ask AI', count: null }, { value: 'docs', label: 'Docs', count: 3 }];
const RELATED: CommandMenuGroup[] = [{ id: 'related', label: 'Related', items: [
  { id: 'theming', type: 'page', label: 'Theming', description: 'Docs / Getting started', meta: 'Docs', icon: IconFileText },
  { id: 'tokens', type: 'page', label: 'Tokens', description: 'Docs / Getting started', meta: 'Docs', icon: IconFileText },
] }];

/** The whole flow in one controlled menu. In the Ask AI scope the field starts empty and shows suggested questions, and nothing
 *  is answered until you ask: press ↵ on what you typed (or on a suggestion), click a suggestion, or press ⌘↵ anywhere.
 *  Then it thinks, writes the answer in, and lists the related pages. Change the question and the answer goes, because the
 *  answer belongs to the question in the box. */
export function LiveAskAI({ open, onOpenChange, groups = GROUPS, defaultScope = 'all' }: { open: boolean; onOpenChange: (o: boolean) => void; groups?: CommandMenuGroup[]; defaultScope?: string }) {
  const [query, setQuery] = React.useState('');
  const [scope, setScope] = React.useState(defaultScope);
  const [asked, setAsked] = React.useState<string | null>(null);
  const [runKey, setRunKey] = React.useState<number | null>(null);
  const run = useAskRun(runKey);
  const ask = (q: string) => {
    const text = q.trim();
    if (!text) { setScope('ai'); return; }
    setQuery(text); setAsked(text); setScope('ai'); setRunKey((n) => (n ?? 0) + 1);
  };
  React.useEffect(() => { if (!open) { setRunKey(null); setAsked(null); setScope(defaultScope); setQuery(''); } }, [open, defaultScope]);
  React.useEffect(() => { if (asked !== null && query.trim() !== asked) { setAsked(null); setRunKey(null); } }, [query, asked]);
  const inAI = scope === 'ai';
  const answering = inAI && asked !== null;
  const q = query.trim();
  const askRow: CommandMenuGroup = { id: 'ask', label: 'Ask', items: [{ id: 'askai', type: 'ai', label: q ? `Ask AI “${q}”` : 'Ask AI a question', description: 'It can look through your docs, data and the web', meta: 'Ask AI', shortcut: ['⌘', '↵'] }] };
  const list: CommandMenuGroup[] = answering
    ? (run.streamed ? RELATED : [])
    : inAI
      ? (q ? [askRow] : [{ id: 'suggested', label: 'Suggested questions', items: SUGGESTED.map((s) => ({ id: `sq:${s}`, type: 'ai' as const, label: s, meta: 'Ask AI' })) }])
      : [...groups, askRow];
  return (
    <CommandMenu
      open={open} onOpenChange={onOpenChange} groups={list} scopes={AI_SCOPES} scope={scope}
      onScopeChange={setScope} query={query} onQueryChange={setQuery}
      filter={!inAI} workspace="Acme workspace" placeholder={inAI ? 'Ask anything about SakaniUI…' : undefined}
      onSelect={(i) => { if (i.type === 'ai') ask(i.id.startsWith('sq:') ? i.label : query); }}
      closeOnSelect={false} onAskAI={ask}
      busy={answering && !run.streamed}
      answer={answering ? <AskAnswer run={run} question={asked ?? ''} /> : undefined}
    />
  );
}

const meta = {
  title: 'Composite/Command Menu',
  component: CommandMenu,
  tags: ['autodocs'],
  excludeStories: ['useAskRun', 'AskAnswer', 'LiveAskAI', 'GROUPS'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, iframeHeight: 720 },
      description: {
        component: `A ⌘K search and command palette. Matches the Figma "Command Menu" page: a field, scope tabs, grouped results with
the matched letters in the strong weight, a footer of key hints, and the states a real search needs.

- **Data.** Pass \`groups\` of \`items\` and handle \`onSelect\`. By default the menu filters them as you type (label, description, \`keywords\`,
  the scope and your filter tokens); pass \`filter={false}\` to show exactly what you give it (results from a server).
- **Keyboard.** ⌘K (Ctrl K) opens it, ↑ ↓ move over one gliding highlight, ↵ chooses, ⌘↵ asks AI (with \`onAskAI\`), Tab switches scope,
  ⌫ in an empty field removes the last token, and esc clears the query and then closes.
- **States.** \`state="loading"\`, \`state="error"\`, and no results (with \`suggestions\` and \`fallbackGroups\`).
- **Slots.** \`answer\` (a \`CommandMenuAnswer\`, a Chain of Thought) and \`renderPreview\` for a detail pane.
- **Variants.** \`variant="simple"\` is the plain version: the field, one group and the key hints.
- **Surface.** It reads the Surface tokens, so it re-skins in Glass and Liquid areas.

The story below each heading is in its own frame; press Esc to clear and close the live ones.`,
      },
    },
  },
  args: { groups: GROUPS, open: true, onOpenChange: () => {} },
} satisfies Meta<typeof CommandMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function LiveDemo() {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState('');
  const [filters, setFilters] = React.useState<CommandMenuFilter[]>([]);
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', fontFamily: 'var(--font-sans)', color: 'var(--color-fg-default)' }}>
      <CommandMenuTrigger onClick={() => setOpen(true)} />
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-fg-muted)' }}>
        {picked ? <>You chose <strong>{picked}</strong>.</> : <>Press ⌘K (or Ctrl K), or click the pill.</>}
      </p>
      <CommandMenu
        open={open} onOpenChange={setOpen} groups={GROUPS} scopes={SCOPES}
        filters={filters} onFiltersChange={setFilters} filterKeys={['team']}
        workspace="Acme workspace" onSelect={(i) => setPicked(i.label)} onAskAI={(q) => setPicked(`Ask AI “${q}”`)}
      />
    </div>
  );
}

/** Opens with the trigger or ⌘K. Try "sett", "design", `team:design` + space, Tab, and the arrow keys. */
export const Live: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 640 } } },
  render: () => <LiveDemo />,
};

export const Default: Story = { args: { scopes: SCOPES, workspace: 'Acme workspace', onAskAI: () => {} } };

/** Plain as it gets: the field, one group and the key hints. */
export const Simple: Story = { args: { variant: 'simple', groups: SIMPLE, placeholder: 'Type a command or search…' } };

/** Matches are set in the strong weight; each scope shows its count. */
export const Results: Story = { args: { scopes: SCOPES, defaultQuery: 'sett', workspace: 'Acme workspace', onAskAI: () => {} } };

export const Filtered: Story = {
  args: {
    scopes: SCOPES, defaultScope: 'people', defaultQuery: 'am', workspace: 'Acme workspace',
    filters: [{ id: 'people', label: 'People', icon: IconUsers }, { id: 'team', label: 'team: Design', value: 'team: Design' }],
  },
};

export const Preview: Story = {
  args: {
    scopes: SCOPES, defaultScope: 'people', defaultQuery: 'am', workspace: 'Acme workspace',
    renderPreview: (item) => (item.type === 'person' ? <PersonPreview item={item} /> : null),
    // the actions are not part of the cross-fade: they stay where they are while the person above changes
    previewActions: () => (
      <>
        <Button size="sm" style={previewButton}>Message</Button>
        <Button size="sm" variant="secondary" style={previewButton}>View profile</Button>
      </>
    ),
  },
};

export const AskAI: Story = {
  name: 'Ask AI',
  args: {
    scopes: [{ value: 'all', label: 'All', count: null }, { value: 'ai', label: 'Ask AI', count: null }, { value: 'docs', label: 'Docs', count: 3 }],
    scope: 'ai', defaultQuery: 'how do I add dark mode?', filter: false, workspace: 'Acme workspace',
    groups: [{ id: 'related', label: 'Related', items: [
      { id: 'theming', type: 'page', label: 'Theming', description: 'Docs / Getting started', meta: 'Docs', icon: IconFileText },
      { id: 'tokens', type: 'page', label: 'Tokens', description: 'Docs / Getting started', meta: 'Docs', icon: IconFileText },
    ] }],
    answer: (
      <div style={{ display: 'grid', gap: 10 }}>
        <ChainOfThought title="Read 3 docs pages" defaultOpen={false}><ChainOfThoughtStep icon={IconFileText} label="Read Theming" /></ChainOfThought>
        <CommandMenuAnswer status="Answered in 2.4s" onCopy={() => {}} onFollowUp={() => {}} onOpenInChat={() => {}} sources={[{ label: 'Theming' }, { label: 'Tokens' }, { label: 'Installation' }]}>
          Wrap your app in the theme provider and toggle the dark class on &lt;html&gt;. Every component reads the semantic tokens, so nothing else changes.
        </CommandMenuAnswer>
      </div>
    ),
  },
};

function LiveAskAIDemo({ defaultScope = 'all' }: { defaultScope?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', fontFamily: 'var(--font-sans)', color: 'var(--color-fg-default)' }}>
      <CommandMenuTrigger onClick={() => setOpen(true)} />
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-fg-muted)' }}>Press ⌘K, switch to Ask AI, type a question and press ↵ (or pick a suggestion).</p>
      <LiveAskAI open={open} onOpenChange={setOpen} defaultScope={defaultScope} />
    </div>
  );
}

/** Open it, press Tab to reach Ask AI, type a question and press ↵ (or ⌘↵ from any scope). It thinks like a chat reply does: the Chain of Thought works and folds shut, then the answer writes itself in. */
export const LiveAskAIStory: Story = {
  name: 'Live Ask AI',
  parameters: { docs: { story: { inline: false, iframeHeight: 720 } } },
  render: () => <LiveAskAIDemo />,
};

/** The Ask AI scope on its own. The field is empty, so there is no answer, only suggested questions. Pick one, or type your own and press ↵, to watch it think and answer. */
export const AskAIEmpty: Story = {
  name: 'Ask AI empty',
  render: () => {
    const Demo = () => { const [open, setOpen] = React.useState(true); return <LiveAskAI open={open} onOpenChange={setOpen} defaultScope="ai" />; };
    return <Demo />;
  },
};

/** A typo inside a filter: it suggests the fix, offers to remove the filter, and never leaves a dead end. */
export const NoResults: Story = {
  name: 'No results',
  args: {
    scopes: [{ value: 'all', label: 'All', count: 12 }, { value: 'pages', label: 'Pages', count: 4 }, { value: 'people', label: 'People', count: 0 }, { value: 'files', label: 'Files', count: 0 }, { value: 'actions', label: 'Actions', count: 1 }],
    scope: 'files', defaultQuery: 'invoce', workspace: 'Acme workspace', onAskAI: () => {},
    filters: [{ id: 'files', label: 'Files', icon: IconFolder }],
    emptyTitle: 'No files match “invoce”', emptyDescription: 'Check the spelling, or search everywhere instead.',
    suggestions: [{ label: 'Did you mean invoice?', emphasis: 'invoice', icon: IconTextSpellcheck, onSelect: () => {} }, { label: 'Remove the Files filter', emphasis: 'Files', icon: IconX, iconPosition: 'end', onSelect: () => {} }],
    fallbackGroups: FALLBACK,
  },
};

export const Loading: Story = { args: { scopes: SCOPES, defaultQuery: 'q4 rev', state: 'loading', workspace: 'Acme workspace' } };

export const Error: Story = {
  args: {
    scopes: SCOPES, defaultQuery: 'q4 rev', state: 'error', workspace: 'Acme workspace', onRetry: () => {}, onReport: () => {},
    fallbackGroups: [{ ...GROUPS[0], items: GROUPS[0].items.filter((i) => i.id === 'q4' || i.id === 'billing') }],
  },
};

export const Dark: Story = {
  args: { scopes: SCOPES, defaultQuery: 'sett', workspace: 'Acme workspace', onAskAI: () => {} },
  decorators: [(S) => <div className="dark" style={{ minHeight: 640, background: 'var(--color-bg-canvas)' }}><S /></div>],
};

/** Inside a data-surface="glass" area the panel, rows and footer take the glass tokens. */
export const Glass: Story = {
  args: { scopes: SCOPES, workspace: 'Acme workspace', onAskAI: () => {} },
  decorators: [(S) => (
    <div data-surface="glass" style={{ minHeight: 640, background: 'linear-gradient(135deg, #ff9a56, #3b82f6 60%, #7c3aed)' }}><S /></div>
  )],
};

/** The pill that opens it, for a top bar or sidebar. */
export const Trigger: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => <div style={{ padding: 24, width: 320 }}><CommandMenuTrigger /></div>,
};
