/**
 * Map
 *
 * Interactive tile map. Matches the Figma "Map" component (Map page):
 *   container  radius-xl, border/default 1px, bg/subtle behind the tiles
 *   Controls   top-right, 12px in: a zoom group (Map Control Button +, divider,
 *              Map Control Button -) and an optional locate button, 8px apart,
 *              both bg/surface + border/default + radius-md + shadow-md
 *   Attribution bottom-right, 8px in: bg/surface at 85%, radius-sm, caption text
 *   Markers    MapMarker / MapPopup children, placed by latitude and longitude
 *
 * No map library: tiles are plain <img>s on a Web Mercator grid, so the bundle
 * stays small and every visible part is styled with the design tokens. The
 * tile URL is a prop; the default is OpenStreetMap's standard tiles, which are
 * fine for development and light use (their usage policy asks heavy users to
 * bring their own provider). In dark mode the tiles are inverted and muted
 * through --map-tile-filter, which a consumer can override.
 *
 * Live data: MapMarker and MapPopup take `glide` (ms) to slide to a new position instead of jumping,
 * and MapClusterLayer groups thousands of places into counted clusters that open on click.
 *
 * Interaction: drag to pan (with a little inertia), wheel or pinch-zoom on a
 * trackpad anchored at the pointer, double-click to zoom in, and the keyboard
 * when the map has focus (arrows pan, + and - zoom). Reduced motion turns the
 * inertia and the zoom easing off.
 */

import React from 'react';
import { useThemeTick } from '../../lib/useThemeTick';
import { MapControls } from './MapControls';
import { clamp, fromWorld, toWorld, wrapLng, TILE_SIZE, type LatLng } from './geo';
import { MapMarker } from './MapMarker';
import { MapContext, type MapContextValue } from './context';

export { useMapContext } from './context';
import styles from './Map.module.css';

export type { LatLng } from './geo';

export interface MapView { center: LatLng; zoom: number }

