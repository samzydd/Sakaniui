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

/* ---- Hover, selected and the other marker states, light and dark ---- */

const STATES: { position: LatLng; label: string; active?: boolean; selected?: boolean; hovered?: boolean }[] = [
  { position: [6.5, 3.4], label: 'Default' },
  { position: [19.1, 72.9], label: 'Hover', hovered: true },
  { position: [1.35, 103.8], label: 'Selected', selected: true },
  { position: [35.7, 139.7], label: 'Active', active: true },
];

export const MarkerStates: Story = {
  name: 'Markers: states (Default, Hover, Selected, Active)',
  args: { autoRotate: false, arcs: [], markers: STATES, center: [14, 75], draggable: false },
  decorators: [(S) => (
    <div style={{ display: 'flex', gap: 16, width: 1080 }}>
      <div style={{ flex: 1, padding: 24, borderRadius: 16, background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border-subtle)' }}><S /></div>
      <div className="dark" style={{ flex: 1, padding: 24, borderRadius: 16, background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border-subtle)' }}><S /></div>
    </div>
  )],
  parameters: { docs: { description: { story: 'Default, Hover (pinned with `hovered`), Selected and Active, each with a `label`. Real hover works on its own: point at any marker and the spin stops so it can be clicked.' } } },
};

function Interactive({ theme }: { theme?: 'auto' | 'dark' }) {
  const [picked, setPicked] = React.useState<number | null>(1);
  const list = Object.entries(CITY).map(([name, position], i) => ({
    position, label: name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), selected: picked === i,
  }));
  return (
    <>
      <MapGlobe markers={list} arcs={arcs} theme={theme} onMarkerClick={(i) => setPicked((p) => (p === i ? null : i))} aria-label="Offices" />
      <p data-testid="selected" style={{ margin: 0, textAlign: 'center', font: '500 13px var(--font-sans)', color: theme === 'dark' ? '#a8a29b' : 'var(--color-fg-muted)' }}>
        {picked == null ? 'Nothing selected' : `Selected: ${list[picked].label}`}
      </p>
    </>
  );
}

export const HoverAndSelect: Story = {
  name: 'Markers: hover and click',
  render: () => <Interactive />,
  parameters: { docs: { description: { story: 'Hover a marker for its halo and name; click to select it (larger halo, name stays). The markers are also reachable with Tab, and `onMarkerClick` / `onMarkerHover` report the index.' } } },
};

/** The globe is transparent, so `theme="dark"` is for one that sits on a dark surface inside a light page (a hero, a card). */
export const ThemeDark: Story = {
  name: 'Dark (theme="dark")',
  render: () => <div style={{ background: '#0e0e0f', borderRadius: 16, padding: 24 }}><Interactive theme="dark" /></div>,
  decorators: [(S) => <div style={{ width: 520, padding: 24 }}><S /></div>],
};
