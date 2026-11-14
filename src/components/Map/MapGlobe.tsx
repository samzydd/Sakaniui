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
 * Markers follow Map Globe Marker: Size (Sm, Md, Lg: bigger means more, so a marker can show a value), Rank (a numbered
 * chip that matches a ranked list beside the globe), Status (watch adds a dashed amber ring, so a warning is never only
 * a colour) and State: default, hover (a soft halo, the marker grows a little), selected (a larger halo) and active
 * (a pulse). Change `center` and the globe turns to face the new place; `zoom` scales the sphere; `renderMarkerCard`
 * puts your own card on the hovered or selected marker. Hovering one stops the spin so it can be clicked, and a marker with a `label`
 * shows it in a small card while hovered or selected. `theme="dark"` makes just this globe dark, like Figma's
 * explicit Dark mode.
 */

import React from 'react';
import { arcPath, clamp, globeDots, orthographic, sphere, type GlobeDot, type LatLng } from './geo';
import { useThemeTick } from '../../lib/useThemeTick';
import styles from './MapGlobe.module.css';

export type MapGlobeMarkerSize = 'sm' | 'md' | 'lg';
const SIZE_SCALE: Record<MapGlobeMarkerSize, number> = { sm: 1, md: 1.6, lg: 2.3 };

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
  /** Figma Size. Scales the dot, its ring and its halo: sm 1x, md 1.6x, lg 2.3x. Use it to show a value (bigger = more). Defaults to "sm". */
  size?: MapGlobeMarkerSize;
  /** A numbered chip beside the marker (Figma Rank=Number), matching the rank in a list next to the globe. */
  rank?: number;
  /** "watch" adds a dashed amber ring (Figma Status=Watch): a warning that does not rely on colour alone. Defaults to "healthy". */
  status?: 'healthy' | 'watch';
}

export interface MapGlobeArc {
  from: LatLng;
  to: LatLng;
}

export interface MapGlobeProps {
  /** Which part gets the bright dots. Defaults to "land". */
  variant?: 'land' | 'ocean';
  /**
   * The place facing the viewer, as [latitude, longitude]. It is where the globe starts; when it changes, the globe
   * turns to face the new place (the short way round, over about 0.9s; at once under reduced motion).
   */
  center?: LatLng;
  /** How big the sphere is, 1 being the default. Changes ease in. Between 0.7 and 2.2; above about 1.19 the sphere reaches the edge of its box and is cropped. */
  zoom?: number;
  /**
   * Your own card on the hovered marker, or the selected one when nothing is hovered. The globe keeps it on the
   * marker as the globe turns (above it, or below when there is no room) and hides it while the marker is on the far
   * side. It does not take the pointer, and it is hidden from assistive tech: put the same information in a list.
   * Replaces the small text label.
   */
  renderMarkerCard?: (index: number, marker: MapGlobeMarker) => React.ReactNode;
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
  zoom = 1,
  renderMarkerCard,
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
  const view = React.useRef({
    rot: center[1], tilt: clamp(center[0], -60, 60), vr: 0, vt: 0, dragging: false, idleUntil: 0, zoom: clamp(zoom, 0.7, 2.2),
    glide: null as null | { fromRot: number; fromTilt: number; dRot: number; dTilt: number; t0: number; dur: number },
  });
  const state = React.useRef({ rgb: '20,20,20', surface: '255,255,255', border: '230,230,230', font: 'sans-serif', visible: true, size: 0, hits: [] as { i: number; x: number; y: number; k: number; r: number }[], warning: '247,144,9' });
  const live = React.useRef({ markers, arcPts, variant, atmosphere, autoRotate, rotationSpeed, zoom: clamp(zoom, 0.7, 2.2), card: !!renderMarkerCard });
  live.current = { markers, arcPts, variant, atmosphere, autoRotate, rotationSpeed, zoom: clamp(zoom, 0.7, 2.2), card: !!renderMarkerCard };
  const callbacks = React.useRef({ onMarkerClick, onMarkerHover });
  callbacks.current = { onMarkerClick, onMarkerHover };
  /** The marker under the pointer or keyboard focus, or null. */
  const hover = React.useRef<number | null>(null);
  // the marker the card sits on: the hovered one, else the selected one
  const selectedIndex = markers.findIndex((m) => m.selected);
  const [cardIdx, setCardIdx] = React.useState<number | null>(null);
  const cardIdxRef = React.useRef<number | null>(null);
  cardIdxRef.current = renderMarkerCard ? cardIdx : null;
  const cardEl = React.useRef<HTMLDivElement>(null);
  const setHover = (i: number | null) => {
    if (hover.current === i) return;
    hover.current = i;
    if (live.current.card) setCardIdx(i ?? (live.current.markers.findIndex((m) => m.selected) >= 0 ? live.current.markers.findIndex((m) => m.selected) : null));
    if (wrap.current) wrap.current.style.cursor = i != null ? 'pointer' : '';
    callbacks.current.onMarkerHover?.(i);
  };

