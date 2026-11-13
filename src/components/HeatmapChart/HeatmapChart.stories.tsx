import type { Meta, StoryObj } from '@storybook/react';
import { HeatmapChart } from './HeatmapChart';

const rowLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const colLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}`);

const data = rowLabels.map((_, r) =>
  colLabels.map((_, c) => Math.round(Math.abs(Math.sin(r * 1.3 + c * 0.6)) * 90 + 10))
);

const meta = {
  title: 'Charts/Heatmap Chart',
  component: HeatmapChart,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Matches Figma's new "Other charts" set ("Heatmap chart" / "Heatmap chart
hover"). Recharts has no native heatmap chart type, so this is a plain CSS
grid of colored cells rather than a Recharts wrapper -- flagged here the
same way RadialChart flags its omitted gauge-tick variant.

Cell color is a single-hue chart/1 scale, matching Figma's own look:
higher values get a more saturated fill. On hover, the hovered cell goes
fully solid and every other cell dims to 45% opacity (a flat dim, not its
own value-based shade) -- matching Figma's hover state exactly, and the
same "highlight one, dim the rest" pattern used by BarChart.` } } },
  argTypes: { appearance: { control: 'inline-radio', options: ['default', 'rich'] }, loading: { control: 'boolean' }, size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] } },
  args: { data, rowLabels, colLabels, valueLabel: 'Revenue', size: 'md' },
  decorators: [(S) => <div style={{ width: 560 }}><S /></div>],
} satisfies Meta<typeof HeatmapChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 'lg' } };
export const DarkMode: Story = {
  decorators: [(S) => <div className="dark" style={{ width: 560, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
};
export const Loading: Story = { args: { loading: true } };
export const Rich: Story = { args: { appearance: 'rich' } };
export const RichLoading: Story = { args: { appearance: 'rich', loading: true } };
