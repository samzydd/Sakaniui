/**
 * MapGlobe
 *
 * 3D dotted globe. Matches the Figma "Map Globe" set (Map page):
 *   variant   land (Dots=Land) dots the continents and ghosts the sea;
 *             ocean (Dots=Ocean) dots the sea and leaves the land dark
 *   layers    atmosphere (a soft fg halo past the limb), sphere (a faint fg
 *             disc), dots in rings of latitude, arcs, markers
 *   colour    everything is fg/default at a depth-based opacity, read from the
 *             element's own computed --color-fg-default, so it follows .dark
 *             wherever that class sits
 *
 * A canvas with no dependencies: the land comes from a 1-degree Natural Earth
 * mask (11 KB, see landMask.ts) and the sphere is an orthographic projection.
 * It spins on its own, can be dragged (with inertia), and pauses while
 * offscreen. Reduced motion keeps it still; dragging still works.
 *
 * Markers follow Map Marker Dot: default, hover (a soft halo, the marker grows a little), selected (a larger
 * halo) and active (a pulse). Hovering one stops the spin so it can be clicked, and a marker with a `label`
 * shows it in a small card while hovered or selected. `theme="dark"` makes just this globe dark, like Figma's
 * explicit Dark mode.
 */

import React from 'react';
import { arcPath, clamp, globeDots, orthographic, sphere, type GlobeDot, type LatLng } from './geo';
import { useThemeTick } from '../../lib/useThemeTick';
import styles from './MapGlobe.module.css';

export interface MapGlobeMarker {
  /** [latitude, longitude] */
  position: LatLng;
  /** Draws a pulsing ring around it. */
  active?: boolean;
  /** The larger halo, for the marker the user picked. */
  selected?: boolean;
  /** Shows the hover appearance without a pointer (documentation and visual tests). Real hover works on its own. */
  hovered?: boolean;
  /** Name shown in a small card above the marker while it is hovered or selected; also its accessible name. */
  label?: string;
}

export interface MapGlobeArc {
  from: LatLng;
  to: LatLng;
}

export interface MapGlobeProps {
  /** Which part gets the bright dots. Defaults to "land". */
  variant?: 'land' | 'ocean';
  /** The place facing the viewer at first, as [latitude, longitude]. */
  center?: LatLng;
  markers?: MapGlobeMarker[];
  arcs?: MapGlobeArc[];
  /** Spin on its own. Defaults to true (off under reduced motion). */
  autoRotate?: boolean;
  /** Degrees per second. Defaults to 6. */
  rotationSpeed?: number;
  /** Let people drag to spin it. Defaults to true. */
  draggable?: boolean;
  /** The soft halo past the edge. Defaults to true. */
  atmosphere?: boolean;
  /** Degrees between dots; smaller is denser. Defaults to 1.3. */
  dotSpacing?: number;
  /**
   * "auto" follows the surrounding theme. "dark" draws light dots wherever the globe sits, for a globe on a
   * dark surface inside a light page. (The globe has no background of its own; it takes the colour behind it.)
   */
  theme?: 'auto' | 'dark';
  /** Called when a marker is clicked or activated from the keyboard (markers with a `label` get a hidden button). */
  onMarkerClick?: (index: number, marker: MapGlobeMarker) => void;
  /** Called when the pointer or keyboard focus moves onto a marker, and with null when it leaves. */
  onMarkerHover?: (index: number | null) => void;
  /** Accessible description. Defaults to "Globe". */
  'aria-label'?: string;
  className?: string;
}

const BANDS = 8;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Any CSS colour -> "r,g,b", via a canvas, which normalises every syntax it can paint. */
function rgbOf(color: string, probe: CanvasRenderingContext2D) {
  probe.fillStyle = '#000';
  probe.fillStyle = color;
  const v = String(probe.fillStyle);
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)).join(',');
  const m = v.match(/[\d.]+/g);
  return m ? m.slice(0, 3).join(',') : '20,20,20';
}

