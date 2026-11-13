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
export type ChartAppearance = 'default' | 'rich';
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
  /** `rich`: the livelier look (an entrance on mount, a soft glow and lift on hover, a frosted card). `default` is the Figma look. */
  appearance?: ChartAppearance;
  className?: string;
}

const heights: Record<ChartSize, number> = { sm: 180, md: 240, lg: 320, xl: 420 };

export const AreaChart: React.FC<AreaChartProps> = ({
  data, variant = 'default', seriesLabels = ['Value', 'Value 2'], size = 'md', height, loading = false, appearance = 'default', className,
}) => {
  const reduced = useReducedMotion();
  const rich = appearance === 'rich';
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
      className={[styles.chart, rich ? `${styles.rich} sk-chart-rich` : '', className ?? ''].filter(Boolean).join(' ')}
      style={{ ['--s0' as string]: valueColor, ['--s1' as string]: value2Color }}
    >
      <ResponsiveContainer width="100%" height={height ?? heights[size]}>
        <ReAreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id={`${uid}a1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={rich ? '0%' : '5%'} stopColor={valueColor} stopOpacity={rich ? 0.42 : 0.35} />
              <stop offset={rich ? '100%' : '95%'} stopColor={valueColor} stopOpacity={rich ? 0 : 0.02} />
            </linearGradient>
            <linearGradient id={`${uid}a2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={rich ? '0%' : '5%'} stopColor={value2Color} stopOpacity={rich ? 0.42 : 0.35} />
              <stop offset={rich ? '100%' : '95%'} stopColor={value2Color} stopOpacity={rich ? 0 : 0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="label" stroke={axis} fontSize={12} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={rich
              ? { stroke: cssVar('--color-border-strong') ?? '#a8a29b', strokeWidth: 1, strokeDasharray: '4 4' }
              : { stroke: cssVar('--color-border-default') ?? '#dbdad7', strokeWidth: 1 }}
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
              activeDot={rich ? haloDot(value2Color) : { r: 4, fill: value2Color, stroke: canvasBg, strokeWidth: 1.5 }}
              className={rich ? styles.s1 : undefined}
              {...(rich ? { isAnimationActive: !reduced, animationDuration: 1100, animationEasing: 'ease-out' as const } : {})}
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
            activeDot={rich ? haloDot(valueColor) : { r: 4, fill: valueColor, stroke: canvasBg, strokeWidth: 1.5 }}
            className={rich ? styles.s0 : undefined}
            {...(rich ? { isAnimationActive: !reduced, animationDuration: 1100, animationEasing: 'ease-out' as const } : {})}
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AreaChart;
