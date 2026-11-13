/**
 * DonutChart
 *
 * Recharts wrapper styled with Sakani chart tokens. Matches Figma "Donut Chart"
 * (Size sm|md|lg|xl, with center value + caption). Segments cycle through the 5
 * chart tokens so they re-theme in dark mode.
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartTokens } from '../../lib/useChartTokens';
import { CHART_PALETTE_FALLBACK } from '../../lib/chartPalette';
import { ChartTooltip } from '../../lib/ChartTooltip';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { useChartEntrance } from '../../lib/useChartEntrance';
import styles from './DonutChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type ChartAppearance = 'default' | 'rich';

export interface DonutDatum { label: string; value: number; }

export interface DonutChartProps {
  data: DonutDatum[];
  size?: ChartSize;
  /** Big number shown in the center (Figma: value). */
  centerValue?: string;
  /** Small caption under the center value (Figma: caption). */
  centerCaption?: string;
  /** Pixel height override, takes precedence over `size`'s preset. */
  height?: number;
  /** Draw the loading state (the chart's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  /** `rich`: the livelier look (turns into place on mount, the hovered slice lifts, a frosted card). `default` is the Figma look. */
  appearance?: ChartAppearance;
  className?: string;
}

const dims: Record<ChartSize, { h: number; inner: number; outer: number }> = {
  sm: { h: 180, inner: 50, outer: 72 },
  md: { h: 220, inner: 62, outer: 90 },
  lg: { h: 280, inner: 80, outer: 116 },
  xl: { h: 340, inner: 98, outer: 142 },
};

export const DonutChart: React.FC<DonutChartProps> = ({
  data, size = 'md', centerValue, centerCaption, height, loading = false, appearance = 'default', className,
}) => {
  const rich = appearance === 'rich';
  const entering = useChartEntrance(rich && !loading);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  // Recharts anchors a Pie slice's tooltip at polarToCartesian(cx, cy,
  // middleRadius, midAngle) -- the sector's own geometric middle, not the
  // actual hover point. Fine for a narrow slice, but on a wide one that
  // can sit far around the ring from wherever the cursor actually is. This
  // tracks the real pointer position instead and pins the Tooltip there via
  // its `position` prop.
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  const palette = [1, 2, 3, 4, 5].map((n) => cssVar(`--color-chart-${n}`) ?? CHART_PALETTE_FALLBACK[n - 1]);
  const d = { ...dims[size], h: height ?? dims[size].h };
  // Figma's segments end in a rounded cap -- half the ring's own thickness
  // is the max Recharts allows before it stops adding visible rounding, so
  // that was the starting point, backed off 4px then another 3px (7 total)
  // per subsequent adjustment requests.
  const cornerRadius = (d.outer - d.inner) / 2 - 7;

  if (loading) return <ChartSkeleton kind="ring" height={d.h} className={className} label="Loading donut chart" />;

  return (
    <div
      ref={chartRef}
      className={[styles.chart, rich ? `${styles.rich} sk-chart-rich` : '', className ?? ''].filter(Boolean).join(' ')}
      data-entering={entering || undefined}
      style={{ height: d.h }}
      onMouseMove={handleMouseMove}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={d.inner}
            outerRadius={d.outer}
            cornerRadius={cornerRadius}
            paddingAngle={2}
            stroke="none"
            // On mount, Recharts 3.9.2 sometimes commits the entrance
            // animation's *empty* intermediate frame for Sector-based shapes
            // (Pie, RadialBar) and never repaints past it -- the shape's <g>
            // renders with no <path> child at all, so nothing shows even
            // though every prop above is correct. Bar/Area/Line don't hit
            // this (rects and line paths animate differently). Disabling the
            // animation skips the broken transition entirely.
            isAnimationActive={false}
            onMouseEnter={(_, i) => setActiveIndex(i)}
            onMouseLeave={() => {
              setActiveIndex(null);
              setHoverPos(null);
            }}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={palette[i % palette.length]}
                fillOpacity={activeIndex !== null && i !== activeIndex ? 0.45 : 1}
                className={rich && activeIndex === i ? styles.hot : undefined}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} position={hoverPos ?? undefined} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label overlay */}
      {(centerValue || centerCaption) && (
        <div className={styles.center}>
          {centerValue && <span className={styles.center__value}>{centerValue}</span>}
          {centerCaption && <span className={styles.center__caption}>{centerCaption}</span>}
        </div>
      )}
    </div>
  );
};

export default DonutChart;
