/**
 * FunnelChart
 *
 * Stages run left to right, narrowing through smooth curved transitions rather than straight diagonal edges (Figma's
 * "Funnel chart" / "Funnel chart hover"). Recharts' native `<Funnel>` only renders a vertical, straight-edged funnel,
 * so this is a hand-rolled SVG, the same "no native fit" call as HeatmapChart.
 *
 * On top of the Figma shape:
 *   - a header with each stage's value and its share of the start,
 *   - a drop-off chip at every step ("↓ 39%"),
 *   - a stream of dots through the band (`flow`): each dot is a visitor, and the share that carries on past a step is
 *     the share of the data that does, so the stream thins where the funnel does,
 *   - hover: the stage goes full strength, the rest dim, and a card gives its value, share and drop-off,
 *   - the band wipes in on mount, and `loading` draws the funnel's silhouette with a soft light gliding through it.
 *
 * Each stage is shaded chart/1 at increasing saturation (first stage palest, last stage full color).
 */

import React from 'react';
import { useChartTokens } from '../../lib/useChartTokens';
import { ChartTooltipCard } from '../../lib/ChartTooltip';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { useReducedMotion } from '../../lib/useReducedMotion';
import styles from './FunnelChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';

export interface FunnelDatum { label: string; value: number; }

export interface FunnelChartProps {
  data: FunnelDatum[];
  size?: ChartSize;
  /** Dots streaming through the band, thinning where the funnel does. Default true; off for reduced motion. */
  flow?: boolean;
  /** Draw the loading state (the funnel's silhouette, a light gliding through it) instead of the chart. */
  loading?: boolean;
  /** How a stage's value is written in the header and the card. Defaults to a compact number (61.2K). */
  formatValue?: (value: number) => string;
  className?: string;
}

const heights: Record<ChartSize, number> = { sm: 120, md: 168, lg: 232, xl: 320 };
const VIEW_W = 560;
const STAGE_MIN_OPACITY = 0.3;
// How far the final stage tapers past its own left edge, for the pointed tip rather than a flat edge.
const TIP_TAPER = 0.55;
const PARTICLES = 54;

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const defaultFormat = (v: number) => compact.format(v);
const pctOf = (v: number, total: number) => (total ? (v / total) * 100 : 0);
const smooth = (t: number) => t * t * (3 - 2 * t);

interface Dot { x: number; lane: number; speed: number; end: number; size: number; }

