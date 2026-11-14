import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LiveMapBlock } from './LiveMapBlock';
import { SAMPLE_NOW } from './sample';

/**
 * The Figma "Live Map" set: Device (Desktop 1120, Mobile 390) x State. Each story pins the same moment as the
 * Figma block (13:42:03 UTC) so they can be compared with it; leave `now` out and the clock runs. The globe turns slowly
 * and holds still while a city is selected. The desktop stories are held at 1120px wide (they scroll sideways in a narrow pane).
 */
const meta = {
  title: 'Blocks/Application/Live Map',
  component: LiveMapBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `A live payments map: a dotted globe whose dots are sized and ranked by revenue, region filters, a metric switch, a ranked list of cities that turns into a city's detail when you pick one, and a playback row that replays the day. A COMPOSITION EXAMPLE: copy the folder, replace \`sample.ts\` with your own cities.

Built from Map Globe (with the \`size\`, \`rank\` and \`status\` marker fields, a reactive \`center\`, \`zoom\` and \`renderMarkerCard\`), Segmented control, Filter chip, Tabs, Badge, Button, Icon button and Location dot. Below 720px of its own width it becomes the phone layout, with the list as a bottom sheet.`,
      },
    },
  },
  args: { now: SAMPLE_NOW },
} satisfies Meta<typeof LiveMapBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

/* The block reads its own width, so in a narrow pane (the docs column, a small canvas) it would drop to the phone
   layout. The desktop stories are held at the block's design width instead and scroll sideways when the pane is smaller. */
const desk = { padding: 24, background: 'var(--color-bg-canvas)', boxSizing: 'border-box', width: '100%', minWidth: 1168 } as const;   // 1120 + the 24px padding each side
const light = (S: React.ComponentType) => <div style={{ ...desk, minHeight: '100vh' }}><S /></div>;
const dark = (S: React.ComponentType) => <div className="dark" style={{ ...desk, minHeight: '100vh' }}><S /></div>;
const phone = (S: React.ComponentType) => <div style={{ padding: 24, background: 'var(--color-bg-canvas)', minHeight: '100vh', boxSizing: 'border-box' }}><div style={{ width: 390 }}><S /></div></div>;

/** Device=Desktop, State=Overview. London is hovered, so its row is lit and its card is up. */
export const Overview: Story = { args: { hoveredId: 'london', atmosphere: false }, decorators: [dark] };
/** Device=Desktop, State=City selected. Tokyo is selected: the panel is its detail and the region chip follows. */
export const CitySelected: Story = { args: { defaultSelectedId: 'tokyo' }, decorators: [light] };
/** State=Loading: skeletons keep the layout still until the data arrives. */
export const Loading: Story = { args: { state: 'loading', atmosphere: false }, decorators: [dark] };
/** State=No data: no payments yet today. */
export const NoData: Story = { args: { state: 'empty', atmosphere: false }, decorators: [dark] };
/** Device=Mobile, State=Overview: under 720px the panel becomes a bottom sheet and the legend moves behind the info button. */
export const Mobile: Story = { args: { hoveredId: 'london' }, decorators: [phone], parameters: { viewport: { defaultViewport: 'mobile1' } } };

/** Light and dark, live: the clock ticks, Replay today plays the day back, pick a city on the globe or in the list. */
export const Interactive: Story = { args: { now: undefined }, decorators: [light] };
export const InteractiveDark: Story = { args: { now: undefined }, decorators: [dark] };
