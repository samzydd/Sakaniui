import type { Meta, StoryObj } from '@storybook/react';
import { AiWelcomeBlock } from './AiWelcomeBlock';

const meta = {
  title: 'Blocks/AI/AI Welcome',
  component: AiWelcomeBlock,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `The AI empty screen: the same sidebar, a greeting with the ChatOrb, the PromptComposer with its options row, and three recent-work cards. A COMPOSITION EXAMPLE: copy it and edit.` } }, layout: 'fullscreen' },
  decorators: [(S) => <div style={{ width: '100vw', height: '100vh' }}><S /></div>],
} satisfies Meta<typeof AiWelcomeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
