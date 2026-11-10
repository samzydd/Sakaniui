import type { Meta, StoryObj } from '@storybook/react';
import { AttachmentChip } from './AttachmentChip';

const meta = {
  title: 'AI/Attachment Chip',
  component: AttachmentChip,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `A file or image attached to a prompt. Matches the Figma "Attachment Chip" set: File, Image, Uploading, Error.

Uploading shows a metal ring and a metal progress line (\`progress\`, 0-100). Pass \`onRemove\` for the x.` } } },
  decorators: [(S) => <div style={{ padding: 24 }}><S /></div>],
  args: { name: 'q3-report.pdf', meta: 'PDF · 2.4 MB', onRemove: () => {} },
} satisfies Meta<typeof AttachmentChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const File: Story = {};
export const Image: Story = { args: { type: 'image', name: 'product-shot.png', meta: 'PNG · 840 KB' } };
export const Uploading: Story = { args: { type: 'uploading', meta: undefined, progress: 64 } };
export const Error: Story = { args: { type: 'error', meta: undefined } };
