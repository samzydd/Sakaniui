import type { Meta, StoryObj } from '@storybook/react';
import { AiMessage } from './AiMessage';

const meta = {
  title: 'AI/AI Message',
  component: AiMessage,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `One turn of an AI conversation. Matches the Figma "AI Message" set: Role Assistant (Streaming or Done) or User.

- **assistant**: full-width text beside an ember-ringed avatar, with copy, regenerate and feedback actions once done.
- **user**: a right-aligned bubble.
- \`streaming\` hides the actions and ends the text with a slate caret. Pass several children for paragraphs.` } } },
  decorators: [(S) => <div style={{ width: 560, maxWidth: '100%', padding: 24, boxSizing: 'border-box' }}><S /></div>],
  args: { role: 'assistant' },
} satisfies Meta<typeof AiMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Done: Story = {
  args: { children: [<p key="a">Your pipeline looks healthy. Three deals moved forward this week, and two of them are worth a closer look before Friday:</p>, <p key="b">1. Acme Corp, silent since the proposal went out on Monday.</p>, <p key="c">2. Globex, asked for a revised quote on the annual plan.</p>] },
};
export const Streaming: Story = { args: { streaming: true, children: 'Your pipeline looks healthy. Three deals moved forward this week, and two of' } };
export const User: Story = { args: { role: 'user', children: 'Which deals need a follow-up this week?' } };
export const WithoutActions: Story = { args: { actions: false, children: 'A reply with no action row.' } };
