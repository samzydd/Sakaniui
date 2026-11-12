import type { Meta, StoryObj } from '@storybook/react';
import { AiChatBlock } from './AiChatBlock';

const meta = {
  title: 'Blocks/AI/AI Chat',
  component: AiChatBlock,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: `The AI chat screen: a sidebar built from the Sidebar parts, a thread of AiMessage, ReasoningTrace, ToolCall and SuggestionChip, and the PromptComposer docked at the bottom. A COMPOSITION EXAMPLE: copy it and edit.

It is live: send a message and it plays a reply (thinking, a tool call, text arriving) so the streaming states show. Replace \`runDemoReply\` with your model's stream.` } },
    layout: 'fullscreen',
  },
  decorators: [(S) => <div style={{ width: '100vw', height: '100vh' }}><S /></div>],
} satisfies Meta<typeof AiChatBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
