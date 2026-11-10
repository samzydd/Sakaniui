/**
 * LiquidGlass — Apple-style glass material (the "Liquid" Surface mode), built to
 * match Figma's native Glass effect property for property:
 *
 *   Figma Glass      code token (per variant)            measured behaviour
 *   Refraction 0–1   --liquid-refraction-regular|clear   bend at the rim = refraction × (10.9 + 1.1 × depth) px
 *   Depth            --liquid-depth-regular|clear        the bend reaches 0.8 × depth px in (a curved glass edge)
 *   Dispersion 0–1   --liquid-dispersion-regular|clear   red bends ×(1 + 0.11 d), blue ×(1 − 0.11 d)
 *   Frost            --liquid-frost-regular|clear        blur σ = max(0.65, √(0.47² + (0.45 × frost)²)) px, before the bend
 *   Light intensity  --liquid-light-intensity-*          a 1px rim ADDED to the backdrop (+106 × I where an
 *   Light angle      --liquid-light-angle                 edge faces the light head-on, +101 × I opposite), and a
 *                                                        shade inside lit edges / glow inside far ones fading over
 *                                                        0.75 × depth; edges side-on to the light get none.
 *                                                        Angle in degrees clockwise from the top (−45 = top-left).
 *
 * The numbers come from measuring Figma's own renders: a gradient backdrop shows,
 * pixel by pixel, where the effect samples from, and a flat grey one shows what
 * the light adds. Each property was swept on its own.
 *
 * How it is built: an SVG filter that blurs the backdrop (frost), bends it
 * through a displacement map made for the element's exact size and corner radius
 * (refraction, depth), once per color channel (dispersion), then adds a light
 * map (light). Two ways to feed it:
 *   - Inside a <LiquidBackdrop src=…> (the photo behind the UI is known): each
 *     lens filters its own copy of that image, aligned to the pixel and kept
 *     aligned while it moves. Like Figma, every lens sees the sharp original —
 *     glass stacked on glass still refracts real detail.
 *   - Anywhere else: backdrop-filter: url(#…), which bends whatever is painted
 *     below (so a lens over another lens sees that lens's frost).
 * Chromium only — Safari and Firefox get the frosted fallback
 * (--liquid-fallback-blur) with a CSS rim. Plus: tint (the fill), the outer
 * shadow, and a pointer-following glare (off with reduced motion). With
 * prefers-reduced-transparency it becomes a plain opaque surface, unless it sets reducedTransparency="ignore" (for a decorative
 * showcase that is nothing without the glass).
 *
 * It marks itself data-surface="liquid", so components inside (Sidebar,
 * buttons, cards…) drop their own fill and sit on this material.
 */

import React from 'react';
import styles from './LiquidGlass.module.css';

export type LiquidGlassVariant = 'regular' | 'clear';
/** How much of the backdrop shows through. 'auto' follows the variant
 *  (regular 66%, clear 28%); 'subtle' is Figma's glass/bg-subtle (5%), the
 *  fill of a full-bleed overlay; 'none' is the lens alone. */
export type LiquidGlassTint = 'auto' | 'regular' | 'clear' | 'subtle' | 'none';

/** Figma's Glass effect properties, in Figma's units. */
export interface LiquidGlassEffect {
  /** 0–1 */
  refraction: number;
  /** px */
  depth: number;
  /** 0–1 */
  dispersion: number;
  /** Figma's frost radius */
  frost: number;
  /** 0–1 */
  lightIntensity: number;
  /** degrees, clockwise from the top: -45 = light from the top-left */
  lightAngle: number;
}

interface Params { w: number; h: number; radius: number; bezel: number; bend: number; spread: number; frost: number; intensity: number; reach: number; lx: number; ly: number }

/** Chromium is the only engine that renders SVG filters in backdrop-filter. */
function canRefract(): boolean {
  if (typeof navigator === 'undefined') return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  return !!brands?.some((b) => /Chromium/i.test(b.brand));
}

const mapCache = new Map<string, { map: string; light: string }>();

