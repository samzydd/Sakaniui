/**
 * ChartSkeleton: the loading state of every chart. Pass `loading` to a chart and it draws this instead of itself: the
 * chart's own silhouette in the surface's subtle fill, breathing in a soft stagger. When `loading` turns false the
 * chart takes its place and plays its entrance.
 *
 * It keeps the chart's height, so nothing below it moves when the data arrives, and it announces itself to assistive
 * tech as a busy status.
 */
import React from 'react';
import styles from './ChartLoading.module.css';

export type ChartSkeletonKind =
  | 'radar' | 'funnel' | 'bars' | 'bars-horizontal' | 'line' | 'area' | 'ring' | 'pie' | 'heatmap';

export interface ChartSkeletonProps {
  kind: ChartSkeletonKind;
  height: number | string;
  /** Heatmap only: its shape. */
  rows?: number;
  cols?: number;
  /** Funnel only: how many stages. */
  stages?: number;
  label?: string;
  className?: string;
}

const BAR_HEIGHTS = [0.46, 0.72, 0.56, 0.86, 0.42, 0.66, 0.92, 0.52];
const ROW_WIDTHS = [0.86, 0.62, 0.74, 0.46, 0.34, 0.2];
const i = (n: number) => ({ ['--i' as string]: n }) as React.CSSProperties;

/** A hexagon's points for a radar skeleton, as an SVG `points` string. */
const hex = (cx: number, cy: number, r: number, sides = 6) =>
  Array.from({ length: sides }, (_, k) => {
    const a = (Math.PI * 2 * k) / sides - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const Radar: React.FC = () => {
  const id = React.useId();
  return (
  <svg className={styles.svg} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="var(--color-fg-default)" stopOpacity="0" />
        <stop offset="1" stopColor="var(--color-fg-default)" stopOpacity="0.09" />
      </linearGradient>
      {/* the sweep stays inside the outer ring */}
      <clipPath id={`${id}-clip`}><polygon points={hex(100, 100, 74)} /></clipPath>
    </defs>
    {[1, 0.75, 0.5, 0.25].map((l) => <polygon key={l} className={styles.skelGrid} points={hex(100, 100, 74 * l)} />)}
    {Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI * 2 * k) / 6 - Math.PI / 2;
      return <line key={k} className={styles.skelGrid} x1={100} y1={100} x2={100 + 74 * Math.cos(a)} y2={100 + 74 * Math.sin(a)} />;
    })}
    <polygon className={styles.skel} style={i(1)} points="100,46 142,74 128,128 100,150 66,118 62,76" />
    <g clipPath={`url(#${id}-clip)`}>
      <g className={styles.spin}>
        <path d="M100 100 L100 20 A80 80 0 0 1 169 60 Z" fill={`url(#${id}-sweep)`} />
      </g>
    </g>
  </svg>
  );
};

