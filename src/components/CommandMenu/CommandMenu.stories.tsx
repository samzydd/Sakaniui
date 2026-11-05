import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CommandMenu, CommandMenuTrigger, CommandMenuAnswer } from './CommandMenu';
import type { CommandMenuFilter, CommandMenuGroup } from './CommandMenu';
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
import { IconLayoutDashboard } from '../../icons/outline/layout-dashboard';

const SCOPES = [
  { value: 'all', label: 'All' }, { value: 'pages', label: 'Pages' }, { value: 'people', label: 'People' },
  { value: 'files', label: 'Files' }, { value: 'actions', label: 'Actions' },
];

const GROUPS: CommandMenuGroup[] = [
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

const meta = {
  title: 'Composite/Command Menu',
  component: CommandMenu,
  tags: ['autodocs'],
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
    renderPreview: (item) => item.type !== 'person' ? null : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size="lg" src={item.avatar?.src} alt={item.avatar?.alt ?? item.label} initials={item.avatar?.initials} />
          <div><div style={{ font: '600 16px/22px var(--font-sans)' }}>{item.label}</div><div style={{ font: '500 13px/18px var(--font-sans)', color: 'var(--color-fg-muted)' }}>{item.description}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}><Badge variant={item.meta === 'Online' ? 'success' : 'neutral'}>{item.meta}</Badge><Badge variant="neutral">Lagos · 14:32</Badge></div>
        <div style={{ font: '500 13px/18px var(--font-sans)', color: 'var(--color-fg-muted)', display: 'grid', gap: 8 }}>
          <span>{item.label.split(' ')[0].toLowerCase()}@acme.com</span><span>Design team · 6 people</span><span>Usually replies in 1 hour</span>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}><Button size="sm">Message</Button><Button size="sm" variant="secondary">View profile</Button></div>
      </div>
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
