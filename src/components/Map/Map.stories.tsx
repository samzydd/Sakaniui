import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Map } from './Map';
import { MapMarker } from './MapMarker';
import { MapPopup } from './MapPopup';
import { MapClusterLayer } from './MapClusterLayer';
import { MapControlButton, MapControls } from './MapControls';
import { MapContext } from './context';
import { IconPlus } from '../../icons/outline/plus';
import type { LatLng } from './geo';

const PLACES: { name: string; note: string; position: LatLng }[] = [
  { name: 'Borough Market', note: '8 Southwark St · Open until 5pm', position: [51.5055, -0.0910] },
  { name: 'Tate Modern', note: 'Bankside · Free entry', position: [51.5076, -0.0994] },
  { name: 'Leadenhall Market', note: 'Gracechurch St · Open until 6pm', position: [51.5128, -0.0834] },
  { name: 'Shakespeare’s Globe', note: '21 New Globe Walk', position: [51.5081, -0.0972] },
  { name: 'The Shard', note: '32 London Bridge St', position: [51.5045, -0.0865] },
];

function Places({ theme }: { theme?: 'auto' | 'dark' }) {
  const [selected, setSelected] = React.useState<number | null>(0);
  const place = selected == null ? null : PLACES[selected];
  return (
    <Map center={[51.5062, -0.0930]} zoom={15} locate height={460} theme={theme}>
      {PLACES.map((p, i) => (
        <MapMarker key={p.name} position={p.position} label={p.name} selected={selected === i} onClick={() => setSelected(i)} />
      ))}
      <MapMarker position={[51.5101, -0.0860]} variant="cluster" count={8} onClick={() => {}} />
      <MapMarker position={[51.5030, -0.0975]} variant="dot" label="You are here" />
      {place && (
        <MapPopup position={place.position} offset={58} title={place.name} description={place.note} onClose={() => setSelected(null)} />
      )}
    </Map>
  );
}

const meta = {
  title: 'Composite/Map',
  component: Map,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Interactive tile map. Matches Figma "Map" (Map page): radius-xl container with border/default,
zoom controls top-right (Map Controls), attribution bottom-right, and MapMarker / MapPopup children placed by
latitude and longitude.

No map library: tiles are plain images on a Web Mercator grid. The default tiles are OpenStreetMap's, fine for
development and light use; pass \`tileUrl\` (and \`attribution\`) for your own provider in production. In dark mode
the tiles are inverted and muted through \`--map-tile-filter\`.

Drag to pan, scroll or pinch to zoom at the pointer, double-click to zoom in; with focus, arrows pan and + / - zoom.`,
      },
    },
  },
  decorators: [(S) => <div style={{ padding: 24, width: 880, maxWidth: '100%', boxSizing: 'border-box' }}><S /></div>],
} satisfies Meta<typeof Map>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Places /> };

/** The Figma "Dark" example: this map is dark on a light page, because `theme="dark"` re-themes the whole map. */
export const DarkMode: Story = {
  render: () => <Places theme="dark" />,
};

/** `theme` left on "auto": the map follows a `.dark` class on <html> or any ancestor. */
export const DarkFollowsPage: Story = {
  render: () => <Places />,
  decorators: [(S) => <div className="dark" style={{ background: 'var(--color-bg-canvas)', padding: 24 }}><S /></div>],
};

export const Markers: Story = {
  render: () => (
    <Map center={[51.5062, -0.0930]} zoom={15} controls={false} height={320}>
      <MapMarker position={[51.5062, -0.0990]} label="Pin" />
      <MapMarker position={[51.5062, -0.0950]} label="Pin, selected" selected />
      <MapMarker position={[51.5062, -0.0910]} variant="dot" label="Dot" />
      <MapMarker position={[51.5062, -0.0870]} variant="cluster" count={12} />
    </Map>
  ),
};

/* ---- Live: a feed pushes new positions; glide slides the markers instead of jumping ---- */

interface Courier { id: number; name: string; position: LatLng; heading: number }
const HOME: LatLng = [51.5062, -0.093];

/** Where courier `i` is after `tick` updates: each one loops around its own circuit at its own pace. */
function courierAt(i: number, tick: number): Courier {
  const radius = 0.0035 + (i % 4) * 0.0018, rate = (i % 2 ? 1 : -1) * (0.16 + (i % 3) * 0.05);
  const phase = i * 0.9 + tick * rate;
  const position: LatLng = [HOME[0] + Math.sin(phase) * radius, HOME[1] + Math.cos(phase) * radius * 1.8];
  const heading = (Math.atan2(-Math.sin(phase) * rate * 1.8 * 0.62, Math.cos(phase) * rate) * 180) / Math.PI;
  return { id: i, name: `Courier ${i + 1}`, position, heading: (heading + 360) % 360 };
}

