import type { Meta, StoryObj } from '@storybook/react';
import { RadialChart } from './RadialChart';

const multiData = [
  { label: 'Direct', value: 80 },
  { label: 'Referral', value: 65 },
  { label: 'Social', value: 50 },
  { label: 'Email', value: 35 },
  { label: 'Other', value: 20 },
];

const meta = {
  title: 'Charts/Radial Chart',
  component: RadialChart,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Radial
chart" component set (8 variants):

- **multi** — one concentric ring per data row, full circle
- **grid** — "multi" + a faint polar grid (spokes + rings) behind it
- **text** — one thick ring + center value/caption
- **gauge-tick** — a dial built from individual radial tick marks
- **stacked-label** — "multi" + a center value/caption overlay
- **shape** — a single 240° gauge arc, data rows stacked angularly (not concentric), remainder shown as a track
- **stacked** — same 240° gauge arc, no track (rows fill it exactly)
- **stacked-3-layers** — same 240° gauge arc, sized for a 3-row breakdown

\`gauge-tick\` (individual tick marks) and \`shape\`/\`stacked\`/
\`stacked-3-layers\` (angularly-stacked segments in one band) have no
RadialBarChart equivalent -- RadialBarChart only stacks rows as
concentric rings, never as angular segments sharing one ring -- so all
four are hand-rolled SVG using the exported \`Sector\` primitive, same
call as HeatmapChart/FunnelChart. "multi"/"grid"/"text"/"stacked-label"
are genuine concentric-ring cases, so those stay thin RadialBarChart
wrappers.` } } },
  argTypes: { appearance: { control: 'inline-radio', options: ['default', 'rich'] }, loading: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['multi', 'grid', 'text', 'shape', 'gauge-tick', 'stacked', 'stacked-3-layers', 'stacked-label'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  args: { data: multiData, variant: 'multi', size: 'md' },
  decorators: [(S) => <div style={{ width: 320 }}><S /></div>],
} satisfies Meta<typeof RadialChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Multi: Story = {};
export const Grid: Story = { args: { variant: 'grid' } };
export const StackedLabel: Story = {
  args: { variant: 'stacked-label', centerValue: '3,130', centerCaption: 'Users' },
};
export const Text: Story = {
  args: { data: [{ label: 'Users', value: 800, max: 1000 }], variant: 'text', centerValue: '800', centerCaption: 'Users' },
};
export const Shape: Story = {
  args: {
    data: [
      { label: 'Direct', value: 40, max: 200 },
      { label: 'Referral', value: 50, max: 200 },
    ],
    variant: 'shape',
    centerValue: '2,230',
    centerCaption: 'Users',
  },
};
export const GaugeTick: Story = {
  args: { data: [{ label: 'Users', value: 780, max: 1000 }], variant: 'gauge-tick', centerValue: '3,130', centerCaption: 'Users' },
};
export const Stacked: Story = {
  args: {
    data: [
      { label: 'Costs', value: 65 },
      { label: 'Revenue', value: 40 },
    ],
    variant: 'stacked',
    centerValue: '3,130',
    centerCaption: 'Users',
  },
};
export const StackedThreeLayers: Story = {
  args: {
    data: [
      { label: 'Costs', value: 65 },
      { label: 'Revenue', value: 45 },
      { label: 'Profit', value: 25 },
    ],
    variant: 'stacked-3-layers',
    centerValue: '3,130',
    centerCaption: 'Users',
  },
};
export const Large: Story = { args: { size: 'lg' } };
export const DarkMode: Story = {
  decorators: [(S) => <div className="dark" style={{ width: 320, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
export const Loading: Story = { args: { loading: true } };
export const Rich: Story = { args: { appearance: 'rich' } };
export const RichLoading: Story = { args: { appearance: 'rich', loading: true } };
