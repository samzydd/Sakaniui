import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { IconButton } from '../IconButton';
import { IconPlus } from '../../icons/outline/plus';
import { IconMicrophone } from '../../icons/outline/microphone';
import { IconArrowUp } from '../../icons/outline/arrow-up';

const meta = {
  title: 'Forms/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Text input with optional label (Title), help text (Description), and
leading/trailing icons. Built to match the Figma "Input" parent component set:
Size (sm|md|lg) x State (Default|Focus|Error|Disabled|Filled)

Exact Figma spec (read from the parent component):
- Field: vertical stack, 6px gap (space-6)
- Label: label/md -> 14px / 500 / fg/default
- Field frame: bg/surface, border/subtle 1px, radius-md (8px)
padding: sm 6/14 · md 10/14 · lg 12/14 (horizontal always 14px)
- Placeholder / value: body/sm -> 14px / 500, fg/subtle / fg/default
- Description: body/xs -> 13px / fg/muted
- Icons: 16px, fg/muted stroke
- Focus: border/focus 1.5px · Error: danger/solid 1.5px · Disabled: bg/subtle` } } },
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
  args: { placeholder: 'Placeholder', size: 'md' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default:  Story = {};
export const WithLabel: Story = { args: { label: 'Email address', placeholder: 'you@example.com' } };
export const WithDescription: Story = { args: { label: 'Email', description: 'We will never share your email.', placeholder: 'you@example.com' } };
export const Filled: Story = { args: { label: 'Email', defaultValue: 'sam@example.com' } };
export const Error: Story = { args: { label: 'Email', defaultValue: 'not-an-email', error: 'Enter a valid email address.' } };
export const Disabled: Story = { args: { label: 'Email', placeholder: 'Disabled', disabled: true } };
export const Small:  Story = { args: { size: 'sm', label: 'Small' } };
export const Large:  Story = { args: { size: 'lg', label: 'Large' } };

/** Dark mode — the .dark class flips the semantic token layer; no component changes needed. */
export const DarkMode: Story = {
  decorators: [(S) => (
    <div className="dark" style={{ padding: 24, background: 'var(--color-bg-canvas)' }}>
      <S />
    </div>
  )],
};


/* ---- variant="ai": the prompt box ------------------------------------------------------------------------------ */

/** Action button sizes from Figma "Input AI": the button is 32 / 36 / 44 high for sm / md / lg and the "+" pill is 8px wider. */
const ACTION = { sm: 32, md: 36, lg: 44 } as const;
const addPill = (size: keyof typeof ACTION) => (
  <IconButton icon={IconPlus} variant="secondary" size="sm" aria-label="Add" style={{ width: ACTION[size] + 8, height: ACTION[size], borderRadius: 999, boxShadow: 'none', background: 'var(--color-bg-muted)', borderColor: 'transparent' }} />
);

/** A prompt box wired the way an AI product does it: a "+" on the left, a mic on the right that becomes a send button once there is text. */
function PromptInput({ size = 'md', ...props }: Partial<React.ComponentProps<typeof Input>>) {
  const [value, setValue] = React.useState('');
  const hasText = value.trim().length > 0;
  const px = ACTION[size];
  return (
    <div style={{ width: 640, maxWidth: '100%' }}>
      <Input
        variant="ai"
        size={size}
        placeholder="Ask anything"
        aria-label="Ask anything"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        leading={addPill(size)}
        trailing={hasText
          ? <IconButton icon={IconArrowUp} variant="primary" size="sm" aria-label="Send" style={{ width: px, height: px, borderRadius: 999 }} />
          : <IconButton icon={IconMicrophone} variant="ghost" size="sm" aria-label="Use the microphone" style={{ width: px, height: px, borderRadius: 999, boxShadow: 'none' }} />}
        {...props}
      />
    </div>
  );
}

/** The prompt box of an AI product. A light sweeps once around the border every 2.5s while it is idle (and once each time you click in);
 *  type and the mic becomes a send button. `glow="focus"` sweeps only on focus and `glow="off"` draws none. Reduced motion draws none. */
export const AI: Story = {
  name: 'AI',
  parameters: { layout: 'padded' },
  render: () => <div style={{ padding: 40, display: 'grid', placeItems: 'center' }}><PromptInput /></div>,
};

export const AISizes: Story = {
  name: 'AI sizes',
  render: () => (
    <div style={{ padding: 40, display: 'grid', gap: 20, justifyItems: 'center' }}>
      <PromptInput size="sm" />
      <PromptInput size="md" />
      <PromptInput size="lg" />
    </div>
  ),
};

export const AIDark: Story = {
  name: 'AI dark',
  render: () => <div className="dark" style={{ padding: 40, display: 'grid', placeItems: 'center', background: 'var(--color-bg-canvas)', minHeight: 220 }}><PromptInput /></div>,
};

/** `glow="focus"` is quiet until you click in; `glow="off"` has no light at all. */
export const AIGlowModes: Story = {
  name: 'AI glow modes',
  render: () => (
    <div style={{ padding: 40, display: 'grid', gap: 20, justifyItems: 'center' }}>
      <PromptInput glow="pulse" placeholder="glow=pulse (default)" />
      <PromptInput glow="focus" placeholder="glow=focus" />
      <PromptInput glow="off" placeholder="glow=off" />
    </div>
  ),
};

export const AIError: Story = {
  name: 'AI error and disabled',
  render: () => (
    <div style={{ padding: 40, display: 'grid', gap: 20, justifyItems: 'center' }}>
      <PromptInput error="That prompt is too long." defaultValue="" />
      <PromptInput disabled placeholder="Ask anything (disabled)" />
    </div>
  ),
};
