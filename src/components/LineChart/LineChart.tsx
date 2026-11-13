/**
 * LineChart
 *
 * Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Line
 * chart" component set:
 *
 *   default      — smooth (monotone) curve, single series, no dots
 *   linear       — straight-line segments instead of a smooth curve
 *   step         — step/staircase line
 *   multiple     — two series overlaid (pass 2 entries in `series`)
 *   dots         — smooth curve, dot markers always visible (not just on hover)
 *   custom-dots  — smooth curve, ringed/halo dot markers
 *   dots-colors  — smooth curve, each dot cycles through the full chart
 *                  palette instead of matching its own series' color
 *   label        — dots + the raw value shown above each point
 *   custom-label — dots + a custom label per point (see `labelKey`)
 *
 * A thin wrapper throughout -- every variant is a Recharts `type`/`dot`/
 * `label` prop combination, no hand-rolled SVG needed.
 */

import React from 'react';
import {
  LineChart as ReLineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useChartTokens } from '../../lib/useChartTokens';
import { CHART_PALETTE_FALLBACK } from '../../lib/chartPalette';
import { ChartTooltip } from '../../lib/ChartTooltip';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { useReducedMotion } from '../../lib/useReducedMotion';
import styles from './LineChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type LineChartVariant =
  | 'default' | 'linear' | 'step' | 'multiple' | 'dots' | 'custom-dots' | 'dots-colors' | 'label' | 'custom-label';

export interface LineChartProps {
  /** Rows keyed by label plus one field per series. */
  data: Array<Record<string, string | number>>;
  /** Series field names to plot. */
  series: string[];
  /** Field used for the x-axis (defaults to "label"). */
  xKey?: string;
  variant?: LineChartVariant;
  /** Field holding each point's custom label text (variant="custom-label"). */
  labelKey?: string;
  size?: ChartSize;
  /** Pixel height override, takes precedence over `size`'s preset. Recharts'
   * ResponsiveContainer renders its SVG at whatever literal number this prop
   * resolves to and does not re-measure it from CSS, so shrinking a chart to
   * fit a constrained layout must go through this prop, not a CSS override
   * on an ancestor. */
  height?: number;
  showLegend?: boolean;
  /** Draw the loading state (the chart's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  className?: string;
}

const heights: Record<ChartSize, number> = { sm: 180, md: 240, lg: 320, xl: 420 };

const ALWAYS_DOTS = new Set<LineChartVariant>(['dots', 'custom-dots', 'dots-colors', 'label', 'custom-label']);

export const LineChart: React.FC<LineChartProps> = ({
  data, series, xKey = 'label', variant = 'default', labelKey, size = 'md', height, showLegend, loading = false, className,
}) => {
  const reduced = useReducedMotion();
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  const palette = [1, 2, 3, 4, 5].map((n) => cssVar(`--color-chart-${n}`) ?? CHART_PALETTE_FALLBACK[n - 1]);
  // Figma: the single default series is chart/2, and the second line added
  // by "Multiple" is chart/1 -- reversed from the raw token numbering (the
  // rest of the palette, for 3+ series, keeps the plain chart/3.. order).
  const seriesPalette = [palette[1], palette[0], ...palette.slice(2)];
  const grid = cssVar('--color-border-subtle') ?? '#e7e5e1';
  const axis = cssVar('--color-fg-muted') ?? '#78716a';
  const canvasBg = cssVar('--color-bg-canvas') ?? '#fafaf9';
  const fgDefault = cssVar('--color-fg-default') ?? '#141414';
  const curveType = variant === 'linear' ? 'linear' : variant === 'step' ? 'step' : 'monotone';
  const showDots = ALWAYS_DOTS.has(variant);

  // "custom-dots": a small filled circle with a short straight tick
  // attached directly above and below it (always vertical, independent of
  // the line's local slope) -- not a ring the line passes through.
  const renderRingDot = (color: string) => (props: any) => {
    const { cx, cy } = props;
    const r = 3;
    const tick = 6;
    return (
      <g stroke={color} strokeWidth={2} strokeLinecap="round">
        <line x1={cx} y1={cy - r} x2={cx} y2={cy - r - tick} />
        <line x1={cx} y1={cy + r} x2={cx} y2={cy + r + tick} />
        <circle cx={cx} cy={cy} r={r} fill={color} stroke="none" />
      </g>
    );
  };

  // "dots-colors": each point's dot cycles through the full chart palette,
  // independent of its own series' line color.
  const renderPaletteDot = (props: any) => {
    const { cx, cy, index } = props;
    const color = palette[(index ?? 0) % palette.length];
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke={canvasBg} strokeWidth={1.5} />;
  };

  // "label"/"custom-label": Line's `label` prop is routed through a
  // Cartesian LabelList context. Unlike Radar's equivalent, the actual
  // props handed to a custom render function here don't include `payload`
  // (confirmed via a live console check, despite the source computing it) --
  // `index` is present instead, so the custom label text is read off the
  // closure-captured `data` array directly.
  const renderPointLabel = (props: any) => {
    const { x, y, value, index } = props;
    const text = variant === 'custom-label' && labelKey ? data[index]?.[labelKey] : value;
    if (text === undefined) return <g />;
    return (
      <text x={x} y={y - 12} textAnchor="middle" fill={fgDefault} fontSize={12} fontWeight={500} fontFamily="var(--font-sans)">
        {text}
      </text>
    );
  };

  // the active point: a solid dot in a soft halo of its own colour
  const haloDot = (color: string) => (p: any) => (
    <g key={`halo-${p.index}`}>
      <circle cx={p.cx} cy={p.cy} r={11} fill={color} fillOpacity={0.16} />
      <circle cx={p.cx} cy={p.cy} r={4.5} fill={color} stroke={canvasBg} strokeWidth={2} />
    </g>
  );

  if (loading) return <ChartSkeleton kind="line" height={height ?? heights[size]} className={className} label="Loading line chart" />;

  return (
    <div
      ref={chartRef}
      className={[styles.chart, className ?? ''].filter(Boolean).join(' ')}
      style={Object.fromEntries(seriesPalette.map((c, k) => [`--s${k}`, c])) as React.CSSProperties}
    >
      <ResponsiveContainer width="100%" height={height ?? heights[size]}>
        <ReLineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey={xKey} stroke={axis} fontSize={12} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ stroke: cssVar('--color-border-strong') ?? '#a8a29b', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={<ChartTooltip />}
            wrapperStyle={{ zIndex: 50 }}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-sans)' }} />}
          {series.map((key, i) => {
            const color = seriesPalette[i % seriesPalette.length];
            const dot = !showDots ? false
              : variant === 'custom-dots' ? renderRingDot(color)
              : variant === 'dots-colors' ? renderPaletteDot
              : { r: 4, fill: color, stroke: canvasBg, strokeWidth: 1.5 };
            return (
              <Line
                key={key}
                type={curveType}
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                dot={dot}
                activeDot={haloDot(color)}
                className={styles[`s${i % 5}`]}
                // draws itself in from the left on mount
                isAnimationActive={!reduced}
                animationDuration={1100}
                animationEasing="ease-out"
                label={variant === 'label' || variant === 'custom-label' ? renderPointLabel : undefined}
              />
            );
          })}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