  React.useEffect(() => {
    if (renderMarkerCard) setCardIdx(hover.current ?? (selectedIndex >= 0 ? selectedIndex : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, !!renderMarkerCard]);

  // turn to face a new `center`
  const firstCenter = React.useRef(true);
  React.useEffect(() => {
    if (firstCenter.current) { firstCenter.current = false; return; }
    const v = view.current, toRot = center[1], toTilt = clamp(center[0], -60, 60);
    v.vr = 0; v.vt = 0;
    if (reduced()) { v.rot = toRot; v.tilt = toTilt; v.glide = null; return; }
    v.glide = { fromRot: v.rot, fromTilt: v.tilt, dRot: ((toRot - v.rot + 540) % 360) - 180, dTilt: toTilt - v.tilt, t0: performance.now(), dur: 900 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

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
    state.current.warning = token('--color-warning-solid', '#f79009');
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
      const R = S * 0.42 * v.zoom, cx = S / 2, cy = S / 2, px = S / 480;
      const P = orthographic(v.rot, v.tilt);
      g.clearRect(0, 0, S, S);
      if (L.atmosphere) {
        // the glow fades out by the canvas edge, so a zoomed-in globe never shows a cut-off glow
        const inner = Math.min(R * 0.9, S / 2 - 2), outer = Math.max(inner + 1, Math.min(R * 1.16, S / 2));
        const halo = g.createRadialGradient(cx, cy, inner, cx, cy, outer);
        halo.addColorStop(0, `rgba(${rgb},0.11)`); halo.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, outer, 0, Math.PI * 2); g.fill();
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
      const hits: { i: number; x: number; y: number; k: number; r: number }[] = [];
      const tips: { x: number; y: number; label: string; k: number }[] = [];
      L.markers.forEach((m, i) => {
        const s = sphere(m.position), p = P(s.cp, s.sp, s.lam);
        if (p.z <= 0.06) return;
        const x = cx + R * p.x, y = cy - R * p.y, k = Math.min(1, (p.z - 0.06) / 0.2);
        const sz = SIZE_SCALE[m.size ?? 'sm'];
        hits.push({ i, x, y, k, r: 15 * sz * px });
        const picked = !!m.selected, hot = !!m.hovered || hover.current === i;
        if (picked || hot) {
          g.fillStyle = `rgba(${rgb},${(picked ? 0.2 : 0.14) * k})`;
          g.beginPath(); g.arc(x, y, (picked ? 15 : 11) * sz * px, 0, Math.PI * 2); g.fill();
          if (m.label && !L.card) tips.push({ x, y, label: m.label, k });
        }
        if (m.active) {
          const pulse = (time % 2) / 2;
          g.strokeStyle = `rgba(${rgb},${0.5 * (1 - pulse) * k})`; g.lineWidth = 1.5 * px;
          g.beginPath(); g.arc(x, y, (5 + 14 * pulse) * sz * px, 0, Math.PI * 2); g.stroke();
          g.fillStyle = `rgba(${rgb},${0.16 * k})`; g.beginPath(); g.arc(x, y, 9 * sz * px, 0, Math.PI * 2); g.fill();
        }
        if (m.status === 'watch') {
          // a dashed ring in the warning colour: the shape says "watch" as well as the colour
          g.save();
          g.setLineDash([3 * px, 3 * px]); g.lineWidth = 1.5 * px; g.strokeStyle = `rgba(${state.current.warning},${k})`;
          g.beginPath(); g.arc(x, y, (5.5 * sz + 5 * Math.min(sz, 1.6)) * px, 0, Math.PI * 2); g.stroke();
          g.restore();
        }
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(x, y, (picked ? 7 : hot ? 6.5 : 5.5) * sz * px, 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(${rgb},${k})`; g.beginPath(); g.arc(x, y, (picked ? 5 : hot ? 4.5 : 3.5) * sz * px, 0, Math.PI * 2); g.fill();
        if (m.rank != null) {
          // the rank chip, up and to the right of the dot (Figma Rank=Number: 18px, the text colour with the surface colour inside)
          const o = (5.5 * sz * 0.7 + 7) * px, cxr = x + o, cyr = y - o;
          g.fillStyle = `rgba(${rgb},${k})`; g.beginPath(); g.arc(cxr, cyr, 9 * px, 0, Math.PI * 2); g.fill();
          g.font = `500 ${11 * px}px ${state.current.font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = `rgba(${state.current.surface},${k})`; g.fillText(String(m.rank), cxr, cyr + px * 0.5);
          g.textAlign = 'start';
        }
      });
      state.current.hits = hits;

      // the card: kept on its marker, above it (below when there is no room), hidden on the far side
      const card = cardEl.current;
      if (card) {
        const hit = cardIdxRef.current == null ? null : hits.find((h) => h.i === cardIdxRef.current);
        if (!hit) card.style.opacity = '0';
        else {
          const w = card.offsetWidth, h = card.offsetHeight, gap = hit.r + 6;
          const left = clamp(hit.x, w / 2 + 4, S - w / 2 - 4);
          const top = hit.y - gap - h < 4 ? hit.y + gap : hit.y - gap - h;
          card.style.transform = `translate(${(left - w / 2).toFixed(1)}px, ${top.toFixed(1)}px)`;
          card.style.opacity = String(hit.k);
        }
      }

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
      v.zoom = reduced() ? L.zoom : v.zoom + (L.zoom - v.zoom) * (1 - Math.pow(0.002, dt));
      if (v.glide && !v.dragging) {
        const g = v.glide, kk = clamp((now - g.t0) / g.dur, 0, 1), e = kk < 0.5 ? 4 * kk * kk * kk : 1 - Math.pow(-2 * kk + 2, 3) / 2;
        v.rot = g.fromRot + g.dRot * e; v.tilt = g.fromTilt + g.dTilt * e; v.idleUntil = now + 1500;
        if (kk >= 1) v.glide = null;
      } else if (!v.dragging) {
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
    let best: number | null = null, bestD = Infinity;
    for (const h of state.current.hits) {
      // a bigger marker is a bigger target: its reach grows with its halo
      const d = Math.hypot(h.x - x, h.y - y), within = Math.max(reach, h.r * 0.8);
      if (d <= within && d < bestD) { best = h.i; bestD = d; }
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
    view.current.dragging = true; view.current.vr = 0; view.current.vt = 0; view.current.glide = null;
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

  // arrow keys move between the markers' hidden buttons (they are in rank order when the markers are)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    const btns = Array.from(wrap.current?.querySelectorAll<HTMLButtonElement>('button[data-marker]') ?? []);
    const at = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0 || btns.length < 2) return;
    e.preventDefault();
    btns[(at + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length].focus();
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
      onKeyDown={onKeyDown}
    >
      <canvas ref={canvas} className={styles.canvas} aria-hidden={onMarkerClick ? true : undefined} />
      {onMarkerClick && markers.map((m, i) => m.label && (
        <button key={i} type="button" data-marker="" className={styles.srOnly} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onMarkerClick(i, m)}>
          {m.label}
        </button>
      ))}
      {renderMarkerCard && cardIdx != null && markers[cardIdx] && (
        <div ref={cardEl} className={styles.card} aria-hidden="true">{renderMarkerCard(cardIdx, markers[cardIdx])}</div>
      )}
    </div>
  );
};

MapGlobe.displayName = 'MapGlobe';
export default MapGlobe;
