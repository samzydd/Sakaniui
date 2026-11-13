import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AreaChart } from './AreaChart';
import { BarChart } from './BarChart';
import { DonutChart } from './DonutChart';
import { FunnelChart } from './FunnelChart';
import { HeatmapChart } from './HeatmapChart';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { RadarChart } from './RadarChart';
import { RadialChart } from './RadialChart';

/**
 * Every chart side by side, for checking the loading state and the entrance together: "Reload data" shows each chart's
 * loading state for a moment, then the chart arrives and plays its entrance. Hover any of them for its interaction.
 */

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const series = months.map((label, i) => ({ label, value: [186, 305, 237, 173, 209, 264][i], value2: [80, 200, 120, 190, 130, 140][i] }));
const radar = [
  { label: 'Talent pool', value: 78, value2: 64 },
  { label: 'Affordability', value: 70, value2: 58 },
  { label: 'Transit', value: 62, value2: 81 },
  { label: 'Time zone fit', value: 74, value2: 70 },
  { label: 'Quality of life', value: 81, value2: 66 },
  { label: 'Tax climate', value: 66, value2: 46 },
];
const funnel = [
  { label: 'Visited store', value: 100000 },
  { label: 'Viewed product', value: 61200 },
  { label: 'Added to cart', value: 16400 },
  { label: 'Started checkout', value: 8400 },
  { label: 'Purchased', value: 3600 },
];
const slices = [
  { label: 'Chrome', value: 275 },
  { label: 'Safari', value: 200 },
  { label: 'Firefox', value: 187 },
  { label: 'Edge', value: 173 },
  { label: 'Other', value: 90 },
];
const heat = [
  [3, 7, 12, 9, 4, 2, 1],
  [5, 11, 18, 14, 8, 3, 2],
  [8, 16, 24, 20, 12, 6, 3],
  [6, 13, 19, 17, 10, 4, 2],
  [2, 6, 9, 8, 5, 2, 1],
];

const Card: React.FC<{ title: string; wide?: boolean; children: React.ReactNode }> = ({ title, wide, children }) => (
  <section
    style={{
      gridColumn: wide ? '1 / -1' : undefined,
      padding: 20,
      borderRadius: 16,
      border: '1px solid var(--color-border-subtle)',
      background: 'var(--color-bg-surface)',
      minWidth: 0,
    }}
  >
    <h3 style={{ margin: '0 0 16px', font: '500 13px/18px var(--font-sans)', color: 'var(--color-fg-muted)' }}>{title}</h3>
    {children}
  </section>
);

const Overview: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const [loading, setLoading] = React.useState(false);
  const [run, setRun] = React.useState(0);
  const reload = () => {
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setRun((n) => n + 1); }, 1800);
  };
  return (
    <div className={dark ? 'dark' : undefined} style={{ padding: 24, background: 'var(--color-bg-canvas)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          style={{
            padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border-default)', cursor: 'pointer',
            background: 'var(--color-bg-surface)', color: 'var(--color-fg-default)', font: '500 13px/18px var(--font-sans)',
          }}
        >
          {loading ? 'Loading…' : 'Reload data'}
        </button>
        <button
          type="button"
          onClick={() => setLoading((v) => !v)}
          style={{
            padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border-subtle)', cursor: 'pointer',
            background: 'transparent', color: 'var(--color-fg-muted)', font: '500 13px/18px var(--font-sans)',
          }}
        >
          {loading ? 'Show charts' : 'Hold loading state'}
        </button>
      </div>
      <div key={run} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        <Card title="Funnel chart" wide><FunnelChart data={funnel} loading={loading} /></Card>
        <Card title="Radar chart"><RadarChart data={radar} variant="multiple" seriesLabels={['Lisbon', 'Berlin']} size="lg" loading={loading} /></Card>
        <Card title="Bar chart"><BarChart data={series} loading={loading} /></Card>
        <Card title="Line chart"><LineChart data={series} series={['value', 'value2']} variant="multiple" loading={loading} /></Card>
        <Card title="Area chart"><AreaChart data={series} variant="stacked" seriesLabels={['Costs', 'Revenue']} loading={loading} /></Card>
        <Card title="Donut chart"><DonutChart data={slices} centerValue="925" centerCaption="Visitors" loading={loading} /></Card>
        <Card title="Pie chart"><PieChart data={slices} variant="interactive" loading={loading} /></Card>
        <Card title="Radial chart"><RadialChart data={slices.slice(0, 4).map((s) => ({ ...s, max: 300 }))} variant="multi" loading={loading} /></Card>
        <Card title="Heatmap chart"><HeatmapChart data={heat} rowLabels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']} colLabels={['8a', '10a', '12p', '2p', '4p', '6p', '8p']} valueLabel="Orders" loading={loading} /></Card>
      </div>
    </div>
  );
};

const meta = {
  title: 'Charts/Overview',
  component: Overview,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Overview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { args: { dark: true } };
