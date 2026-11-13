import type { Meta, StoryObj } from '@storybook/react';
import { PieChart } from './PieChart';

const data = [
  { label: 'Direct', value: 45 },
  { label: 'Referral', value: 25 },
  { label: 'Social', value: 18 },
  { label: 'Email', value: 12 },
  { label: 'Other', value: 8 },
];

const meta = {
  title: 'Charts/Pie Chart',
  component: PieChart,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Pie
chart" component set (10 variants):

- **pie** — full pie, white separator strokes between slices
- **pie-no-separator** — full pie, slices touch directly
- **label** — full pie, outside leader-line value labels
- **custom-label** — full pie, leader-line labels in a filled pill
- **label-list** — full pie, category-name labels inside each slice
- **donut** — plain ring, no labels
- **donut-active** — ring with one slice pushed outward ("exploded")
- **donut-with-text** — ring + center value/caption
- **stacked** — two concentric rings, same data, same colors
- **interactive** — ring + a halo ring bracketing one slice

No variant has an angular gap between slices (Figma's slices always
touch) -- "pie"'s separator is a thin stroke drawn on top of the shared
edge, not an actual padding-angle gap.

The exploded slice and halo ring aren't things Pie's \`activeShape\` can
do on their own (Recharts 3 dropped \`activeIndex\` from Pie's types, so
there's no way to force a *default* active slice without a real hover) --
both are built via a custom \`shape\` render function using the exported
\`Sector\` primitive, driven by this component's own hover/default-active
state instead.` } } },
  argTypes: { appearance: { control: 'inline-radio', options: ['default', 'rich'] }, loading: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['pie', 'pie-no-separator', 'label', 'custom-label', 'label-list', 'donut', 'donut-active', 'donut-with-text', 'stacked', 'interactive'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  args: { data, variant: 'donut', size: 'md' },
  decorators: [(S) => <div style={{ width: 360 }}><S /></div>],
} satisfies Meta<typeof PieChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pie: Story = { args: { variant: 'pie' } };
export const PieNoSeparator: Story = { args: { variant: 'pie-no-separator' } };
export const Label: Story = { args: { variant: 'label' } };
export const CustomLabel: Story = { args: { variant: 'custom-label' } };
export const LabelList: Story = { args: { variant: 'label-list' } };
export const Donut: Story = { args: { variant: 'donut' } };
export const DonutActive: Story = { args: { variant: 'donut-active' } };
export const DonutWithText: Story = {
  args: { variant: 'donut-with-text', centerValue: '2,230', centerCaption: 'Users' },
};
export const Stacked: Story = { args: { variant: 'stacked' } };
export const Interactive: Story = { args: { variant: 'interactive' } };
export const Large: Story = { args: { size: 'lg', variant: 'donut-with-text', centerValue: '2,230', centerCaption: 'Users' } };
export const DarkMode: Story = {
  args: { variant: 'donut' },
  decorators: [(S) => <div className="dark" style={{ width: 360, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
export const Loading: Story = { args: { loading: true } };
export const Rich: Story = { args: { appearance: 'rich' } };
export const RichLoading: Story = { args: { appearance: 'rich', loading: true } };