function LiveCouriers({ glide }: { glide: number }) {
  const [tick, setTick] = React.useState(0);
  const [selected, setSelected] = React.useState<number | null>(2);
  // stand-in for a WebSocket / SSE message arriving every 2 s
  React.useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);
  const couriers = React.useMemo(() => Array.from({ length: 8 }, (_, i) => courierAt(i, tick)), [tick]);
  const picked = couriers.find((c) => c.id === selected);
  return (
    <Map center={HOME} zoom={15} height={460}>
      {couriers.map((c) => (
        <MapMarker key={c.id} variant="dot" position={c.position} glide={glide} label={c.name}
          selected={selected === c.id} onClick={() => setSelected(c.id)} />
      ))}
      {picked && (
        <MapPopup position={picked.position} glide={glide} offset={30} title={picked.name}
          description={`Heading ${Math.round(picked.heading)}°`} onClose={() => setSelected(null)} />
      )}
    </Map>
  );
}

export const Live: Story = {
  render: () => <LiveCouriers glide={1900} />,
  parameters: {
    docs: {
      description: {
        story: `Positions arrive every two seconds. With \`glide={1900}\` on the markers (and the popup that follows one) they slide
to each new place; without it they jump. The same props work with any source: a WebSocket, server-sent events or polling.`,
      },
    },
  },
};

export const LiveWithoutGlide: Story = {
  render: () => <LiveCouriers glide={0} />,
  parameters: { docs: { description: { story: 'The same feed with no `glide`: markers jump to each new position.' } } },
};

/* ---- Clusters: thousands of places, only what is in view is drawn ---- */

function scatter(n: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const hubs: LatLng[] = [[51.5, -0.12], [53.48, -2.24], [52.49, -1.89], [55.95, -3.19], [51.45, -2.59], [53.8, -1.55]];
  return Array.from({ length: n }, (_, id) => {
    const h = hubs[Math.floor(rnd() * hubs.length)], spread = 0.05 + rnd() * 0.4;
    return { id, position: [h[0] + (rnd() - 0.5) * spread, h[1] + (rnd() - 0.5) * spread * 1.6] as LatLng };
  });
}

