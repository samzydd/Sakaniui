import type { Meta, StoryObj } from '@storybook/react';
import { ToolCall } from './ToolCall';

const meta = {
  title: 'AI/Tool Call',
  component: ToolCall,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `The row an agent leaves when it calls a tool. Matches the Figma "Tool Call" set: Status Running, Done, Error x Open, Closed.

The header shows a status mark (a turning metal ring, a check, a cross), the call as code, its duration and a chevron; open, it shows Input and Output panels. \`input\` and \`output\` take a string or any value (shown as JSON). Presentational: you set \`status\` and \`duration\` as the call progresses.` } } },
  decorators: [(S) => <div style={{ width: 520, maxWidth: '100%', padding: 24, boxSizing: 'border-box' }}><S /></div>],
  args: { name: 'search_crm', args: '(query="Acme Corp")', input: { query: 'Acme Corp', limit: 5 } },
} satisfies Meta<typeof ToolCall>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = { args: { status: 'running', defaultOpen: true } };
export const Done: Story = { args: { status: 'done', duration: '1.2s', output: { results: 3, top: 'Acme Corp (Enterprise)' } } };
export const DoneOpen: Story = { args: { status: 'done', duration: '1.2s', defaultOpen: true, output: { results: 3, top: 'Acme Corp (Enterprise)' } } };
export const Error: Story = { args: { status: 'error', duration: '30.0s', defaultOpen: true, output: 'ConnectionError: the CRM did not answer in time' } };
