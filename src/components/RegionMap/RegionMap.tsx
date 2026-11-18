/**
 * RegionMap
 *
 * A choropleth: regions (states, countries, any shapes you pass) shaded by a value, with a hover card and a click to
 * zoom into one region. Plain SVG, no map library and no tiles; the shapes are data (`regions`), so it is not tied to
 * the United States. `@sakaniui/react/regions/us` (and /uk, /es, /de, /ca, /au) ship the outlines.
 *
 *   shading     `values` by region id, binned by `scale.breaks` into the chart blue (or blue + orange when
 *               `scale.diverging`). A region without a value is drawn in a neutral tone.
 *   hover       a 1.5px outline on the region and a card at the pointer (`renderTooltip`, default: name + value).
 *   zoom        `selected` (controlled) or `defaultSelected`: the view eases to that region and its neighbours stay
 *               in frame. Click a region to select it, click it again or press Escape to go back out. Reduced motion
 *               jumps instead of easing.
 *   keyboard    one tab stop; arrow keys move between regions, Enter or Space selects, Escape clears.
 *
 * Put `RegionMapLegend` under it (same `scale`) for the colour key.
 */

import React from 'react';
import { binColor, binIndex, type RegionScale } from './scale';
import type { RegionShape } from './types';
import { useReducedMotion } from '../../lib/useReducedMotion';
import styles from './RegionMap.module.css';

export type { RegionShape } from './types';

type Box = [number, number, number, number];