export const FunnelChart: React.FC<FunnelChartProps> = ({
  data, size = 'md', flow = true, loading = false, formatValue = defaultFormat, className,
}) => {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  const reduced = useReducedMotion();
  const chart1 = cssVar('--color-chart-1') ?? '#ff4700';
  const dotsRef = React.useRef<SVGGElement>(null);
  const plotRef = React.useRef<HTMLDivElement>(null);

  const ph = heights[size];
  const total = data[0]?.value || 1;
  const n = data.length;
  const segW = VIEW_W / Math.max(1, n);
  const centerY = ph / 2;
  const heightFor = (v: number) => (v / total) * ph * 0.92;
  // One boundary height per stage edge (N+1 for N stages): boundaries[i] is shared between stage i-1's right edge and
  // stage i's left edge, so the funnel narrows continuously with no flat plateaus.
  const boundaries = data.map((d) => heightFor(d.value));
  boundaries.push(heightFor(data[n - 1]?.value ?? 0) * TIP_TAPER);
  const stageOpacity = (i: number) => (n <= 1 ? 1 : STAGE_MIN_OPACITY + (i / (n - 1)) * (1 - STAGE_MIN_OPACITY));

  // The stream: runs only while the chart is on screen and the visitor hasn't asked for less motion.
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  const dataKey = data.map((d) => d.value).join(',');
  React.useEffect(() => {
    const g = dotsRef.current;
    if (loading || !flow || reduced || !visible || !g || n < 2) return undefined;
    const circles = Array.from(g.children) as SVGCircleElement[];
    const values = data.map((d) => d.value);
    const halfAt = (x: number) => {
      const s = Math.min(n - 1, Math.max(0, Math.floor(x / segW)));
      const local = smooth(Math.min(1, Math.max(0, (x - s * segW) / segW)));
      return (boundaries[s] + (boundaries[s + 1] - boundaries[s]) * local) / 2;
    };
    // Where a dot gives up: the last stage whose volume still covers a random share of the start.
    const spawn = (x: number): Dot => {
      const r = Math.random() * values[0];
      let last = 0;
      for (let k = 0; k < n; k++) if (values[k] >= r) last = k;
      return { x, lane: Math.random() * 2 - 1, speed: 46 + Math.random() * 54, end: (last + 1) * segW - segW * 0.18, size: 1.2 + Math.random() * 1.5 };
    };
    const dots: Dot[] = circles.map(() => spawn(Math.random() * VIEW_W * 0.9));
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      dots.forEach((d, i) => {
        d.x += d.speed * dt;
        if (d.x >= d.end) dots[i] = spawn(-6);
        const dot = dots[i];
        const half = halfAt(Math.max(0, dot.x)) * 0.84;
        const c = circles[i];
        c.setAttribute('cx', String(dot.x));
        c.setAttribute('cy', String(centerY + dot.lane * half));
        c.setAttribute('r', String(dot.size));
        // fade in at the mouth, out as it drops away
        const edge = Math.min(1, Math.max(0, dot.x / 28)) * Math.min(1, Math.max(0, (dot.end - dot.x) / 34));
        c.setAttribute('opacity', String(0.78 * edge));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // boundaries/centerY derive from data and size
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, flow, reduced, visible, dataKey, size, n]);

  if (loading) {
    return <ChartSkeleton kind="funnel" height={ph + 118} stages={Math.max(3, n)} className={className} label="Loading funnel chart" />;
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredMidX = hoverIndex !== null ? hoverIndex * segW + segW / 2 : 0;
  const hoveredTopY = hoverIndex !== null ? centerY - ((boundaries[hoverIndex] + boundaries[hoverIndex + 1]) / 4) : 0;

  return (
    <div
      ref={chartRef}
      className={[styles.chart, className ?? ''].filter(Boolean).join(' ')}
      style={{ ['--funnel' as string]: chart1 }}
    >
      <div className={styles.stats} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {data.map((d, i) => (
          <div key={i} className={[styles.stat, hoverIndex !== null && hoverIndex !== i ? styles['stat--dim'] : ''].filter(Boolean).join(' ')}>
            <span className={styles.stat__label}>{d.label}</span>
            <span className={styles.stat__value}>{formatValue(d.value)}</span>
            <span className={styles.stat__sub}>{i === 0 ? 'Start' : `${Math.round(pctOf(d.value, total))}% of start`}</span>
          </div>
        ))}
      </div>

      <div ref={plotRef} className={styles.plot}>
        <svg viewBox={`0 0 ${VIEW_W} ${ph}`} width="100%" height={ph} preserveAspectRatio="none" className={styles.svg}>
          <defs>
            <linearGradient id="funnel-sheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity={0.22} />
              <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
              <stop offset="1" stopColor="#000" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          {data.map((_, i) => {
            const xLeft = i * segW;
            const xRight = (i + 1) * segW;
            const midX = (xLeft + xRight) / 2;
            const hLeft = boundaries[i] / 2;
            const hRight = boundaries[i + 1] / 2;
            const path = [
              `M ${xLeft} ${centerY - hLeft}`,
              `C ${midX} ${centerY - hLeft} ${midX} ${centerY - hRight} ${xRight} ${centerY - hRight}`,
              `L ${xRight} ${centerY + hRight}`,
              `C ${midX} ${centerY + hRight} ${midX} ${centerY + hLeft} ${xLeft} ${centerY + hLeft}`,
              'Z',
            ].join(' ');
            const opacity = hoverIndex !== null ? (i === hoverIndex ? 1 : 0.4) : stageOpacity(i);
            return (
              <g key={i} className={styles.segment} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                <path d={path} fill={chart1} fillOpacity={opacity} className={styles.fill} />
                <path d={path} fill="url(#funnel-sheen)" className={styles.sheen} />
              </g>
            );
          })}
          {flow && !reduced && (
            <g ref={dotsRef} className={styles.dots} aria-hidden="true">
              {Array.from({ length: PARTICLES }, (_, k) => <circle key={k} r={1.6} cx={-10} cy={centerY} fill="#fff" opacity={0} />)}
            </g>
          )}
        </svg>

        <div className={styles.drops} aria-hidden="true">
          {data.slice(1).map((d, i) => {
            const drop = 100 - pctOf(d.value, data[i].value);
            return (
              <span key={i} className={styles.drop} style={{ left: `${((i + 1) * segW / VIEW_W) * 100}%` }}>
                <span className={styles.drop__arrow}>↓</span> {Math.round(drop)}%
              </span>
            );
          })}
        </div>

        {hovered && hoverIndex !== null && (
          <ChartTooltipCard
            title={hovered.label}
            rows={[
              { color: chart1, label: 'Count', value: formatValue(hovered.value) },
              { label: 'Of start', value: `${pctOf(hovered.value, total).toFixed(1)}%` },
              ...(hoverIndex > 0 ? [{ label: 'Drop-off', value: `${(100 - pctOf(hovered.value, data[hoverIndex - 1].value)).toFixed(1)}%` }] : []),
            ]}
            style={{
              position: 'absolute', zIndex: 10, pointerEvents: 'none',
              left: `${(hoveredMidX / VIEW_W) * 100}%`,
              top: `${(hoveredTopY / ph) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 10px))',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FunnelChart;