/** Two images for a rounded rectangle of the element's size:
 *  - map: R/G = x/y sampling offset (128 = none), as a fraction of the bend.
 *    Every edge samples inward along its normal, by a circular-edge profile:
 *    strongest at the rim, gone `bezel` px in.
 *  - light: grey, 128 = nothing, added to the bent backdrop (value − 128).
 *    The rim row gets +106·I·(n·L)^0.86 where the edge faces the light and
 *    +101·I·|n·L|^1.45 where it faces away; rows inside get a shade of
 *    14·I·|n·L| (lit side) or a glow of 11.6·I·|n·L| (far side), fading to 0
 *    at `reach` px.
 *  n is the outward edge normal, L the unit vector toward the light. */
function buildMaps(p: Params): { map: string; light: string } {
  const { w, h, radius, bezel, intensity, reach, lx, ly } = p;
  const key = `${w}x${h}:${radius}:${bezel}:${intensity}:${reach}:${lx.toFixed(3)}:${ly.toFixed(3)}`;
  const hit = mapCache.get(key);
  if (hit) return hit;
  const make = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const mc = make(), lc = make();
  const mctx = mc.getContext('2d'), lctx = lc.getContext('2d');
  if (!mctx || !lctx) return { map: '', light: '' };
  const mimg = mctx.createImageData(w, h), limg = lctx.createImageData(w, h);
  const md = mimg.data, ld = limg.data;
  const r = Math.min(radius, w / 2, h / 2);
  const cx = w / 2, cy = h / 2;
  const band = Math.max(bezel, intensity > 0 ? reach : 0, 1);
  // Neutral everywhere (no bend, no light): only the strip along the edge can differ,
  // so fill once and visit just that strip -- a full-screen lens is ~1M pixels, but
  // only a few percent of them are near an edge. `reach` includes the corner radius,
  // because a point near a rounded corner can be farther than `band` from the box.
  new Uint32Array(md.buffer).fill(0xff808080);
  new Uint32Array(ld.buffer).fill(0xff808080);
  const margin = Math.ceil(band + r + 2);
  for (let y = 0; y < h; y++) {
    const edgeRow = y < margin || y >= h - margin;
    for (let x = 0; x < w; x++) {
      if (!edgeRow && x === margin) { x = Math.max(margin, w - margin); if (x >= w) break; } // jump over the neutral interior
      const px = x + 0.5, py = y + 0.5;
      const qx = Math.abs(px - cx) - (w / 2 - r);
      const qy = Math.abs(py - cy) - (h / 2 - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const outside = Math.hypot(ox, oy);
      const inside = -(outside + Math.min(Math.max(qx, qy), 0) - r); // distance to the edge, inward
      let ex = 0, ey = 0, add = 0;
      if (inside > -1 && inside < band) {
        let nx = 0, ny = 0;
        if (qx > 0 && qy > 0 && outside > 0) { nx = ox / outside; ny = oy / outside; }
        else if (qx > qy) nx = 1; else ny = 1;
        nx *= Math.sign(px - cx) || 1;
        ny *= Math.sign(py - cy) || 1;
        if (inside >= 0 && inside < bezel) {
          // A circular glass edge: very steep at the rim, flat further in. The
          // steep fall folds the content just inside into a magnified band.
          // The outermost pixel row bends half as much as the row inside it
          // (measured 0.46-0.54x in Figma, on every depth and refraction).
          const t = 1 - Math.min(bezel, inside < 1 ? inside + 1 : inside) / bezel;
          const wgt = (1 - Math.sqrt(1 - t * t)) * (inside < 1 ? 0.5 : 1);
          ex = -nx * wgt; ey = -ny * wgt;
        }
        if (intensity > 0) {
          const nl = nx * lx + ny * ly;
          const a = Math.abs(nl);
          if (inside < 1) add = intensity * (nl > 0 ? 106 * Math.pow(a, 0.86) : 101 * Math.pow(a, 1.45));
          else if (reach > 0) add = (nl > 0 ? -14 : 11.6) * intensity * a * Math.max(0, 1 - (inside - 0.5) / reach);
        }
      }
      if (ex === 0 && ey === 0 && add === 0) continue; // already neutral
      const i = (y * w + x) * 4;
      md[i] = 128 + ex * 127; md[i + 1] = 128 + ey * 127;
      const v = Math.max(0, Math.min(255, Math.round(128 + add)));
      ld[i] = v; ld[i + 1] = v; ld[i + 2] = v;
    }
  }
  mctx.putImageData(mimg, 0, 0);
  lctx.putImageData(limg, 0, 0);
  const out = { map: mc.toDataURL(), light: lc.toDataURL() };
  mapCache.set(key, out);
  return out;
}

/* ---------------------------------------------------------------------------
 * LiquidBackdrop: the image behind the glass, shared with every lens inside.
 * ------------------------------------------------------------------------- */

interface Backdrop { src: string; veil?: string; image: string; size: string; position: string; rootRef: React.RefObject<HTMLElement | null> }
const BackdropContext = React.createContext<Backdrop | null>(null);

export interface LiquidBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The image behind the glass, cover-fitted. */
  src: string;
  /** background-position of the image. Default 'center'. */
  position?: string;
  /** A color laid over the image, in the backdrop every lens sees too (a scrim in
   *  dark mode, Figma's 5% overlay fill in light). Any CSS color, var() included. */
  veil?: string;
}