export interface RegionMapProps {
  /** The shapes to draw, e.g. `US_STATES`. */
  regions: RegionShape[];
  /** The coordinate box the shapes live in, e.g. `US_STATES_VIEWBOX`. */
  viewBox: Box;
  /** The value for each region, by id. Missing or null draws the neutral tone. */
  values?: Record<string, number | null | undefined>;
  /** How values map to colours. Left out: no shading. */
  scale?: RegionScale;
  /** Controlled selection: the id of the zoomed region, or null for the whole map. */
  selected?: string | null;
  /** Uncontrolled initial selection. */
  defaultSelected?: string | null;
  /** Called when the selection changes (a click, Enter or Space, Escape). */
  onSelectedChange?: (id: string | null) => void;
  /** The hover card for a region. Default: the name and its value through `formatValue`. */
  renderTooltip?: (region: RegionShape, value: number | null) => React.ReactNode;
  /** Formats a value for the default card and the screen-reader label. Default: `String(value)`. */
  formatValue?: (value: number) => string;
  /** Called with the id of the region under the pointer or keyboard focus, and null when it leaves. */
  onHoverChange?: (id: string | null) => void;
  /** Outline a region from outside (a list row, a legend), without a card. */
  hovered?: string | null;
  /** Fade every region whose id is not in this list (the band a legend segment names). Null: none faded. */
  dimExcept?: string[] | null;
  /** Shimmer the map while data loads. */
  loading?: boolean;
  /** Accessible name for the map. */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ZOOM_MS = 560;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The view that frames one region with room around it, at the same aspect as the full map. */
function viewFor(box: Box, full: Box): Box {
  const aspect = full[2] / full[3];
  const [bx, by, bw, bh] = box;
  let w = Math.max(bw * 1.7, bh * 1.7 * aspect);
  w = Math.min(full[2], Math.max(full[2] / 9, w));
  const h = w / aspect;
  return [bx + bw / 2 - w / 2, by + bh / 2 - h / 2, w, h];
}

export const RegionMap: React.FC<RegionMapProps> = ({
  regions,
  viewBox,
  values,
  scale,
  selected: selectedProp,
  defaultSelected = null,
  onSelectedChange,
  renderTooltip,
  formatValue = String,
  onHoverChange,
  hovered,
  dimExcept,
  loading,
  'aria-label': ariaLabel = 'Map',
  className,
  style,
}) => {
  const reduced = useReducedMotion();
  const controlled = selectedProp !== undefined;
  const [inner, setInner] = React.useState<string | null>(defaultSelected);
  const selected = controlled ? selectedProp : inner;
  const select = (id: string | null) => {
    if (!controlled) setInner(id);
    onSelectedChange?.(id);
  };

  const byId = React.useMemo(() => new Map(regions.map((r) => [r.id, r])), [regions]);
  const full = viewBox;
  const target = React.useMemo<Box>(() => {
    const r = selected ? byId.get(selected) : undefined;
    return r ? viewFor(r.box, full) : full;
  }, [selected, byId, full]);

  // ease the view toward the target
  const [view, setView] = React.useState<Box>(target);
  const viewRef = React.useRef<Box>(target);
  const raf = React.useRef(0);
  React.useEffect(() => {
    cancelAnimationFrame(raf.current);
    const from = viewRef.current;
    if (reduced || from.every((v, i) => Math.abs(v - target[i]) < 0.01)) {
      viewRef.current = target;
      setView(target);
      return undefined;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ZOOM_MS);
      const e = easeInOut(p);
      const next = from.map((v, i) => v + (target[i] - v) * e) as Box;
      viewRef.current = next;
      setView(next);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced]);

  // hover card
  const wrap = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = React.useState<{ id: string; x: number; y: number } | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const move = (id: string, e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Inside a scaled ancestor (a transform: scale() preview) the pointer is in screen pixels but the card is placed in
    // the map's own pixels: divide by the scale so the card stays under the pointer.
    const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
    setHover({ id, x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k });
  };
  const cardId = hover?.id ?? focusId;
  const lastHover = React.useRef<string | null>(null);
  React.useEffect(() => {
    const id = cardId ?? null;
    if (lastHover.current !== id) {
      lastHover.current = id;
      onHoverChange?.(id);
    }
  }, [cardId, onHoverChange]);
  const dimSet = React.useMemo(() => (dimExcept ? new Set(dimExcept) : null), [dimExcept]);
  const outlineId = cardId ?? hovered ?? null;
  const outlineRegion = outlineId ? byId.get(outlineId) : undefined;
  const cardRegion = cardId ? byId.get(cardId) : undefined;
  const wrapW = wrap.current?.offsetWidth ?? 0;
  const wrapH = wrap.current?.offsetHeight ?? 0;

  const valueOf = (id: string): number | null => {
    const v = values?.[id];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const fillOf = (id: string): string | undefined => {
    const v = valueOf(id);
    if (v === null || !scale) return undefined;
    return binColor(binIndex(v, scale.breaks), scale);
  };

  // roving focus + keys
  const order = regions;
  const tabStop = selected && byId.has(selected) ? selected : focusId && byId.has(focusId) ? focusId : order[0]?.id;
  const focusRegion = (id: string) => {
    wrap.current?.querySelector<SVGElement>(`[data-region="${CSS.escape(id)}"]`)?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, id: string) => {
    const i = order.findIndex((r) => r.id === id);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(selected === id ? null : id);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusRegion(order[(i + 1) % order.length].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusRegion(order[(i - 1 + order.length) % order.length].id);
    } else if (e.key === 'Escape' && selected) {
      e.preventDefault();
      select(null);
    }
  };

  const labelFor = (r: RegionShape) => {
    const v = valueOf(r.id);
    return v === null ? r.name : `${r.name}, ${formatValue(v)}`;
  };

  const flipX = hover && wrapW ? hover.x > wrapW * 0.55 : false;
  const flipY = hover && wrapH ? hover.y > wrapH * 0.6 : false;

  return (
    <div
      ref={wrap}
      className={[styles.map, loading ? styles.loading : '', className].filter(Boolean).join(' ')}
      style={style}
      data-selected={selected ? '' : undefined}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        className={styles.svg}
        viewBox={view.map((v) => Math.round(v * 100) / 100).join(' ')}
        role="group"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {regions.map((r) => {
          const fill = fillOf(r.id);
          return (
            <path
              key={r.id}
              d={r.d}
              data-region={r.id}
              data-selected={selected === r.id ? '' : undefined}
              data-dim={dimSet && !dimSet.has(r.id) ? '' : undefined}
              className={styles.region}
              style={fill ? { fill } : undefined}
              role="button"
              tabIndex={tabStop === r.id ? 0 : -1}
              aria-label={labelFor(r)}
              aria-pressed={selected === r.id}
              onPointerEnter={(e) => move(r.id, e)}
              onPointerMove={(e) => move(r.id, e)}
              onClick={() => select(selected === r.id ? null : r.id)}
              onFocus={() => setFocusId(r.id)}
              onBlur={() => setFocusId((f) => (f === r.id ? null : f))}
              onKeyDown={(e) => onKeyDown(e, r.id)}
            />
          );
        })}
        {outlineRegion && <path d={outlineRegion.d} className={styles.outline} pointerEvents="none" />}
      </svg>

      {cardRegion && !loading && (
        <div
          className={styles.card}
          role="tooltip"
          style={
            hover
              ? { left: hover.x, top: hover.y, transform: `translate(${flipX ? 'calc(-100% - 14px)' : '14px'}, ${flipY ? 'calc(-100% - 8px)' : '8px'})` }
              : { left: '50%', top: 12, transform: 'translateX(-50%)' }
          }
        >
          {renderTooltip ? (
            renderTooltip(cardRegion, valueOf(cardRegion.id))
          ) : (
            <>
              <span className={styles.cardName}>{cardRegion.name}</span>
              <span className={styles.cardValue}>{valueOf(cardRegion.id) === null ? 'No data' : formatValue(valueOf(cardRegion.id) as number)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RegionMap;
