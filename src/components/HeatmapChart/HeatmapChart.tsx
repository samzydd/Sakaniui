/**
 * HeatmapChart
 *
 * Matches Figma's new "Other charts" set ("Heatmap chart" / "Heatmap chart
 * hover"). Recharts has no native heatmap chart type, so this is a plain CSS
 * grid of colored cells rather than a Recharts wrapper -- flagged here the
 * same way RadialChart flags its omitted gauge-tick variant.
 *
 * Cell color is a single-hue chart/1 scale, matching Figma's own look:
 * higher values get a more saturated fill. On hover, the hovered cell goes
 * fully solid and every other cell dims to 45% opacity (a flat dim, not its
 * own value-based shade) -- matching Figma's hover state exactly, and the
 * same "highlight one, dim the rest" pattern used by BarChart.
 */

import React from 'react';
import { useChartTokens } from '../../lib/useChartTokens';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { useChartEntrance } from '../../lib/useChartEntrance';
import styles from './HeatmapChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type ChartAppearance = 'default' | 'rich';

export interface HeatmapChartProps {
  /** Row-major matrix of values; every row must be the same length. */
  data: number[][];
  rowLabels?: string[];
  colLabels?: string[];
  /** Legend label for the tooltip's value row (Figma: "Revenue"). */
  valueLabel?: string;
  size?: ChartSize;
  /** Draw the loading state (the chart's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  /** `rich`: the livelier look (the cells arrive as a wave on mount, the hovered one lifts). `default` is the Figma look. */
  appearance?: ChartAppearance;
  className?: string;
}


// Figma's palest cell is still visibly tinted, not near-white.
const MIN_OPACITY = 0.12;
const DIM_OPACITY = 0.45;

interface HoverState { row: number; col: number; value: number; left: number; top: number; }

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data, rowLabels, colLabels, valueLabel = 'Value', size = 'md', loading = false, appearance = 'default', className,
}) => {
  const rich = appearance === 'rich';
  const entering = useChartEntrance(rich && !loading);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  const gridRef = React.useRef<HTMLDivElement>(null);
  // A single tooltip lives outside the per-cell markup and is repositioned/
  // recontented on hover, instead of each cell mounting its own -- moving
  // from one section to an adjacent one would otherwise unmount one
  // tooltip element and mount a brand new one (a visible flicker), rather
  // than the same tooltip just updating in place.
  const [hover, setHover] = React.useState<HoverState | null>(null);
  const chart1 = cssVar('--color-chart-1') ?? '#ff4700';
  const max = Math.max(1, ...data.flat());
  const cols = data[0]?.length ?? 0;

  const handleEnter = (row: number, col: number, value: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    const cellRect = e.currentTarget.getBoundingClientRect();
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    setHover({
      row, col, value,
      left: cellRect.left - gridRect.left + cellRect.width / 2,
      top: cellRect.top - gridRect.top,
    });
  };

  if (loading) {
    const rows = Math.max(3, data.length || 5), cellH = { sm: 14, md: 20, lg: 28, xl: 36 }[size];
    return <ChartSkeleton kind="heatmap" rows={rows} cols={Math.max(4, cols || 7)} height={rows * (cellH + 6)} className={className} label="Loading heatmap" />;
  }

  return (
    <div ref={chartRef} className={[styles.chart, styles[`chart--${size}`], rich ? styles.rich : '', className ?? ''].filter(Boolean).join(' ')} data-entering={entering || undefined}>
      <div ref={gridRef} className={styles.grid} style={{ gridTemplateColumns: `auto repeat(${cols}, minmax(0, 1fr))` }}>
        {data.map((row, r) => (
          <React.Fragment key={r}>
            <span className={styles.rowLabel}>{rowLabels?.[r] ?? ''}</span>
            {row.map((value, c) => {
              const isHovered = hover?.row === r && hover?.col === c;
              const dimmed = hover !== null && !isHovered;
              const opacity = isHovered ? 1 : MIN_OPACITY + (value / max) * (1 - MIN_OPACITY);
              return (
                <div
                  key={c}
                  className={[styles.cell, rich && isHovered ? styles['cell--hot'] : ''].filter(Boolean).join(' ')}
                  // `--d` staggers the entrance as a wave from the top-left corner
                  style={{ background: chart1, opacity: dimmed ? DIM_OPACITY : opacity, ['--d' as string]: r + c }}
                  onMouseEnter={handleEnter(r, c, value)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </React.Fragment>
        ))}
        {colLabels && (
          <>
            <span />
            {colLabels.map((label, c) => <span key={c} className={styles.colLabel}>{label}</span>)}
          </>
        )}

        {hover && (
          <div className={styles.tooltip} style={{ left: hover.left, top: hover.top }}>
            <span className={styles.tooltip__title}>
              {[rowLabels?.[hover.row], colLabels?.[hover.col]].filter(Boolean).join(' · ') || `Row ${hover.row + 1}, Col ${hover.col + 1}`}
            </span>
            <div className={styles.tooltip__row}>
              <span className={styles.tooltip__dot} />
              <span className={styles.tooltip__label}>{valueLabel}</span>
              <span className={styles.tooltip__value}>{hover.value}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatmapChart;