/** The photo (or any image) a liquid-glass UI sits on. Lenses inside refract the
 *  image itself instead of what the browser painted below them. */
export const LiquidBackdrop = React.forwardRef<HTMLDivElement, LiquidBackdropProps>(
  ({ src, position = 'center', veil, style, children, ...rest }, forwarded) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRef = (el: HTMLDivElement | null) => {
      rootRef.current = el;
      if (typeof forwarded === 'function') forwarded(el); else if (forwarded) forwarded.current = el;
    };
    const image = veil ? `linear-gradient(${veil}, ${veil}), url("${src}")` : `url("${src}")`;
    const size = veil ? '100% 100%, cover' : 'cover';
    const value = React.useMemo<Backdrop>(() => ({ src, veil, image, size, position, rootRef }), [src, veil, image, size, position]);
    return (
      <div ref={setRef} {...rest} style={{ backgroundImage: image, backgroundSize: size, backgroundPosition: position, backgroundRepeat: 'no-repeat', ...style }}>
        <BackdropContext.Provider value={value}>{children}</BackdropContext.Provider>
      </div>
    );
  },
);
LiquidBackdrop.displayName = 'LiquidBackdrop';

/* Keeps every lens's copy of the backdrop aligned with the real one. One shared
 * animation-frame loop, woken by anything that can move a lens (scroll, resize,
 * transitions and animations starting or ending, presses) and asleep again once
 * nothing has moved for a few frames. Only transforms are written: no React
 * render per frame. */
const followers = new Set<() => boolean>();
let followFrame = 0;
let stillFrames = 0;
const followTick = () => {
  let moved = false;
  followers.forEach((f) => { if (f()) moved = true; });
  stillFrames = moved ? 0 : stillFrames + 1;
  followFrame = followers.size && stillFrames < 24 ? requestAnimationFrame(followTick) : 0;
};
const wakeFollowers = () => {
  stillFrames = 0;
  if (!followFrame && followers.size) followFrame = requestAnimationFrame(followTick);
};
let followListening = false;
function follow(update: () => boolean) {
  if (!followListening && typeof window !== 'undefined') {
    followListening = true;
    window.addEventListener('scroll', wakeFollowers, { capture: true, passive: true });
    window.addEventListener('resize', wakeFollowers);
    for (const type of ['transitionrun', 'transitionend', 'animationstart', 'animationend', 'pointerdown', 'pointerup']) {
      document.addEventListener(type, wakeFollowers, true);
    }
    // A theme flip changes colors (the veil) without moving anything.
    new MutationObserver(wakeFollowers).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'], subtree: true });
  }
  followers.add(update);
  update();
  wakeFollowers();
  return () => { followers.delete(update); };
}

/** Re-align every lens's backdrop copy right now. Call it after moving lenses
 *  from JavaScript (a spring, a drag) in the same frame, so the photo inside a
 *  lens never trails the lens by a frame. */
export function syncLiquidBackdrop() {
  followers.forEach((f) => f());
  wakeFollowers();
}

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

