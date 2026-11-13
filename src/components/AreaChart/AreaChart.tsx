/**
 * AreaChart
 *
 * Recharts wrapper styled with Sakani chart tokens. Matches Figma "Area Chart"
 * (type: Default | Stacked | Step | Linear, each with an optional second
 * series). A thin library wrapper, same philosophy as BarChart/LineChart/
 * DonutChart — production charts use a charting library, not a hand-rolled
 * SVG port.
 *
 * Hover shows Recharts' own tooltip + cursor line, matching Figma's
 * "Indicator line" + "Chart Tooltip" atoms.
 */

import React from 'react';
import {
  AreaChart as ReAreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useChartTokens } from '../../lib/useChartTokens';
import { ChartTooltip } from '../../lib/ChartTooltip';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { useReducedMotion } from '../../lib/useReducedMotion';
import styles from './AreaChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type AreaChartVariant = 'default' | 'stacked' | 'step' | 'linear';

export interface AreaChartDatum {
  label: string;
  value: number;
  /** Second series (Figma: "Revenue" alongside "Costs"). Renders a second
   * area, stacked on top of `value` when `variant="stacked"`. */
  value2?: number;
}

export interface AreaChartProps {
  data: AreaChartDatum[];
  variant?: AreaChartVariant;
  /** Legend label for `value` / `value2` in the tooltip. */
  seriesLabels?: [string, string?];
  size?: ChartSize;
  height?: number;
  /** Draw the loading state (the chart's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  className?: string;
}

const heights: Record<ChartSize, number> = { sm: 180, md: 240, lg: 320, xl: 420 };

export const AreaChart: React.FC<AreaChartProps> = ({
  data, variant = 'default', seriesLabels = ['Value', 'Value 2'], size = 'md', height, loading = false, className,
}) => {
  const reduced = useReducedMotion();
  // per-chart gradient ids, so two area charts on one page don't share (and repaint) each other's fills
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  // Figma: single-series "Default" uses chart/5, and "Stacked Default"
  // (two series) keeps that same chart/5 for `value` and adds chart/2 for
  // `value2` -- not chart/1/chart/2 as the token numbering might suggest.
  const valueColor = cssVar('--color-chart-5') ?? '#dca84f';
  const value2Color = cssVar('--color-chart-2') ?? '#5b92dd';
  const grid = cssVar('--color-border-subtle') ?? '#e7e5e1';
  const axis = cssVar('--color-fg-muted') ?? '#78716a';
  const hasSecondSeries = data.some((d) => d.value2 !== undefined);

  const curveType = variant === 'step' ? 'step' : variant === 'linear' ? 'linear' : 'monotone';
  const stackId = variant === 'stacked' ? 'stack' : undefined;

  const canvasBg = cssVar('--color-bg-canvas') ?? '#fafaf9';
  const haloDot = (color: string) => (p: any) => (
    <g key={`halo-${p.index}`}>
      <circle cx={p.cx} cy={p.cy} r={11} fill={color} fillOpacity={0.16} />
      <circle cx={p.cx} cy={p.cy} r={4.5} fill={color} stroke={canvasBg} strokeWidth={2} />
    </g>
  );

  if (loading) return <ChartSkeleton kind="area" height={height ?? heights[size]} className={className} label="Loading area chart" />;

  return (
    <div
      ref={chartRef}
      className={[styles.chart, className ?? ''].filter(Boolean).join(' ')}
      style={{ ['--s0' as string]: valueColor, ['--s1' as string]: value2Color }}
    >
      <ResponsiveContainer width="100%" height={height ?? heights[size]}>
        <ReAreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id={`${uid}a1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={valueColor} stopOpacity={0.42} />
              <stop offset="100%" stopColor={valueColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${uid}a2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={value2Color} stopOpacity={0.42} />
              <stop offset="100%" stopColor={value2Color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="label" stroke={axis} fontSize={12} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ stroke: cssVar('--color-border-strong') ?? '#a8a29b', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={<ChartTooltip />}
            wrapperStyle={{ zIndex: 50 }}
          />
          {hasSecondSeries && (
            <Area
              type={curveType}
              dataKey="value2"
              name={seriesLabels[1] ?? 'Value 2'}
              stackId={stackId}
              stroke={value2Color}
              strokeWidth={2}
              fill={`url(#${uid}a2)`}
              dot={false}
              activeDot={haloDot(value2Color)}
              className={styles.s1}
              isAnimationActive={!reduced}
              animationDuration={1100}
              animationEasing="ease-out"
            />
          )}
          <Area
            type={curveType}
            dataKey="value"
            name={seriesLabels[0] ?? 'Value'}
            stackId={stackId}
            stroke={valueColor}
            strokeWidth={2}
            fill={`url(#${uid}a1)`}
            dot={false}
            activeDot={haloDot(valueColor)}
            className={styles.s0}
            isAnimationActive={!reduced}
            animationDuration={1100}
            animationEasing="ease-out"
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AreaChart;
