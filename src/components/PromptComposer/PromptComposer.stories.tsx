import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PromptComposer } from './PromptComposer';
import { AttachmentChip } from '../AttachmentChip';

const meta = {
  title: 'AI/Prompt Composer',
  component: PromptComposer,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `The prompt box of an AI product. Matches the Figma "AI Prompt Composer" set: Empty, Typing, Streaming, Attached.

The field grows with the text up to \`maxRows\` (8). Enter sends, Shift+Enter breaks the line. While \`status="streaming"\` send becomes Stop. A metal border draws in on focus. Chips go in \`attachments\`; the model picker and other controls go in \`actions\` or in a row under the box.` } } },
  decorators: [(S) => <div style={{ width: 520, maxWidth: '100%', padding: 24, boxSizing: 'border-box' }}><S /></div>],
  args: { onAttach: () => {}, onVoice: () => {} },
} satisfies Meta<typeof PromptComposer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Typing: Story = { args: { defaultValue: 'Plan a follow-up email to Acme about the revised quote', autoFocus: true } };
export const Streaming: Story = { args: { status: 'streaming', placeholder: 'Reply to Sakani…', onStop: () => {} } };
export const Attached: Story = {
  args: {
    placeholder: 'Ask about these files',
    attachments: <><AttachmentChip name="q3-report.pdf" meta="PDF · 2.4 MB" onRemove={() => {}} /><AttachmentChip type="image" name="product-shot.png" meta="PNG · 840 KB" onRemove={() => {}} /></>,
  },
};
export const Interactive: Story = {
  render: (args) => {
    const [status, setStatus] = React.useState<'idle' | 'streaming'>('idle');
    return <PromptComposer {...args} status={status} onSubmit={() => { setStatus('streaming'); window.setTimeout(() => setStatus('idle'), 2500); }} onStop={() => setStatus('idle')} />;
  },
};
