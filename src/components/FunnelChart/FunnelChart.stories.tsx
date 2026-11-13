import type { Meta, StoryObj } from '@storybook/react';
import { FunnelChart } from './FunnelChart';

const data = [
  { label: 'Visitors', value: 5400 },
  { label: 'Signups', value: 3800 },
  { label: 'Trials', value: 2600 },
  { label: 'Qualified', value: 1700 },
  { label: 'Negotiation', value: 900 },
  { label: 'Closed won', value: 480 },
];

const meta = {
  title: 'Charts/Funnel Chart',
  component: FunnelChart,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Stages run left to right, narrowing through smooth curved transitions (Figma's "Funnel chart" /
"Funnel chart hover"). A hand-rolled SVG: Recharts' native \`<Funnel>\` only draws a vertical, straight-edged funnel.

- A header gives each stage's value and its share of the start; a chip at every step gives the drop-off.
- \`flow\` streams dots through the band. Each dot is a visitor, and the share that carries on past a step is the share of the
  data that does, so the stream thins where the funnel does. It runs only while on screen, and not at all for reduced motion.
- Hover a stage: it goes full strength, the rest dim, and a card gives its count, share of the start and drop-off.
- The band wipes in on mount. \`loading\` draws the funnel's silhouette with a soft light gliding through it.

Each stage is shaded chart/1 at increasing saturation (first stage palest, last stage full color).` } } },
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] }, flow: { control: 'boolean' }, loading: { control: 'boolean' } },
  args: { data, size: 'md' },
  decorators: [(S) => <div style={{ width: 560 }}><S /></div>],
} satisfies Meta<typeof FunnelChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 'lg' } };
export const Loading: Story = { args: { loading: true } };
export const NoFlow: Story = { args: { flow: false } };
export const DarkMode: Story = {
  decorators: [(S) => <div className="dark" style={{ width: 560, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
