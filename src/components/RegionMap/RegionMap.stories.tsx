import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RegionMap } from './RegionMap';
import { RegionMapLegend } from './RegionMapLegend';
import { US_STATES, US_STATES_VIEWBOX } from '../../regions/us';

/* A fixed stream so the story reads the same every time. */
const values: Record<string, number> = {};
US_STATES.forEach((s, i) => { values[s.id] = Math.round(((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 1_800_000); });

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);
const scale = { breaks: [120_000, 230_000, 760_000, 1_300_000] };

const meta = {
  title: 'Composite/Region Map',
  component: RegionMap,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A choropleth: regions shaded by a value, a hover card, and click-to-zoom into one region. Plain SVG, no map library.

The shapes are data: \`regions\` + \`viewBox\`. \`US_STATES\` and \`US_STATES_VIEWBOX\` ship with the library; any SVG paths work. \`scale.breaks\` bins the values (4 breaks, 5 bins); \`scale.diverging\` paints the bins below zero orange. Click, Enter or Space selects a region and the view eases to it; Escape or a second click goes back out. Pair it with \`RegionMapLegend\`.`,
      },
    },
  },
  args: { regions: US_STATES, viewBox: US_STATES_VIEWBOX, values, scale, formatValue: money },
  decorators: [(S) => <div style={{ width: 520, maxWidth: '100%', padding: 24 }}><S /></div>],
} satisfies Meta<typeof RegionMap>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <>
      <RegionMap {...args} />
      <RegionMapLegend scale={scale} formatValue={money} caption="Shaded by annual recurring revenue" />
    </>
  ),
};
export const Zoomed: Story = { args: { defaultSelected: 'OR' } };
export const Loading: Story = { args: { loading: true } };
export const Dark: Story = {
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)' }}><S /></div>],
};
export const Diverging: Story = {
  args: {
    values: Object.fromEntries(US_STATES.map((s, i) => [s.id, ((i * 37) % 31) - 8])),
    scale: { breaks: [-4.8, 0, 4.3, 8.9, 21], diverging: true },
    formatValue: (n) => `${n > 0 ? '+' : ''}${n}%`,
  },
};
