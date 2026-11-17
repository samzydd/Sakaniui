import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RegionMapBlock } from './RegionMapBlock';

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