/** "center 35%" -> fractions [x, y] for a cover-fitted background. */
function positionFractions(pos: string): [number, number] {
  const word: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const parts = pos.trim().split(/\s+/);
  const f = (v: string | undefined) => (v === undefined ? 0.5 : v in word ? word[v] : v.endsWith('%') ? parseFloat(v) / 100 : 0.5);
  if (parts.length === 1 && (parts[0] === 'top' || parts[0] === 'bottom')) return [0.5, f(parts[0])];
  return [f(parts[0]), f(parts[1])];
}

/** Lenses bigger than this (in CSS px²) bake their glass into a canvas. */
const BAKE_AREA = 300 * 300;

const num = (el: Element, name: string, fallback: number) => {
  const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};

export interface UseLiquidGlassOptions {
  enabled?: boolean;
  /** 'off' forces the frosted fallback (e.g. to preview Safari in Chrome). */
  refraction?: 'auto' | 'off';
  /** Re-read the --liquid-* properties when this changes (e.g. an inline effect override). */
  watch?: string;
  /** Inside a <LiquidBackdrop>, refract its image (default). Pass false for an
   *  element that floats over other UI (Modal's card sits over a scrim). */
  source?: boolean;
  /** Inside a <LiquidBackdrop>: 'auto' (default) bakes lenses bigger than 300×300
   *  into a canvas once (they don't move); false keeps the filter live (a big lens
   *  you animate or drag); true always bakes. */
  bake?: boolean | 'auto';
}

/**
 * The material as a hook, for components that own their element (Modal's
 * card). Spread `props` onto the element and render `filter` inside it.
 */
