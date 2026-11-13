import type { Meta, StoryObj } from '@storybook/react';
import { RadarChart } from './RadarChart';

const data = [
  { label: 'January', value: 240 },
  { label: 'February', value: 300 },
  { label: 'March', value: 256 },
  { label: 'April', value: 84 },
  { label: 'May', value: 210 },
  { label: 'June', value: 280 },
];

const multiData = [
  { label: 'January', value: 240, value2: 60 },
  { label: 'February', value: 300, value2: 201 },
  { label: 'March', value: 256, value2: 110 },
  { label: 'April', value: 84, value2: 200 },
  { label: 'May', value: 210, value2: 110 },
  { label: 'June', value: 280, value2: 120 },
];

const meta = {
  title: 'Charts/Radar Chart',
  component: RadarChart,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Radar
charts" component set:

- **default** — solid filled area, polygon grid, no dots
- **dots** — filled area + dot markers at each data point
- **dots-grid-none** — dots, but no grid/boundary at all
- **lines-only** — two series, stroke only (no fill), no dots
- **circle-grid** — circular grid instead of polygon, with dots
- **circle-grid-no-lines** — circular grid with dots, no radial spoke lines
- **grid-custom** — boundary-only grid, same treatment as "default"
- **grid-filled** — polygon grid, alternating filled concentric bands
- **circle-grid-filled** — same, circular bands instead of polygon
- **multiple** — two series overlaid, semi-transparent fills
- **custom-label** — two series, vertex labels replaced by a "value/value2" + category name block

Not ported: the soft blurred glow behind one mockup ("Variant12") -- a
decorative embellishment on top of the same underlying shape rather than
a structurally different chart.

grid-filled/circle-grid-filled's alternating bands aren't something
PolarGrid can do (it only strokes rings, never fills them).
grid-filled's bands are built as extra low-opacity \`<Radar>\` series at
fixed fractions of the data's max value, so they automatically share the
real series' exact polygon geometry with no separate coordinate math.
circle-grid-filled needs true circles, which \`<Radar>\` can't draw (it
only ever connects data points with straight lines) -- those are a
measured SVG overlay instead, replicating Recharts' own
cx/cy/outerRadius="70%" math (confirmed against its PolarUtils source)
via a ResizeObserver, with PolarGrid left enabled on top of it for the
spokes/ring outlines. Both give the "denser toward center" look for
free, via ordinary alpha compositing of same-color layers.` } } },
  argTypes: { appearance: { control: 'inline-radio', options: ['default', 'rich'] }, loading: { control: 'boolean' },
    variant: {
      control: 'select',
      options: [
        'default', 'dots', 'dots-grid-none', 'lines-only', 'circle-grid', 'circle-grid-no-lines',
        'grid-custom', 'grid-filled', 'circle-grid-filled', 'multiple', 'custom-label',
      ],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  args: { data, variant: 'default', size: 'md' },
  decorators: [(S) => <div style={{ width: 420 }}><S /></div>],
} satisfies Meta<typeof RadarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dots: Story = { args: { variant: 'dots' } };
export const DotsGridNone: Story = { args: { variant: 'dots-grid-none' } };
export const LinesOnly: Story = { args: { variant: 'lines-only', data: multiData } };
export const CircleGrid: Story = { args: { variant: 'circle-grid' } };
export const CircleGridNoLines: Story = { args: { variant: 'circle-grid-no-lines' } };
export const GridCustom: Story = { args: { variant: 'grid-custom' } };
export const GridFilled: Story = { args: { variant: 'grid-filled' } };
export const CircleGridFilled: Story = { args: { variant: 'circle-grid-filled' } };
export const Multiple: Story = {
  args: { variant: 'multiple', data: multiData, seriesLabels: ['Revenue', 'Costs'] },
};
export const CustomLabel: Story = { args: { variant: 'custom-label', data: multiData } };
export const Large: Story = { args: { size: 'lg' } };
export const DarkMode: Story = {
  decorators: [(S) => <div className="dark" style={{ width: 420, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
export const Loading: Story = { args: { loading: true } };
export const Rich: Story = { args: { appearance: 'rich' } };
export const RichLoading: Story = { args: { appearance: 'rich', loading: true } };
