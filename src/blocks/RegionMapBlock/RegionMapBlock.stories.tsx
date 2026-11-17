import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RegionMapBlock } from './RegionMapBlock';
import { makeSampleMetrics, makeSampleRows } from './sample';
import { UK_REGIONS, UK_REGIONS_VIEWBOX } from '../../regions/uk';
import { ES_REGIONS, ES_REGIONS_VIEWBOX } from '../../regions/es';
import { DE_REGIONS, DE_REGIONS_VIEWBOX } from '../../regions/de';
import { CA_REGIONS, CA_REGIONS_VIEWBOX } from '../../regions/ca';
import { AU_REGIONS, AU_REGIONS_VIEWBOX } from '../../regions/au';
import type { RegionShape } from '../../components/RegionMap';

/**
 * A "Revenue by state" card: a choropleth of the United States shaded by a metric you switch between, a hover card with
 * the rank, click-to-zoom into one state, a legend, and a ranked list that turns into the state's figures.
 */
const meta = {
  title: 'Blocks/Application/Region Map',
  component: RegionMapBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `A choropleth card. A COMPOSITION EXAMPLE: copy the folder and swap \`sample.ts\` for your own regions and figures.

Built from Region Map (shaded regions, hover card, animated zoom), Region Map Legend, Segmented control, Select and Button. The shapes are plain data (\`regions\` + \`viewBox\`): the 50 US states ship with the library, and anything you can express as SVG paths works (countries, provinces, sales territories).`,
      },
    },
  },
  decorators: [(S) => <div style={{ width: 560, maxWidth: '100%' }}><S /></div>],
} satisfies Meta<typeof RegionMapBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

const dark = (S: React.ComponentType) => (
  <div className="dark" style={{ padding: 24, background: 'var(--color-bg-canvas)' }}><div style={{ width: 560, maxWidth: '100%' }}><S /></div></div>
);

export const Default: Story = {};
export const Dark: Story = { decorators: [dark] };
export const DarkZoomedIn: Story = { args: { defaultMetric: 'growth', defaultSelectedId: 'OR' }, decorators: [dark] };
export const Growth: Story = { args: { defaultMetric: 'growth' } };
export const ZoomedIn: Story = { args: { defaultSelectedId: 'OR' } };
/** A state below the average on every figure: the comparison pills turn red. */
export const ZoomedBelowAverage: Story = { args: { defaultSelectedId: 'WV' } };
export const Loading: Story = { args: { state: 'loading' } };
export const Empty: Story = { args: { state: 'empty' } };

/* ---- other countries: the same block with another country's outlines. Import only the one you use, e.g.
   `import { UK_REGIONS, UK_REGIONS_VIEWBOX } from '@sakaniui/react/regions/uk'`. ---- */
const country = (regions: RegionShape[], viewBox: [number, number, number, number], symbol: string, noun: string, all: string, title: string, plural?: string): Story => {
  const rows = makeSampleRows(regions);
  return { args: { regions, viewBox, rows, metrics: makeSampleMetrics(symbol, rows), regionNoun: noun, regionNounPlural: plural, allLabel: all, title } };
};
export const UnitedKingdom: Story = country(UK_REGIONS, UK_REGIONS_VIEWBOX, '\u00a3', 'region', 'United Kingdom', 'Revenue by region');
export const Germany: Story = country(DE_REGIONS, DE_REGIONS_VIEWBOX, '\u20ac', 'state', 'Germany', 'Revenue by state');
export const Spain: Story = country(ES_REGIONS, ES_REGIONS_VIEWBOX, '\u20ac', 'community', 'Spain', 'Revenue by community', 'communities');
export const Canada: Story = country(CA_REGIONS, CA_REGIONS_VIEWBOX, 'C$', 'province', 'Canada', 'Revenue by province');
export const Australia: Story = country(AU_REGIONS, AU_REGIONS_VIEWBOX, 'A$', 'state', 'Australia', 'Revenue by state');
export const UnitedKingdomZoomed: Story = { ...country(UK_REGIONS, UK_REGIONS_VIEWBOX, '\u00a3', 'region', 'United Kingdom', 'Revenue by region'), };
UnitedKingdomZoomed.args = { ...UnitedKingdomZoomed.args, defaultSelectedId: 'SC' };
