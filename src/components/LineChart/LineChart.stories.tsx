import type { Meta, StoryObj } from '@storybook/react';
import { LineChart } from './LineChart';

const data = [
  { label: 'Jan', revenue: 4200, cost: 2400, item: 'Item 1' },
  { label: 'Feb', revenue: 3800, cost: 2210, item: 'Item 2' },
  { label: 'Mar', revenue: 5100, cost: 2800, item: 'Item 3' },
  { label: 'Apr', revenue: 4700, cost: 2600, item: 'Item 4' },
  { label: 'May', revenue: 5900, cost: 3100, item: 'Item 5' },
  { label: 'Jun', revenue: 6200, cost: 3300, item: 'Item 6' },
];

const meta = {
  title: 'Charts/Line Chart',
  component: LineChart,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Line
chart" component set:

- **default** — smooth (monotone) curve, single series, no dots
- **linear** — straight-line segments instead of a smooth curve
- **step** — step/staircase line
- **multiple** — two series overlaid (pass 2 entries in \`series\`)
- **dots** — smooth curve, dot markers always visible (not just on hover)
- **custom-dots** — smooth curve, ringed/halo dot markers
- **dots-colors** — smooth curve, each dot cycles through the full chart palette instead of matching its own series' color
- **label** — dots + the raw value shown above each point
- **custom-label** — dots + a custom label per point (see \`labelKey\`)

A thin wrapper throughout -- every variant is a Recharts \`type\`/\`dot\`/
\`label\` prop combination, no hand-rolled SVG needed.` } } },
  argTypes: { appearance: { control: 'inline-radio', options: ['default', 'rich'] }, loading: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['default', 'linear', 'step', 'multiple', 'dots', 'custom-dots', 'dots-colors', 'label', 'custom-label'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  args: { data, series: ['revenue'], variant: 'default', size: 'md' },
  decorators: [(S) => <div style={{ width: 560 }}><S /></div>],
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Linear: Story = { args: { variant: 'linear' } };
export const Step: Story = { args: { variant: 'step' } };
export const Multiple: Story = { args: { variant: 'multiple', series: ['revenue', 'cost'], showLegend: true } };
export const Dots: Story = { args: { variant: 'dots' } };
export const CustomDots: Story = { args: { variant: 'custom-dots' } };
export const DotsColors: Story = { args: { variant: 'dots-colors' } };
export const Label: Story = { args: { variant: 'label' } };
export const CustomLabel: Story = { args: { variant: 'custom-label', labelKey: 'item' } };
export const MultiSeries: Story = { args: { series: ['revenue', 'cost'], showLegend: true } };
export const DarkMode: Story = {
  args: { series: ['revenue', 'cost'], showLegend: true },
  decorators: [(S) => <div className="dark" style={{ width: 560, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
export const Loading: Story = { args: { loading: true } };
export const Rich: Story = { args: { appearance: 'rich' } };
export const RichLoading: Story = { args: { appearance: 'rich', loading: true } };