export function useLiquidGlass(ref: React.RefObject<HTMLElement | null>, { enabled = true, refraction = 'auto', watch = '', source = true, bake = 'auto' }: UseLiquidGlassOptions = {}) {
  const rawId = React.useId();
  const id = `liquid-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [params, setParams] = React.useState<Params | null>(null);
  const refracting = enabled && refraction !== 'off' && canRefract();
  const backdrop = React.useContext(BackdropContext);
  const sourced = refracting && source && !!backdrop;
  const copyRef = React.useRef<HTMLSpanElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !refracting) { setParams(null); return undefined; }
    // ResizeObserver reports once on observe and after every size change,
    // before paint -- no animation-frame wait needed (which background tabs
    // throttle). Same-size reports keep the previous params, so no re-render.
    const measure = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h) return;
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      // Figma's properties, in Figma's units...
      const refr = num(el, '--liquid-refraction', 0.8);
      const depth = Math.max(0, num(el, '--liquid-depth', 20));
      const disp = num(el, '--liquid-dispersion', 0);
      const frost = Math.max(0, num(el, '--liquid-frost', 0));
      const intensity = Math.max(0, num(el, '--liquid-light-intensity', 0));
      const angle = (num(el, '--liquid-light-angle', -45) * Math.PI) / 180;
      // ...turned into pixels by the measured rules (see the header). On an
      // element too small for its depth, the lens shrinks to half the smaller
      // side and the bend shrinks with it.
      const bezel0 = 0.8 * depth;
      const bezel = Math.max(1, Math.round(Math.min(bezel0, Math.min(w, h) / 2)));
      const k = bezel0 > 0 ? bezel / bezel0 : 0;
      const next: Params = {
        w, h, radius, bezel,
        bend: refr * (10.9 + 1.1 * depth) * k,
        spread: 0.11 * disp,
        frost: Math.max(0.65, Math.hypot(0.47, 0.45 * frost)), // Figma keeps a little softness even at frost 0
        intensity,
        reach: 0.75 * depth * (k || 1),
        lx: Math.sin(angle), ly: -Math.cos(angle),
      };
      setParams((prev) => (prev && (Object.keys(next) as (keyof Params)[]).every((p) => prev[p] === next[p]) ? prev : next));
    };
    measure(); // now, not only on the observer's first report (which waits for a rendering update)
    // A big lens (a panel that reflows while the sidebar animates) would rebuild its
    // maps and re-bake every frame; it settles first, then measures once. Small lenses
    // keep up frame by frame.
    let settle = 0;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth * el.offsetHeight > BAKE_AREA) {
        window.clearTimeout(settle);
        settle = window.setTimeout(() => { measure(); wakeFollowers(); }, 90);
      } else { measure(); wakeFollowers(); }
    });
    ro.observe(el);
    return () => { window.clearTimeout(settle); ro.disconnect(); };
  }, [ref, refracting, watch]);

  const maps = params ? buildMaps(params) : null;

  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, []);

  const on = refracting && !!params && !!maps?.map;

  // Big lenses (a full-screen overlay, a main panel) don't move, but a live SVG
  // filter over a full-screen element is re-evaluated whenever anything near it
  // repaints -- a hover in the sidebar drops the page to ~15fps. So a big lens
  // runs the same filter ONCE, into a canvas, and shows that; it re-bakes only
  // when its size, position, theme or glass properties change. Small lenses (the
  // ones that glide) keep the live filter.
  const baked = sourced && !!params && (bake === 'auto' ? params.w * params.h > BAKE_AREA : bake);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const probeRef = React.useRef<HTMLSpanElement | null>(null);
  const bakeGen = React.useRef(0);

  // Source mode: keep this lens's copy of the backdrop exactly over the real one
  // (in the lens's own coordinates, so a lens squished by a transform still lines
  // up) -- or, for a baked lens, re-bake when that placement changes.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!sourced || !on || !el || !backdrop || !params || !maps) return undefined;
    let last = '';
    let waits = 0;
    let lastBake = 0;
    let pending = 0;
    const bake = (x: number, y: number, bw: number, bh: number, veil: string) => {
      const gen = ++bakeGen.current;
      loadImage(backdrop.src).then((img) => {
        const canvas = canvasRef.current, filterEl = document.getElementById(`${id}-bake`);
        if (gen !== bakeGen.current || !canvas || !filterEl) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.round(params.w * dpr), H = Math.round(params.h * dpr);
        const src = document.createElement('canvas');
        src.width = W; src.height = H;
        const sctx = src.getContext('2d');
        const ctx = canvas.getContext('2d');
        if (!sctx || !ctx) return;
        // The backdrop as the page draws it: cover-fitted to the backdrop box, at
        // its background-position, then the veil.
        sctx.scale(dpr, dpr);
        sctx.translate(x, y);
        const k = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
        const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
        const [fx, fy] = positionFractions(backdrop.position);
        sctx.drawImage(img, (bw - dw) * fx, (bh - dh) * fy, dw, dh);
        if (veil && veil !== 'rgba(0, 0, 0, 0)' && veil !== 'transparent') { sctx.fillStyle = veil; sctx.fillRect(0, 0, bw, bh); }
        canvas.width = W; canvas.height = H;
        ctx.filter = `url(#${id}-bake)`;
        ctx.drawImage(src, 0, 0);
        ctx.filter = 'none';
      }).catch(() => { /* the image failed: the tint alone still shows */ });
    };
    return follow(() => {
      // The backdrop's ref attaches after its children's layout effects, so on the
      // first frames it may not be there yet: keep the loop awake until it is.
      const root = backdrop.rootRef.current;
      const copy = copyRef.current;
      if (!root || (!baked && !copy) || (baked && !canvasRef.current)) return ++waits < 120;
      const r = el.getBoundingClientRect(), b = root.getBoundingClientRect();
      const sx = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const sy = el.offsetHeight ? r.height / el.offsetHeight : 1;
      const x = (b.left - r.left) / sx, y = (b.top - r.top) / sy, w = b.width / sx, h = b.height / sy;
      let veil = '';
      if (baked && backdrop.veil && probeRef.current) {
        probeRef.current.style.backgroundColor = backdrop.veil;
        veil = getComputedStyle(probeRef.current).backgroundColor;
      }
      const key = `${x.toFixed(2)},${y.toFixed(2)},${w.toFixed(2)},${h.toFixed(2)},${veil}`;
      if (key === last) return false;
      last = key;
      if (baked) {
        // While it keeps changing (a window resize), bake at most every 120ms, and
        // once more when it settles.
        const now = performance.now();
        clearTimeout(pending);
        if (now - lastBake > 120) { lastBake = now; bake(x, y, w, h, veil); }
        else pending = window.setTimeout(() => { lastBake = performance.now(); bake(x, y, w, h, veil); }, 130);
      } else if (copy) {
        copy.style.width = `${w}px`;
        copy.style.height = `${h}px`;
        copy.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      return true;
    });
  }, [sourced, on, backdrop, ref, baked, params, maps, id]);

  const channel = (row: number) => {
    const m = Array(20).fill(0);
    m[row * 5 + row] = 1; m[18] = 1; // keep one channel + alpha
    return m.join(' ');
  };

  const filter = on && params && maps ? (
    <svg className={styles.defs} width="0" height="0" aria-hidden="true" focusable="false">
      <filter id={id} x="0" y="0" width={params.w} height={params.h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feImage href={maps.map} x="0" y="0" width={params.w} height={params.h} preserveAspectRatio="none" result="map" />
        {/* Frost first, then bend: the bend keeps its sharp rim, as in Figma. */}
        <feGaussianBlur in="SourceGraphic" stdDeviation={params.frost} edgeMode="duplicate" result="frost" />
        {[0, 1, 2].map((c) => (
          <React.Fragment key={c}>
            {/* dispersion: red bends most, blue least */}
            <feDisplacementMap in="frost" in2="map" scale={2 * params.bend * (1 + (1 - c) * params.spread)} xChannelSelector="R" yChannelSelector="G" result={`d${c}`} />
            <feColorMatrix in={`d${c}`} type="matrix" values={channel(c)} result={`c${c}`} />
          </React.Fragment>
        ))}
        <feBlend in="c0" in2="c1" mode="screen" result="c01" />
        <feBlend in="c01" in2="c2" mode="screen" result="bent" />
        {params.intensity > 0 && <>
          {/* light: added to the bent backdrop, (light − 128) */}
          <feImage href={maps.light} x="0" y="0" width={params.w} height={params.h} preserveAspectRatio="none" result="light" />
          <feComposite in="bent" in2="light" operator="arithmetic" k1={0} k2={1} k3={1} k4={-128 / 255} />
        </>}
      </filter>
    </svg>
  ) : null;

  // The same filter at device-pixel scale, for baking into a canvas.
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const bakeFilter = baked && params && maps ? (() => {
    const W = Math.round(params.w * dpr), H = Math.round(params.h * dpr);
    return (
      <svg className={styles.defs} width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={`${id}-bake`} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={maps.map} x="0" y="0" width={W} height={H} preserveAspectRatio="none" result="map" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={params.frost * dpr} edgeMode="duplicate" result="frost" />
          {[0, 1, 2].map((c) => (
            <React.Fragment key={c}>
              <feDisplacementMap in="frost" in2="map" scale={2 * params.bend * dpr * (1 + (1 - c) * params.spread)} xChannelSelector="R" yChannelSelector="G" result={`d${c}`} />
              <feColorMatrix in={`d${c}`} type="matrix" values={channel(c)} result={`c${c}`} />
            </React.Fragment>
          ))}
          <feBlend in="c0" in2="c1" mode="screen" result="c01" />
          <feBlend in="c01" in2="c2" mode="screen" result="bent" />
          {params.intensity > 0 && <>
            <feImage href={maps.light} x="0" y="0" width={W} height={H} preserveAspectRatio="none" result="light" />
            <feComposite in="bent" in2="light" operator="arithmetic" k1={0} k2={1} k3={1} k4={-128 / 255} />
          </>}
        </filter>
      </svg>
    );
  })() : null;

  // Source mode draws the glass itself: the backdrop copy through the filter (the
  // copy fills the square box, the clip rounds the result, so the bend never pulls
  // in empty corners), then the tint over it. A big lens shows its baked canvas.
  const layers = on && sourced && backdrop ? (
    baked ? (
      <>
        {bakeFilter}
        <span className={styles.sourceClip} aria-hidden="true">
          <canvas ref={canvasRef} className={styles.sourceCanvas} />
          <span ref={probeRef} className={styles.probe} />
        </span>
        <span className={styles.fill} aria-hidden="true" />
      </>
    ) : (
      <>
        {filter}
        <span className={styles.sourceClip} aria-hidden="true">
          <span className={styles.source} style={{ filter: `url(#${id})` }}>
            <span ref={copyRef} className={styles.sourceImage} style={{ backgroundImage: backdrop.image, backgroundSize: backdrop.size, backgroundPosition: backdrop.position }} />
          </span>
        </span>
        <span className={styles.fill} aria-hidden="true" />
      </>
    )
  ) : filter;

  return {
    filter: layers,
    refracting: on,
    props: {
      'data-surface': 'liquid',
      'data-refraction': on ? (sourced ? 'source' : 'on') : 'off',
      style: on && !sourced ? { backdropFilter: `url(#${id})` } : undefined,
      onPointerMove,
    } as const,
  };
}

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  /** regular: text-safe tint (panels, sidebars, modals). clear: icons and large labels only. */
  variant?: LiquidGlassVariant;
  /** How much of the backdrop shows through. Default 'auto' (follows `variant`). */
  tint?: LiquidGlassTint;
  /** Corner radius in px. Default 20. */
  radius?: number;
  /** 'off' forces the frosted fallback. */
  refraction?: 'auto' | 'off';
  /** Override any of Figma's Glass properties for this element, in Figma's units
   *  (e.g. { refraction: 0.8, depth: 20, dispersion: 0.4, frost: 1 }). Defaults
   *  come from the variant's --liquid-* tokens. */
  effect?: Partial<LiquidGlassEffect>;
  /** Inside a <LiquidBackdrop>: true (default) refracts the backdrop image;
   *  false bends whatever is painted below instead (UI under a slider knob). */
  source?: boolean;
  /** 'auto' (default): inside a LiquidBackdrop, lenses over 300×300 bake their glass
   *  once (fast; for surfaces that stay put). false: always live (a big lens that moves). */
  bake?: boolean | 'auto';
  /** Squish slightly when pressed (buttons, toolbar pills). */
  interactive?: boolean;
  /** 'respect' (default): with prefers-reduced-transparency the glass becomes a plain opaque surface. 'ignore': keep the full
   *  glass anyway. Only for a decorative showcase that means nothing without it; never for a surface that holds the user's content. */
  reducedTransparency?: 'respect' | 'ignore';
}