const Funnel: React.FC<{ stages: number }> = ({ stages }) => {
  const id = React.useId();
  const w = 560, h = 160, mid = h / 2, seg = w / stages;
  // a smooth taper through `stages` evenly spaced widths
  const heights = Array.from({ length: stages }, (_, k) => h * (1 - 0.82 * (k / Math.max(1, stages - 1)) ** 0.8) * 0.86);
  let top = `M 0 ${mid - heights[0] / 2}`, bottom = '';
  heights.forEach((hh, k) => {
    const x1 = (k + 1) * seg, next = heights[k + 1] ?? hh * 0.6, xm = k * seg + seg / 2;
    top += ` C ${xm} ${mid - hh / 2} ${xm} ${mid - next / 2} ${x1} ${mid - next / 2}`;
  });
  for (let k = stages - 1; k >= 0; k--) {
    const hh = heights[k], next = heights[k + 1] ?? hh * 0.6, x0 = k * seg, x1 = (k + 1) * seg, xm = (x0 + x1) / 2;
    bottom += `${k === stages - 1 ? `L ${x1} ${mid + next / 2}` : ''} C ${xm} ${mid + next / 2} ${xm} ${mid + hh / 2} ${x0} ${mid + hh / 2}`;
  }
  const d = `${top} ${bottom} Z`;
  return (
    <>
      <svg className={styles.svg} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-clip`}><path d={d} /></clipPath>
          <linearGradient id={`${id}-glide`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-fg-default)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--color-fg-default)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--color-fg-default)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className={styles.skel} d={d} />
        <g clipPath={`url(#${id}-clip)`}>
          <rect className={styles.glide} x={-w * 0.3} y={0} width={w * 0.3} height={h} fill={`url(#${id}-glide)`} />
        </g>
      </svg>
      <div className={styles.labels} style={{ gridTemplateColumns: `repeat(${stages}, 1fr)` }}>
        {Array.from({ length: stages }, (_, k) => <span key={k} className={styles.label} style={i(k)} />)}
      </div>
    </>
  );
};

const Bars: React.FC = () => (
  <div className={styles.bars}>
    {BAR_HEIGHTS.map((v, k) => <span key={k} className={styles.bar} style={{ ...i(k), height: `${v * 100}%` }} />)}
  </div>
);

const Rows: React.FC = () => (
  <div className={styles.rows}>
    {ROW_WIDTHS.map((v, k) => <span key={k} className={styles.row} style={{ ...i(k), width: `${v * 100}%` }} />)}
  </div>
);

const LINE = 'M0 70 C 40 60, 70 40, 110 46 S 180 84, 230 58 S 310 14, 360 30 S 440 70, 500 40 L 560 34';

const Line: React.FC<{ area?: boolean }> = ({ area }) => (
  <svg className={styles.svg} viewBox="0 0 560 100" preserveAspectRatio="none" aria-hidden="true">
    {[25, 50, 75].map((y) => <line key={y} className={styles.skelGrid} x1={0} x2={560} y1={y} y2={y} strokeDasharray="3 4" />)}
    {area && <path className={styles.skel} d={`${LINE} L 560 100 L 0 100 Z`} />}
    <path className={styles.skelLine} d={LINE} strokeWidth={2} />
  </svg>
);

const Ring: React.FC<{ pie?: boolean }> = ({ pie }) => (
  <svg className={styles.svg} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    {pie ? <circle className={styles.skel} cx={100} cy={100} r={74} /> : <circle className={styles.skelLine} cx={100} cy={100} r={64} strokeWidth={22} style={{ stroke: 'var(--color-bg-subtle)' }} />}
    <g className={styles.spin}>
      <circle cx={100} cy={100} r={pie ? 37 : 64} fill="none" stroke="var(--color-fg-default)" strokeOpacity={0.08} strokeWidth={pie ? 74 : 22} strokeDasharray={pie ? '58 175' : '90 313'} />
    </g>
  </svg>
);

const Heatmap: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
  <div className={styles.cells} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
    {Array.from({ length: rows * cols }, (_, k) => <span key={k} className={styles.cell} style={i((k % cols) + Math.floor(k / cols))} />)}
  </div>
);

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ kind, height, rows = 5, cols = 7, stages = 5, label = 'Loading chart', className }) => (
  <div className={[styles.skeleton, kind === 'funnel' ? styles.col : '', className ?? ''].filter(Boolean).join(' ')} style={{ height }} role="status" aria-busy="true" aria-label={label}>
    {kind === 'radar' && <Radar />}
    {kind === 'funnel' && <Funnel stages={stages} />}
    {kind === 'bars' && <Bars />}
    {kind === 'bars-horizontal' && <Rows />}
    {kind === 'line' && <Line />}
    {kind === 'area' && <Line area />}
    {kind === 'ring' && <Ring />}
    {kind === 'pie' && <Ring pie />}
    {kind === 'heatmap' && <Heatmap rows={rows} cols={cols} />}
  </div>
);

export default ChartSkeleton;
