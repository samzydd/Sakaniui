import type { Meta, StoryObj } from '@storybook/react';
import { AreaChart } from './AreaChart';

const data = [
  { label: 'Jan', value: 40, value2: 24 },
  { label: 'Feb', value: 68, value2: 34 },
  { label: 'Mar', value: 52, value2: 45 },
  { label: 'Apr', value: 91, value2: 52 },
  { label: 'May', value: 76, value2: 61 },
  { label: 'Jun', value: 98, value2: 58 },
];

const meta = {
  title: 'Charts/Area Chart',
  component: AreaChart,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Recharts wrapper styled with Sakani chart tokens. Matches Figma "Area Chart"
(type: Default | Stacked | Step | Linear, each with an optional second
series). A thin library wrapper, same philosophy as BarChart/LineChart/
DonutChart — production charts use a charting library, not a hand-rolled
SVG port.

Hover shows Recharts' own tooltip + cursor line, matching Figma's
"Indicator line" + "Chart Tooltip" atoms.` } } },
  argTypes: { appearance: { control: 'inline-radio', options: ['default', 'rich'] }, loading: { control: 'boolean' },
    variant: { control: 'select', options: ['default', 'stacked', 'step', 'linear'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  args: { data, variant: 'default', size: 'md', seriesLabels: ['Costs', 'Revenue'] },
  decorators: [(S) => <div style={{ width: 480 }}><S /></div>],
} satisfies Meta<typeof AreaChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Stacked: Story = { args: { variant: 'stacked' } };
export const Step: Story = { args: { variant: 'step' } };
export const Linear: Story = { args: { variant: 'linear' } };
export const SingleSeries: Story = {
  args: { data: data.map(({ label, value }) => ({ label, value })) },
};
export const Large: Story = { args: { size: 'lg' } };
export const DarkMode: Story = {
  decorators: [(S) => <div className="dark" style={{ width: 480, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
export const Loading: Story = { args: { loading: true } };
export const Rich: Story = { args: { appearance: 'rich' } };
export const RichLoading: Story = { args: { appearance: 'rich', loading: true } };
