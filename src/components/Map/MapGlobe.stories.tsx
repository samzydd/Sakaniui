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
  decorators: [(S, { parameters }) => <div style={{ width: parameters.fullWidth ? 'max-content' : 520, padding: 24 }}><S /></div>],
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
  parameters: { fullWidth: true, docs: { description: { story: 'Default, Hover (pinned with `hovered`), Selected and Active, each with a `label`. Real hover works on its own: point at any marker and the spin stops so it can be clicked.' } } },
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

/* ---- Block markers: size, rank, status (Figma Map Globe Marker) ---- */

const SIZED: { position: LatLng; label: string; size?: 'sm' | 'md' | 'lg'; rank?: number; status?: 'healthy' | 'watch'; selected?: boolean }[] = [
  { position: [6.5, 3.4], label: 'Sm', size: 'sm' },
  { position: [19.1, 72.9], label: 'Md', size: 'md', rank: 3 },
  { position: [1.35, 103.8], label: 'Lg', size: 'lg', rank: 1, selected: true },
  { position: [35.7, 139.7], label: 'Md, watch', size: 'md', rank: 2, status: 'watch' },
  { position: [51.5, -0.1], label: 'Sm, watch', size: 'sm', status: 'watch' },
];

export const MarkerSizeRankStatus: Story = {
  name: 'Markers: size, rank, status',
  args: { autoRotate: false, arcs: [], markers: SIZED, center: [20, 60], draggable: false },
  decorators: [(S) => (
    <div style={{ display: 'flex', gap: 16, width: 1080 }}>
      <div style={{ flex: 1, padding: 24, borderRadius: 16, background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border-subtle)' }}><S /></div>
      <div className="dark" style={{ flex: 1, padding: 24, borderRadius: 16, background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border-subtle)' }}><S /></div>
    </div>
  )],
  parameters: { fullWidth: true, docs: { description: { story: '`size` ("sm", "md", "lg") makes a marker show a value; `rank` adds the numbered chip that matches a list beside the globe; `status="watch"` adds a dashed amber ring, so a warning never relies on colour alone.' } } },
};

/* ---- A ranked list that drives the globe: fly-to, zoom and the anchored card ---- */

const RANKED = [
  { name: 'Singapore', position: CITY.singapore, value: 18.4, status: 'healthy' as const },
  { name: 'London', position: CITY.london, value: 14.2, status: 'healthy' as const },
  { name: 'Lagos', position: CITY.lagos, value: 9.6, status: 'watch' as const },
  { name: 'Mumbai', position: CITY.mumbai, value: 7.1, status: 'healthy' as const },
  { name: 'New York', position: CITY.newYork, value: 5.3, status: 'watch' as const },
  { name: 'São Paulo', position: CITY.saoPaulo, value: 3.8, status: 'healthy' as const },
];

function RankedGlobe({ theme }: { theme?: 'auto' | 'dark' }) {
  const [picked, setPicked] = React.useState<number | null>(0);
  const [zoomed, setZoomed] = React.useState(false);
  const max = RANKED[0].value;
  const markers = RANKED.map((c, i) => ({
    position: c.position, label: c.name, rank: i + 1, status: c.status, selected: picked === i,
    size: (c.value / max > 0.7 ? 'lg' : c.value / max > 0.4 ? 'md' : 'sm') as 'sm' | 'md' | 'lg',
  }));
  const pick = (i: number) => { setPicked((p) => (p === i ? null : i)); setZoomed(true); };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, alignItems: 'center', width: 760 }}>
      <MapGlobe
        theme={theme} markers={markers} arcs={arcs} aria-label="Payment volume by city" autoRotate={picked == null}
        center={picked == null ? [14, 75] : RANKED[picked].position}
        zoom={picked != null && zoomed ? 1.12 : 1}
        onMarkerClick={pick}
        renderMarkerCard={(i) => (
          <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-lg)', font: '500 13px/18px var(--font-sans)', color: 'var(--color-fg-default)', whiteSpace: 'nowrap' }}>
            {RANKED[i].name}
            <span style={{ marginLeft: 8, color: 'var(--color-fg-muted)' }}>${RANKED[i].value}M</span>
            {RANKED[i].status === 'watch' && <span style={{ marginLeft: 8, color: 'var(--color-warning-solid)' }}>Watch</span>}
          </div>
        )}
      />
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
        {RANKED.map((c, i) => (
          <li key={c.name}>
            <button
              type="button" onClick={() => pick(i)} aria-pressed={picked === i}
              style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', font: '500 13px/18px var(--font-sans)', color: 'var(--color-fg-default)', background: picked === i ? 'var(--color-bg-subtle)' : 'transparent' }}
            >
              <span style={{ width: 18, color: 'var(--color-fg-subtle)' }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{c.name}</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>${c.value}M</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const RankedFlyTo: Story = {
  name: 'Ranked list: fly-to, zoom, card',
  render: () => <RankedGlobe />,
  decorators: [(S) => <div style={{ width: 'max-content', padding: 24 }}><S /></div>],
  parameters: { fullWidth: true, docs: { description: { story: 'Pick a city in the list (or click its marker): the globe turns to face it the short way round and eases in, and `renderMarkerCard` keeps your own card on the marker. Change `center` and `zoom` from state and the globe does the rest; here `autoRotate` is off while a city is picked, so it stays facing it. Arrow keys move between the markers once one has focus.' } } },
};

export const RankedFlyToDark: Story = {
  name: 'Ranked list: dark',
  render: () => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24, borderRadius: 16 }}><RankedGlobe /></div>,
  decorators: [(S) => <div style={{ width: 'max-content', padding: 24 }}><S /></div>],
  parameters: { fullWidth: true },
};
