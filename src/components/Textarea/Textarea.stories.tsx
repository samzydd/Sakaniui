import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';
import { IconButton } from '../IconButton';
import { IconPlus } from '../../icons/outline/plus';
import { IconMicrophone } from '../../icons/outline/microphone';
import { IconArrowUp } from '../../icons/outline/arrow-up';

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Multi-line text input. Matches Figma "Textarea" parent component:
State (Default|Focus|Error|Disabled|Filled), Title/Description toggles.

Exact Figma spec:
- Field: vertical, 6px gap
- Label: label/md (14px/500, fg/default)
- Box: bg/surface, border/default 1px, radius-md, padding 10/14, min-height 84px
- Value/placeholder: body/sm (14px/500, fg/subtle placeholder / fg/default value)
- Description: body/xs (13px, fg/muted)` } } },
  args: { placeholder: 'Enter text…' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** autoFocus so the state renders without needing a click -- border-strong
 *  at 1.5px, no shadow, matching Input's own focus-within treatment. */
export const Focus: Story = { args: { label: 'Message', autoFocus: true } };
export const WithLabel: Story = { args: { label: 'Message', description: 'Max 500 characters.' } };
export const Filled: Story = { args: { label: 'Message', defaultValue: 'Entered text goes here. It can span multiple lines.' } };
export const Error: Story = { args: { label: 'Message', error: 'This field is required.' } };
export const Disabled: Story = { args: { label: 'Message', placeholder: 'Disabled', disabled: true } };

/** Dark mode — the .dark class flips the semantic token layer; no component changes needed. */
export const DarkMode: Story = {
  decorators: [(S) => (
    <div className="dark" style={{ padding: 24, background: 'var(--color-bg-canvas)' }}>
      <S />
    </div>
  )],
};


/* ---- variant="ai": the prompt box ------------------------------------------------------------------------------ */

const addPill = <IconButton icon={IconPlus} variant="secondary" size="sm" aria-label="Add" style={{ width: 44, height: 36, borderRadius: 999, boxShadow: 'none', background: 'var(--color-bg-muted)', borderColor: 'transparent' }} />;

/** The "Ask anything" box from an AI product: the field on top, a "+" on the left and a mic on the right underneath. The mic becomes a send button once there is text. */
function PromptTextarea(props: Partial<React.ComponentProps<typeof Textarea>>) {
  const [value, setValue] = React.useState('');
  const hasText = value.trim().length > 0;
  return (
    <div style={{ width: 720, maxWidth: '100%' }}>
      <Textarea
        variant="ai"
        placeholder="Ask anything"
        aria-label="Ask anything"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        leading={addPill}
        trailing={hasText
          ? <IconButton icon={IconArrowUp} variant="primary" size="sm" aria-label="Send" style={{ borderRadius: 999 }} />
          : <IconButton icon={IconMicrophone} variant="ghost" size="sm" aria-label="Use the microphone" style={{ borderRadius: 999, boxShadow: 'none' }} />}
        {...props}
      />
    </div>
  );
}

/** The prompt box of an AI product. A light sweeps once around the border every 2.5s while it is idle (and once each time you click in).
 *  It grows with what you type, up to `maxRows` lines, then scrolls. `glow="focus"` sweeps only on focus and `glow="off"` draws none. Reduced motion draws none. */
export const AI: Story = {
  name: 'AI',
  parameters: { layout: 'padded' },
  render: () => <div style={{ padding: 40, display: 'grid', placeItems: 'center' }}><PromptTextarea /></div>,
};

export const AIDark: Story = {
  name: 'AI dark',
  render: () => <div className="dark" style={{ padding: 40, display: 'grid', placeItems: 'center', background: 'var(--color-bg-canvas)', minHeight: 260 }}><PromptTextarea /></div>,
};

export const AIGrowing: Story = {
  name: 'AI growing',
  render: () => <div style={{ padding: 40, display: 'grid', placeItems: 'center' }}><PromptTextarea maxRows={5} defaultValue={'Plan a three day trip to Lisbon.\nI like food markets and old trams.\nKeep the budget modest, and tell me what to book ahead.'} /></div>,
};

export const AIGlowModes: Story = {
  name: 'AI glow modes',
  render: () => (
    <div style={{ padding: 40, display: 'grid', gap: 20, justifyItems: 'center' }}>
      <PromptTextarea glow="pulse" placeholder="glow=pulse (default)" />
      <PromptTextarea glow="focus" placeholder="glow=focus" />
      <PromptTextarea glow="off" placeholder="glow=off" />
    </div>
  ),
};

export const AIError: Story = {
  name: 'AI error and disabled',
  render: () => (
    <div style={{ padding: 40, display: 'grid', gap: 20, justifyItems: 'center' }}>
      <PromptTextarea error="That prompt is too long." />
      <PromptTextarea disabled placeholder="Ask anything (disabled)" />
    </div>
  ),
};