/** An effect override as the custom properties the hook reads. */
const effectVars = (e?: Partial<LiquidGlassEffect>): React.CSSProperties => {
  if (!e) return {};
  const v: Record<string, number> = {};
  if (e.refraction !== undefined) v['--liquid-refraction'] = e.refraction;
  if (e.depth !== undefined) v['--liquid-depth'] = e.depth;
  if (e.dispersion !== undefined) v['--liquid-dispersion'] = e.dispersion;
  if (e.frost !== undefined) v['--liquid-frost'] = e.frost;
  if (e.lightIntensity !== undefined) v['--liquid-light-intensity'] = e.lightIntensity;
  if (e.lightAngle !== undefined) v['--liquid-light-angle'] = e.lightAngle;
  return v as React.CSSProperties;
};

export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  ({ variant = 'regular', tint = 'auto', radius = 20, refraction = 'auto', effect, source = true, bake = 'auto', interactive, reducedTransparency = 'respect', className, style, children, onPointerMove, ...rest }, forwarded) => {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const setRef = (el: HTMLDivElement | null) => {
      ref.current = el;
      if (typeof forwarded === 'function') forwarded(el); else if (forwarded) forwarded.current = el;
    };
    const glass = useLiquidGlass(ref, { refraction, source, bake, watch: effect ? JSON.stringify(effect) : '' });
    return (
      <div
        ref={setRef}
        {...rest}
        {...glass.props}
        data-bare={children == null || children === false ? '' : undefined}
        data-reduced-transparency={reducedTransparency === 'ignore' ? 'ignore' : undefined}
        className={[styles.liquid, styles[variant], tint !== 'auto' ? styles[`tint-${tint}`] : '', interactive ? styles.interactive : '', className ?? ''].filter(Boolean).join(' ')}
        style={{ borderRadius: radius, ...effectVars(effect), ...glass.props.style, ...style }}
        onPointerMove={(e) => { glass.props.onPointerMove(e); onPointerMove?.(e); }}
      >
        {glass.filter}
        {children}
      </div>
    );
  },
);
LiquidGlass.displayName = 'LiquidGlass';

/** Class names for components that apply the material via the hook. */
export const liquidGlassClass = (variant: LiquidGlassVariant = 'regular', tint: LiquidGlassTint = 'auto') =>
  [styles.liquid, styles[variant], tint !== 'auto' ? styles[`tint-${tint}`] : ''].filter(Boolean).join(' ');

export default LiquidGlass;
