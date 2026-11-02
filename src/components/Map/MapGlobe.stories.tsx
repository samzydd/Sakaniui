import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MapGlobe } from './MapGlobe';
import type { LatLng } from './geo';

const CITY: Record<string, LatLng> = {
  lagos: [6.5, 3.4], london: [51.5, -0.1], singapore: [1.35, 103.8], tokyo: [35.7, 139.7],
  sydney: [-33.9, 151.2], mumbai: [19.1, 72.9], newYork: [40.7, -74.0], saoPaulo: [-23.5, -46.6],
};
const markers = Object.entries(CITY).map(([name, position]) => ({ position, active: name === 'singapore' || name === 'lagos' }));
const arcs = [
  { from: CITY.london, to: CITY.singapore }, { from: CITY.singapore, to: CITY.sydney }, { from: CITY.singapore, to: CITY.tokyo },
  { from: CITY.mumbai, to: CITY.singapore }, { from: CITY.lagos, to: CITY.london }, { from: CITY.newYork, to: CITY.london },
  { from: CITY.saoPaulo, to: CITY.lagos },
];

const meta = {
  title: 'Composite/Map Globe',
  component: MapGlobe,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `3D dotted globe. Matches Figma "Map Globe": \`variant="land"\` (Dots=Land) dots the continents,
\`variant="ocean"\` (Dots=Ocean) dots the sea and leaves the land dark. Dots, arcs and the atmosphere are
fg/default at depth-based opacity, so it follows light and dark. Markers match Map Marker Dot; \`active\` adds a
pulse. It spins on its own (off under reduced motion), can be dragged, and pauses offscreen.

No dependencies: a canvas, an orthographic projection and an 11 KB Natural Earth land mask.`,
      },
    },
  },
  args: { markers, arcs, center: [12, 70] },
  decorators: [(S) => <div style={{ width: 520, padding: 24 }}><S /></div>],
} satisfies Meta<typeof MapGlobe>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Land: Story = {};
export const Ocean: Story = { args: { variant: 'ocean', center: [18, 165] } };

export const DarkOcean: Story = {
  args: { variant: 'ocean', center: [18, 165] },
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24, borderRadius: 16 }}><S /></div>],
};

export const DarkLand: Story = {
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24, borderRadius: 16 }}><S /></div>],
};

export const Still: Story = { args: { autoRotate: false, arcs: [], markers: [] } };

/* ---- Live: connections arrive from a feed; the newest pulse and the oldest drop away ---- */

const CITIES = Object.values(CITY);
function LiveGlobe() {
  const [live, setLive] = React.useState(() => arcs.slice(0, 4));
  React.useEffect(() => {
    const t = setInterval(() => {
      setLive((a) => {
        const from = CITIES[Math.floor(Math.random() * CITIES.length)];
        let to = from;
        while (to === from) to = CITIES[Math.floor(Math.random() * CITIES.length)];
        return [...a.slice(-5), { from, to }];
      });
    }, 1400);
    return () => clearInterval(t);
  }, []);
  const active = new Set(live.slice(-2).flatMap((a) => [a.from, a.to]));
  return <MapGlobe markers={CITIES.map((position) => ({ position, active: active.has(position) }))} arcs={live} />;
}

export const Live: Story = {
  render: () => <LiveGlobe />,
  parameters: { docs: { description: { story: 'Markers and arcs are plain props, so a feed can drive them: here a new connection arrives every 1.4 s, the last two pulse and only the latest six arcs stay.' } } },
};