export const MapGlobe: React.FC<MapGlobeProps> = ({
  variant = 'land',
  center = [15, 90],
  markers = [],
  arcs = [],
  autoRotate = true,
  rotationSpeed = 6,
  draggable = true,
  atmosphere = true,
  dotSpacing = 1.3,
  theme = 'auto',
  onMarkerClick,
  onMarkerHover,
  'aria-label': ariaLabel = 'Globe',
  className,
}) => {
  const wrap = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const themeTick = useThemeTick();
  const dots = React.useMemo<GlobeDot[]>(() => globeDots(dotSpacing), [dotSpacing]);
  const arcPts = React.useMemo(() => arcs.map((a) => arcPath(a.from, a.to)), [arcs]);
  const view = React.useRef({ rot: center[1], tilt: clamp(center[0], -60, 60), vr: 0, vt: 0, dragging: false, idleUntil: 0 });
  const state = React.useRef({ rgb: '20,20,20', surface: '255,255,255', border: '230,230,230', font: 'sans-serif', visible: true, size: 0, hits: [] as { i: number; x: number; y: number }[] });
  const live = React.useRef({ markers, arcPts, variant, atmosphere, autoRotate, rotationSpeed });
  live.current = { markers, arcPts, variant, atmosphere, autoRotate, rotationSpeed };
  const callbacks = React.useRef({ onMarkerClick, onMarkerHover });
  callbacks.current = { onMarkerClick, onMarkerHover };
  /** The marker under the pointer or keyboard focus, or null. */
  const hover = React.useRef<number | null>(null);
  const setHover = (i: number | null) => {
    if (hover.current === i) return;
    hover.current = i;
    if (wrap.current) wrap.current.style.cursor = i != null ? 'pointer' : '';
    callbacks.current.onMarkerHover?.(i);
  };

  // colour follows the theme
  React.useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return;
    const cs = getComputedStyle(c);
    const token = (name: string, fallback: string) => rgbOf(cs.getPropertyValue(name).trim() || fallback, probe);
    state.current.rgb = rgbOf(cs.getPropertyValue('--color-fg-default').trim() || cs.color, probe);
    state.current.surface = token('--color-bg-surface', '#ffffff');
    state.current.border = token('--color-border-subtle', '#e5e5e5');
    state.current.font = cs.fontFamily || 'sans-serif';
  }, [themeTick, theme]);

  React.useEffect(() => {
    const c = canvas.current, w = wrap.current;
    if (!c || !w) return;
    const g = c.getContext('2d');
    if (!g) return;
    let raf = 0, last = performance.now(), t0 = last;

    const resize = () => {
      const s = w.clientWidth, dpr = Math.min(2, window.devicePixelRatio || 1);
      state.current.size = s;
      c.width = Math.round(s * dpr); c.height = Math.round(s * dpr);
      c.style.width = `${s}px`; c.style.height = `${s}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(w);
    resize();
    const io = new IntersectionObserver(([e]) => { state.current.visible = e.isIntersecting; });
    io.observe(w);

    const draw = (now: number) => {
      const S = state.current.size;
      if (!S) return;
      const L = live.current, v = view.current, rgb = state.current.rgb;
      const R = S * 0.42, cx = S / 2, cy = S / 2, px = S / 480;
      const P = orthographic(v.rot, v.tilt);
      g.clearRect(0, 0, S, S);
      if (L.atmosphere) {
        const halo = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.16);
        halo.addColorStop(0, `rgba(${rgb},0.11)`); halo.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 1.16, 0, Math.PI * 2); g.fill();
      }
      const body = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, `rgba(${rgb},0.07)`); body.addColorStop(1, `rgba(${rgb},0.02)`);
      g.fillStyle = body; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();

      // dots, batched into depth bands so each band is one fill
      const lit: Path2D[] = Array.from({ length: BANDS }, () => new Path2D());
      const dim = new Path2D();
      const ocean = L.variant === 'ocean';
      for (const d of dots) {
        const p = P(d.cp, d.sp, d.lam);
        if (p.z <= 0) continue;
        const depth = Math.pow(p.z, 0.55);
        const x = cx + R * p.x, y = cy - R * p.y;
        if (ocean ? !d.land : d.land) {
          const r = 1.15 * px * (0.6 + 0.4 * depth);
          const path = lit[Math.min(BANDS - 1, Math.floor(depth * BANDS))];
          path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2);
        } else {
          const r = 0.8 * px * (0.6 + 0.4 * depth);
          dim.moveTo(x + r, y); dim.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      g.fillStyle = `rgba(${rgb},0.12)`; g.fill(dim);
      lit.forEach((path, i) => { g.fillStyle = `rgba(${rgb},${0.22 + 0.78 * ((i + 0.5) / BANDS)})`; g.fill(path); });

      // arcs: near side only, clipped to the disc, with a bright pulse travelling along each
      g.lineCap = 'round';
      const time = (now - t0) / 1000;
      L.arcPts.forEach((pts, ai) => {
        const head = ((time / 2.6 + ai * 0.37) % 1) * (pts.length - 1);
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const p0 = P(a.cp, a.sp, a.lam), p1 = P(b.cp, b.sp, b.lam);
          const zmin = Math.min(p0.z, p1.z);
          const X1 = p1.x * b.h, Y1 = p1.y * b.h;
          if (zmin < 0.04 || (Math.hypot(X1, Y1) > 0.995 && zmin < 0.35)) continue;
          const fade = Math.min(1, (zmin - 0.04) / 0.25);
          const glow = Math.max(0, 1 - Math.abs(i - head) / 6);
          g.strokeStyle = `rgba(${rgb},${(0.28 + 0.4 * Math.sin((Math.PI * i) / pts.length) + 0.5 * glow) * fade})`;
          g.lineWidth = (1.1 + 1.1 * glow) * px;
          g.beginPath(); g.moveTo(cx + R * p0.x * a.h, cy - R * p0.y * a.h); g.lineTo(cx + R * X1, cy - R * Y1); g.stroke();
        }
      });

      // markers, matching Map Marker Dot: core, 2px ring in the background colour, a halo when hovered or
      // selected (Hover, Selected), a pulse when active
      const hits: { i: number; x: number; y: number }[] = [];
      const tips: { x: number; y: number; label: string; k: number }[] = [];
      L.markers.forEach((m, i) => {
        const s = sphere(m.position), p = P(s.cp, s.sp, s.lam);
        if (p.z <= 0.06) return;
        const x = cx + R * p.x, y = cy - R * p.y, k = Math.min(1, (p.z - 0.06) / 0.2);
        hits.push({ i, x, y });
        const picked = !!m.selected, hot = !!m.hovered || hover.current === i;
        if (picked || hot) {
          g.fillStyle = `rgba(${rgb},${(picked ? 0.2 : 0.14) * k})`;
          g.beginPath(); g.arc(x, y, (picked ? 15 : 11) * px, 0, Math.PI * 2); g.fill();
          if (m.label) tips.push({ x, y, label: m.label, k });
        }
        if (m.active) {
          const pulse = (time % 2) / 2;
          g.strokeStyle = `rgba(${rgb},${0.5 * (1 - pulse) * k})`; g.lineWidth = 1.5 * px;
          g.beginPath(); g.arc(x, y, (5 + 14 * pulse) * px, 0, Math.PI * 2); g.stroke();
          g.fillStyle = `rgba(${rgb},${0.16 * k})`; g.beginPath(); g.arc(x, y, 9 * px, 0, Math.PI * 2); g.fill();
        }
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(x, y, (picked ? 7 : hot ? 6.5 : 5.5) * px, 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(${rgb},${k})`; g.beginPath(); g.arc(x, y, (picked ? 5 : hot ? 4.5 : 3.5) * px, 0, Math.PI * 2); g.fill();
      });
      state.current.hits = hits;

      // labels: a small card above the marker (below it when there is no room), like Map Popup
      for (const t of tips) {
        g.font = `500 ${12 * px}px ${state.current.font}`;
        const w = g.measureText(t.label).width + 16 * px, h = 24 * px, gap = 16 * px;
        const lx = clamp(t.x - w / 2, 4 * px, S - w - 4 * px);
        const ly = t.y - gap - h < 4 * px ? t.y + gap : t.y - gap - h;
        g.save();
        g.globalAlpha = t.k;
        g.shadowColor = 'rgba(0,0,0,0.18)'; g.shadowBlur = 8 * px; g.shadowOffsetY = 2 * px;
        g.fillStyle = `rgb(${state.current.surface})`;
        g.beginPath(); if (g.roundRect) g.roundRect(lx, ly, w, h, 6 * px); else g.rect(lx, ly, w, h); g.fill();
        g.shadowColor = 'transparent';
        g.strokeStyle = `rgb(${state.current.border})`; g.lineWidth = px; g.stroke();
        g.fillStyle = `rgb(${rgb})`; g.textBaseline = 'middle';
        g.fillText(t.label, lx + 8 * px, ly + h / 2 + px * 0.5);
        g.restore();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = view.current, L = live.current;
      if (!v.dragging) {
        // inertia from a drag, then back to the gentle spin once it settles
        v.rot += v.vr * dt; v.tilt = clamp(v.tilt + v.vt * dt, -60, 60);
        v.vr *= Math.pow(0.04, dt); v.vt *= Math.pow(0.04, dt);
        if (L.autoRotate && !reduced() && now > v.idleUntil && hover.current == null) v.rot += L.rotationSpeed * dt;
      }
      if (state.current.visible) draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [dots]);

  /* markers: hover, click; drag to spin */
  const hitAt = (clientX: number, clientY: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return null;
    const x = clientX - r.left, y = clientY - r.top, reach = Math.max(10, (state.current.size / 480) * 12);
    let best: number | null = null, bestD = reach;
    for (const h of state.current.hits) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d <= bestD) { best = h.i; bestD = d; }
    }
    return best;
  };
  const drag = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const press = React.useRef<{ x: number; y: number; hit: number | null } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const hit = hitAt(e.clientX, e.clientY);
    press.current = { x: e.clientX, y: e.clientY, hit };
    setHover(hit);
    if (!draggable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    view.current.dragging = true; view.current.vr = 0; view.current.vt = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const pr = press.current;
    if (pr && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 4) pr.hit = null; // it was a drag, not a click
    const d = drag.current;
    if (!d) { if (!pr) setHover(hitAt(e.clientX, e.clientY)); return; }
    const v = view.current, k = 180 / Math.max(1, state.current.size * 0.84 * Math.PI) * 1.6;
    const dx = e.clientX - d.x, dy = e.clientY - d.y, dt = Math.max(1, performance.now() - d.t) / 1000;
    v.rot -= dx * k; v.tilt = clamp(v.tilt + dy * k, -60, 60);
    v.vr = (-dx * k) / dt; v.vt = (dy * k) / dt;
    d.x = e.clientX; d.y = e.clientY; d.t = performance.now();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const pr = press.current;
    press.current = null;
    if (pr && pr.hit != null && e.type === 'pointerup') callbacks.current.onMarkerClick?.(pr.hit, live.current.markers[pr.hit]);
    if (!drag.current) return;
    drag.current = null;
    const v = view.current;
    v.dragging = false; v.idleUntil = performance.now() + 1500;
    if (reduced()) { v.vr = 0; v.vt = 0; }
  };

  return (
    <div
      ref={wrap}
      className={[styles.globe, draggable ? styles['globe--draggable'] : '', theme === 'dark' ? 'dark' : '', className ?? ''].filter(Boolean).join(' ')}
      role={onMarkerClick ? 'group' : 'img'}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => { if (!press.current) setHover(null); }}
    >
      <canvas ref={canvas} className={styles.canvas} aria-hidden={onMarkerClick ? true : undefined} />
      {onMarkerClick && markers.map((m, i) => m.label && (
        <button key={i} type="button" className={styles.srOnly} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onMarkerClick(i, m)}>
          {m.label}
        </button>
      ))}
    </div>
  );
};

MapGlobe.displayName = 'MapGlobe';
export default MapGlobe;