export interface MapProps {
  /** Where the map starts, as [latitude, longitude]. Changing it later flies the map there. */
  center?: LatLng;
  /** Starting zoom, 0 (whole world) to maxZoom. Changing it later animates to it. */
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Called whenever the user pans or zooms. */
  onViewChange?: (view: MapView) => void;
  /** Tile URL template with {z}, {x} and {y}. Defaults to OpenStreetMap. */
  tileUrl?: string;
  /**
   * Tiles to use in dark mode, from a provider that has a dark style. Without it the same tiles are
   * darkened with `--map-tile-filter` (flat dark land, blue water, roads darker than the land).
   */
  tileUrlDark?: string;
  /**
   * "auto" follows the surrounding theme (a `.dark` class on <html> or any ancestor). "dark" makes this map dark
   * wherever it sits, like the Figma "Dark" example: tiles, markers, controls and popups all switch.
   */
  theme?: 'auto' | 'dark';
  /** Attribution text required by the tile provider. Pass null to hide it (only if your provider allows). */
  attribution?: React.ReactNode | null;
  /** Show the zoom controls. Defaults to true. */
  controls?: boolean;
  /** Show the locate button (uses the browser's geolocation). Defaults to false. */
  locate?: boolean;
  /** Called with the user's position after the locate button finds it. */
  onLocate?: (position: LatLng) => void;
  /** Called when the locate button cannot find the user (permission denied, no signal, no support). */
  onLocateError?: (error: GeolocationPositionError | Error) => void;
  /** Height in px or any CSS length. Defaults to 400. */
  height?: number | string;
  /** Accessible name for the map region. Defaults to "Map". */
  'aria-label'?: string;
  className?: string;
  /** MapMarker and MapPopup elements. */
  children?: React.ReactNode;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = <>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors</>;
const EASE_MS = 260;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const Map: React.FC<MapProps> = ({
  center = [51.505, -0.09],
  zoom = 12,
  minZoom = 2,
  maxZoom = 18,
  onViewChange,
  tileUrl = OSM_TILES,
  tileUrlDark,
  theme = 'auto',
  attribution = OSM_ATTRIBUTION,
  controls = true,
  locate = false,
  onLocate,
  onLocateError,
  height = 400,
  'aria-label': ariaLabel = 'Map',
  className,
  children,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [view, setView] = React.useState<MapView>({ center, zoom: clamp(zoom, minZoom, maxZoom) });
  const viewRef = React.useRef(view);
  viewRef.current = view;
  const anim = React.useRef(0);
  const [located, setLocated] = React.useState<LatLng | null>(null);

  // Is this map dark right now? Only matters when there are dedicated dark tiles to switch to.
  const themeTick = useThemeTick();
  const [dark, setDark] = React.useState(theme === 'dark');
  React.useLayoutEffect(() => {
    setDark(theme === 'dark' || !!ref.current?.closest('.dark'));
  }, [theme, themeTick]);
  const darkTiles = dark && !!tileUrlDark;
  const tileTemplate = darkTiles ? tileUrlDark! : tileUrl;

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const commit = React.useCallback((next: MapView) => {
    const v = { center: next.center, zoom: clamp(next.zoom, minZoom, maxZoom) };
    viewRef.current = v;
    setView(v);
    onViewChange?.(v);
  }, [minZoom, maxZoom, onViewChange]);

  /** Ease to a view; zoom is interpolated, and the centre moves in world pixels so it tracks the zoom. */
  const animateTo = React.useCallback((target: MapView, anchor?: { x: number; y: number }) => {
    cancelAnimationFrame(anim.current);
    const from = viewRef.current;
    const to = { center: target.center, zoom: clamp(target.zoom, minZoom, maxZoom) };
    if (prefersReducedMotion()) { commit(to); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / EASE_MS), e = 1 - (1 - t) ** 3;
      const z = from.zoom + (to.zoom - from.zoom) * e;
      let c: LatLng;
      if (anchor) {
        // keep the place under the anchor fixed while zooming around it
        c = keepAt(screenToLatLng(anchor, from), anchor, z);
      } else {
        const a = toWorld(from.center, z), b = toWorld(to.center, z);
        c = fromWorld(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, z);
      }
      commit({ center: c, zoom: z });
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, minZoom, maxZoom, size.w, size.h]);

  // Prop changes after mount fly the map to the new place.
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    animateTo({ center, zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);

  React.useEffect(() => () => cancelAnimationFrame(anim.current), []);

  /* screen <-> place, for the current size */
  const screenToLatLng = (p: { x: number; y: number }, v: MapView): LatLng => {
    const c = toWorld(v.center, v.zoom);
    return fromWorld(c.x + p.x - size.w / 2, c.y + p.y - size.h / 2, v.zoom);
  };
  const keepAt = (place: LatLng, p: { x: number; y: number }, z: number): LatLng => {
    const w = toWorld(place, z);
    return fromWorld(w.x - (p.x - size.w / 2), w.y - (p.y - size.h / 2), z);
  };

  /* ---- pointer: drag to pan, with inertia ---- */
  const drag = React.useRef<{ id: number; x: number; y: number; moved: boolean; samples: { x: number; y: number; t: number }[] } | null>(null);
  const panBy = (dx: number, dy: number) => {
    const v = viewRef.current;
    const c = toWorld(v.center, v.zoom);
    commit({ center: fromWorld(c.x - dx, c.y - dy, v.zoom), zoom: v.zoom });
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-map-ui]')) return;
    cancelAnimationFrame(anim.current);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    if (!d.moved) { d.moved = true; ref.current?.setPointerCapture(e.pointerId); }
    d.x = e.clientX; d.y = e.clientY;
    d.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (d.samples.length > 5) d.samples.shift();
    panBy(dx, dy);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved || prefersReducedMotion()) return;
    const a = d.samples[0], b = d.samples[d.samples.length - 1];
    const dt = Math.max(1, b.t - a.t);
    if (performance.now() - b.t > 80) return; // the pointer stopped before letting go
    let vx = ((b.x - a.x) / dt) * 16, vy = ((b.y - a.y) / dt) * 16;
    const glide = () => {
      vx *= 0.9; vy *= 0.9;
      if (Math.hypot(vx, vy) < 0.3) return;
      panBy(vx, vy);
      anim.current = requestAnimationFrame(glide);
    };
    anim.current = requestAnimationFrame(glide);
  };

  /* ---- wheel and double-click zoom, anchored at the pointer ---- */
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const r = el.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      const v = viewRef.current;
      const dz = clamp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002), -0.5, 0.5);
      const z = clamp(v.zoom + dz, minZoom, maxZoom);
      const c0 = toWorld(v.center, v.zoom);
      const place = fromWorld(c0.x + p.x - r.width / 2, c0.y + p.y - r.height / 2, v.zoom);
      const w = toWorld(place, z);
      commit({ center: fromWorld(w.x - (p.x - r.width / 2), w.y - (p.y - r.height / 2), z), zoom: z });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [commit, minZoom, maxZoom]);

  const onDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-map-ui]')) return;
    const r = ref.current!.getBoundingClientRect();
    animateTo({ center: view.center, zoom: Math.round(view.zoom) + 1 }, { x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const k = e.key, PAN = 80;
    if (k === 'ArrowLeft') panBy(PAN, 0);
    else if (k === 'ArrowRight') panBy(-PAN, 0);
    else if (k === 'ArrowUp') panBy(0, PAN);
    else if (k === 'ArrowDown') panBy(0, -PAN);
    else if (k === '+' || k === '=') animateTo({ center: view.center, zoom: Math.round(view.zoom) + 1 });
    else if (k === '-' || k === '_') animateTo({ center: view.center, zoom: Math.round(view.zoom) - 1 });
    else return;
    e.preventDefault();
  };

  const findMe = () => {
    if (!navigator.geolocation) { onLocateError?.(new Error('Geolocation is not supported in this browser.')); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const here: LatLng = [pos.coords.latitude, pos.coords.longitude];
      setLocated(here);
      animateTo({ center: here, zoom: Math.max(view.zoom, 14) });
      onLocate?.(here);
    }, (err) => onLocateError?.(err));
  };

  /* flyTo / fitBounds for children, through refs so their identity stays stable */
  const sizeRef = React.useRef(size);
  sizeRef.current = size;
  const animateRef = React.useRef(animateTo);
  animateRef.current = animateTo;
  const flyTo = React.useCallback((to: LatLng, z?: number) => {
    animateRef.current({ center: to, zoom: z ?? viewRef.current.zoom });
  }, []);
  const fitBounds = React.useCallback((places: LatLng[], padding = 48) => {
    if (!places.length) return;
    const { w, h } = sizeRef.current;
    const lats = places.map((p) => p[0]);
    // longitudes are unwrapped around the first so a group crossing the antimeridian stays together
    const lngs = places.map((p) => places[0][1] + (((p[1] - places[0][1] + 540) % 360) - 180));
    const [s, n, west, east] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const centre: LatLng = [(s + n) / 2, wrapLng((west + east) / 2)];
    // fit at zoom 0, then raise by the room to spare
    const a = toWorld([n, west], 0), b = toWorld([s, east], 0);
    const spanX = Math.max(1e-6, Math.abs(b.x - a.x)), spanY = Math.max(1e-6, Math.abs(b.y - a.y));
    const fit = Math.min(Math.log2(Math.max(1, w - padding * 2) / spanX), Math.log2(Math.max(1, h - padding * 2) / spanY));
    animateRef.current({ center: centre, zoom: places.length === 1 || !Number.isFinite(fit) ? Math.max(viewRef.current.zoom, 14) : Math.floor(fit * 4) / 4 });
  }, []);

  /* ---- tiles ---- */
  const level = clamp(Math.round(view.zoom), 0, maxZoom);
  const scale = 2 ** (view.zoom - level);
  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  if (size.w && size.h) {
    const c = toWorld(view.center, level);
    const half = { x: size.w / 2 / scale, y: size.h / 2 / scale };
    const n = 2 ** level;
    const x0 = Math.floor((c.x - half.x) / TILE_SIZE), x1 = Math.floor((c.x + half.x) / TILE_SIZE);
    const y0 = Math.max(0, Math.floor((c.y - half.y) / TILE_SIZE)), y1 = Math.min(n - 1, Math.floor((c.y + half.y) / TILE_SIZE));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const wx = ((tx % n) + n) % n;
      tiles.push({
        key: `${level}/${tx}/${ty}`,
        src: tileTemplate.replace('{z}', String(level)).replace('{x}', String(wx)).replace('{y}', String(ty)),
        left: (tx * TILE_SIZE - c.x) * scale + size.w / 2,
        top: (ty * TILE_SIZE - c.y) * scale + size.h / 2,
      });
    }
  }
  const tilePx = TILE_SIZE * scale;

  const ctx = React.useMemo<MapContextValue>(() => {
    const c = toWorld(view.center, view.zoom);
    const worldW = TILE_SIZE * 2 ** view.zoom;
    return {
      zoom: view.zoom,
      flyTo,
      fitBounds,
      maxZoom,
      project: (position) => {
        const p = toWorld(position, view.zoom);
        let dx = p.x - c.x;
        // take the nearest copy of the world, so markers near the antimeridian behave
        dx -= Math.round(dx / worldW) * worldW;
        const x = dx + size.w / 2, y = p.y - c.y + size.h / 2;
        const m = 200;
        return x < -m || y < -m || x > size.w + m || y > size.h + m ? null : { x, y };
      },
    };
  }, [view, size.w, size.h, flyTo, fitBounds, maxZoom]);

  return (
    <div
      ref={ref}
      className={[styles.map, theme === 'dark' ? 'dark' : '', className ?? ''].filter(Boolean).join(' ')}
      data-own-dark-tiles={darkTiles ? '' : undefined}
      style={{ height }}
      role="region"
      aria-roledescription="map"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      <div className={styles.tiles} aria-hidden="true">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.src}
            alt=""
            draggable={false}
            className={styles.tile}
            style={{ left: t.left, top: t.top, width: tilePx + 0.5, height: tilePx + 0.5 }}
            onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
          />
        ))}
      </div>

      <MapContext.Provider value={ctx}>
        <div className={styles.overlay}>
          {children}
          {located && <MapMarker position={located} variant="dot" label="Your location" />}
        </div>
      </MapContext.Provider>

      {(controls || locate) && (
        <MapControls
          zoom={controls}
          locate={locate}
          onLocate={findMe}
          zoomInDisabled={view.zoom >= maxZoom}
          zoomOutDisabled={view.zoom <= minZoom}
          onZoomIn={() => animateTo({ center: view.center, zoom: Math.round(view.zoom) + 1 })}
          onZoomOut={() => animateTo({ center: view.center, zoom: Math.round(view.zoom) - 1 })}
        />
      )}

      {attribution != null && <div className={styles.attribution} data-map-ui="">{attribution}</div>}
    </div>
  );
};

Map.displayName = 'Map';
export default Map;