function Clusters({ count }: { count: number }) {
  const points = React.useMemo(() => scatter(count), [count]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const picked = points.find((p) => p.id === selected);
  return (
    <Map center={[53.2, -1.8]} zoom={6} height={500} locate>
      <MapClusterLayer
        points={points}
        renderPoint={(p) => <MapMarker key={p.id} variant="dot" position={p.position} label={`Place ${p.id + 1}`} selected={selected === p.id} onClick={() => setSelected(p.id)} />}
      />
      {picked && <MapPopup position={picked.position} offset={30} title={`Place ${picked.id + 1}`} description={`${picked.position[0].toFixed(3)}, ${picked.position[1].toFixed(3)}`} onClose={() => setSelected(null)} />}
    </Map>
  );
}

export const ClusteredPlaces: Story = {
  render: () => <Clusters count={2000} />,
  parameters: { docs: { description: { story: '2,000 places. Nearby ones group into a counted cluster; click one to zoom to its places. Only clusters in view are rendered.' } } },
};

export const ClusteredPlaces10k: Story = {
  name: 'Clustered places (10,000)',
  render: () => <Clusters count={10000} />,
};

/* ---- Every Figma variant, side by side ---- */

/** Lays markers out by pixel instead of by place, so a board of states needs no tiles. */
const Board: React.FC<{ children: React.ReactNode; w: number; h: number }> = ({ children, w, h }) => (
  <MapContext.Provider value={{ zoom: 15, maxZoom: 18, flyTo: () => {}, fitBounds: () => {}, project: ([y, x]) => ({ x, y }) }}>
    <div style={{ position: 'relative', width: w, height: h }}>{children}</div>
  </MapContext.Provider>
);

const label: React.CSSProperties = { position: 'absolute', transform: 'translateX(-50%)', font: '500 12px var(--font-sans)', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap' };

function MarkerStates() {
  const states = [['Default', {}], ['Hover', { hovered: true }], ['Selected', { selected: true }]] as const;
  const types = ['pin', 'dot', 'cluster'] as const;
  return (
    <Board w={520} h={330}>
      {states.map(([name], c) => <span key={name} style={{ ...label, left: 130 + c * 150, top: 0 }}>{name}</span>)}
      {types.map((t, r) => (
        <React.Fragment key={t}>
          <span style={{ ...label, left: 28, top: 82 + r * 100, transform: 'none', textTransform: 'capitalize' }}>{t}</span>
          {states.map(([name, props], c) => (
            <MapMarker key={name} variant={t} count={12} label={`${t} ${name}`} position={[t === 'pin' ? 100 + r * 100 : 82 + r * 100, 130 + c * 150]} {...props} />
          ))}
        </React.Fragment>
      ))}
    </Board>
  );
}

const sheet = (dark?: boolean): React.CSSProperties => ({ padding: 24, borderRadius: 16, background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border-subtle)', ...(dark ? {} : {}) });

export const MarkerStatesBoard: Story = {
  name: 'Marker: type × state (Figma Map Marker)',
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={sheet()}><MarkerStates /></div>
      <div className="dark" style={sheet(true)}><MarkerStates /></div>
    </div>
  ),
  decorators: [(S) => <div style={{ padding: 24, width: 1180 }}><S /></div>],
  parameters: { docs: { description: { story: 'Pin, Dot and Cluster in Default, Hover and Selected, in light and dark. Hover is a real `:hover` on every marker; `hovered` pins it here so the board can show it.' } } },
};

export const ControlStates: Story = {
  name: 'Controls: button states (Figma Map Control Button)',
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      {[false, true].map((dark) => (
        <div key={String(dark)} className={dark ? 'dark' : undefined} style={{ ...sheet(dark), display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          {([['Default', {}], ['Hover', { hovered: true }], ['Disabled', { disabled: true }]] as const).map(([name, props]) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 8, background: 'var(--color-bg-surface)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                <MapControlButton icon={IconPlus} aria-label={`${name} button`} {...props} />
              </div>
              <span style={{ font: '500 12px var(--font-sans)', color: 'var(--color-fg-muted)' }}>{name}</span>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 58, height: 133 }}><MapControls locate /></div>
            <span style={{ font: '500 12px var(--font-sans)', color: 'var(--color-fg-muted)' }}>Controls</span>
          </div>
        </div>
      ))}
    </div>
  ),
  parameters: { docs: { description: { story: 'Default, Hover (pinned with `hovered`; real hover works on its own) and Disabled, then the whole Map Controls group with the locate button. Light, then dark.' } } },
};

export const PopupOptions: Story = {
  name: 'Popup: options (Figma Map Popup)',
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {[false, true].map((dark) => (
        <div key={String(dark)} className={dark ? 'dark' : undefined} style={sheet(dark)}>
          <Board w={560} h={310}>
            {[
              [{ title: 'Blue Bottle Coffee', description: '300 Webster St · Open until 6pm', onClose: () => {} }, 'Full'],
              [{ title: 'Blue Bottle Coffee', onClose: () => {} }, 'No description'],
              [{ title: 'Blue Bottle Coffee', description: '300 Webster St · Open until 6pm' }, 'No close'],
              [{ title: 'Blue Bottle Coffee', description: '300 Webster St · Open until 6pm', onClose: () => {}, pointer: false }, 'No pointer'],
            ].map(([props, name], i) => (
              <React.Fragment key={String(name)}>
                <MapPopup {...(props as object)} position={[88 + Math.floor(i / 2) * 150, 140 + (i % 2) * 280]} offset={0} />
                <span style={{ ...label, left: 140 + (i % 2) * 280, top: 112 + Math.floor(i / 2) * 150 }}>{String(name)}</span>
              </React.Fragment>
            ))}
          </Board>
        </div>
      ))}
    </div>
  ),
  decorators: [(S) => <div style={{ padding: 24, width: 1280 }}><S /></div>],
};

export const NoControlsNoAttribution: Story = {
  name: 'Map: controls and attribution off',
  render: () => (
    <Map center={[51.5062, -0.0930]} zoom={15} controls={false} attribution={null} height={320}>
      <MapMarker position={[51.5062, -0.0930]} label="Here" />
    </Map>
  ),
};

export const ControlsAtTheLimit: Story = {
  name: 'Map: zoom limit (disabled control)',
  render: () => <Map center={[51.5062, -0.0930]} zoom={18} maxZoom={18} locate height={320} />,
  parameters: { docs: { description: { story: 'At `maxZoom` the zoom-in button is Disabled, as in the Figma Map Control Button set.' } } },
};

export const CustomDarkTiles: Story = {
  name: 'Map: tileUrlDark',
  render: () => <Map center={[51.5062, -0.0930]} zoom={15} theme="dark" tileUrl="https://tile.openstreetmap.org/{z}/{x}/{y}.png" tileUrlDark="https://tile.openstreetmap.org/{z}/{x}/{y}.png" height={320} />,
  parameters: { docs: { description: { story: 'With `tileUrlDark` the dark map uses tiles from a dark style instead of darkening the light ones. (This demo points it at the same OpenStreetMap tiles to show the plumbing; use your provider\'s dark style.)' } } },
};
