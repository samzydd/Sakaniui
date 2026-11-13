/**
 * BarChart
 *
 * Recharts wrapper styled with Sakani chart tokens. Matches Figma's lowercase
 * "Bar chart" component set (Default, Active, Multiple, Stacked - Legend,
 * Negative, horizontal) — a thin library wrapper rather than a structural SVG
 * port, since production charts use a charting library. Replaces the earlier
 * Size×Bars variant model read from the older title-case "Bar Chart" component,
 * which this design has since superseded.
 *
 * NOT ported: "Label" / "custom label" (value-annotation variants) and "Mixed"
 * (bar+line combo) — flagged rather than faked, same as RadialChart's omitted
 * gauge-tick variant.
 *
 * Colors come from --color-chart-1..5 so they re-theme in dark mode automatically.
 */

import React from 'react';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Rectangle,
} from 'recharts';
import { useChartTokens } from '../../lib/useChartTokens';
import { CHART_PALETTE_FALLBACK } from '../../lib/chartPalette';
import { ChartTooltip } from '../../lib/ChartTooltip';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { useChartEntrance } from '../../lib/useChartEntrance';
import styles from './BarChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type ChartAppearance = 'default' | 'rich';
export type BarChartVariant = 'default' | 'active' | 'multiple' | 'stacked' | 'negative' | 'horizontal';

export interface BarChartDatum {
  label: string;
  value: number;
  /** Second series (Figma: "Multiple" / "Stacked - Legend"). */
  value2?: number;
}

export interface BarChartProps {
  data: BarChartDatum[];
  variant?: BarChartVariant;
  size?: ChartSize;
  /** Legend labels for `value` / `value2`, shown for "multiple" and "stacked". */
  seriesLabels?: [string, string?];
  /** Draw the loading state (the chart's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  /** `rich`: the livelier look (an entrance on mount, a soft glow and lift on hover, a frosted card). `default` is the Figma look. */
  appearance?: ChartAppearance;
  className?: string;
}

const heights: Record<ChartSize, number> = { sm: 180, md: 240, lg: 320, xl: 420 };
// Figma's new Bar chart set uses a flat 6px radius on every bar, replacing
// the old size-dependent 8px/12px logic.
const CORNER_RADIUS = 6;

/** Reads a CSS custom property from :root so Recharts (which needs real color strings) can use it. */

/** Rounds up to the nearest "nice" 1/2/5 step at the value's own magnitude
 * (310 -> 500, 42 -> 50, 1400 -> 2000) -- the usual axis-rounding rule so a
 * symmetric domain built from it lands on round numbers instead of
 * whatever the raw data max happens to be. */
const niceCeil = (value: number) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const residual = value / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
};

export const BarChart: React.FC<BarChartProps> = ({
  data, variant = 'default', size = 'md', seriesLabels = ['Value', 'Value 2'], loading = false, appearance = 'default', className,
}) => {
  const rich = appearance === 'rich';
  // the bars grow in once, on mount (or when loading ends) -- never again on hover
  const entering = useChartEntrance(rich && !loading);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  // Recharts anchors a Bar's tooltip coordinate to the bar's own vertical
  // *center* (x + width/2, y + height/2), not its top -- fine for a short
  // bar, but on a tall one the center can sit well below the ring-dot
  // marker `makeActiveBar` draws at the tip, reading as "too far from the
  // pointer". Each Bar's onMouseEnter below recomputes that same tip
  // position and pins the Tooltip there via its `position` prop instead.
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  const chartDefault = cssVar('--color-chart-2') ?? '#5b92dd';
  const chartSecondary = cssVar('--color-chart-5') ?? '#dca84f';
  // Figma: "Negative" bars use chart/1, not a semantic red -- chart/2 stays
  // the positive-value color, same as "Default".
  const chartNegative = cssVar('--color-chart-1') ?? '#ff4700';
  // Figma: "Active" isn't one highlighted bar -- every bar gets its own
  // color, cycling through the full chart/1..6 categorical palette.
  const activePalette = [1, 2, 3, 4, 5, 6].map((n) => cssVar(`--color-chart-${n}`) ?? CHART_PALETTE_FALLBACK[n - 1]);
  const grid = cssVar('--color-border-subtle') ?? '#e7e5e1';
  const axis = cssVar('--color-fg-muted') ?? '#78716a';
  const isGrouped = variant === 'multiple' || variant === 'stacked';
  const hasSecondSeries = isGrouped && data.some((d) => d.value2 !== undefined);

  const canvasBg = cssVar('--color-bg-canvas') ?? '#fafaf9';

  // "negative": the value axis's zero crossing is where every bar actually
  // starts, but with no explicit domain/ticks Recharts' auto-generated grid
  // lines land wherever its own "nice number" pass puts them -- not
  // necessarily through zero. Forcing a symmetric domain and an odd tick
  // count centered on 0 guarantees one of CartesianGrid's lines is that
  // zero line, so it reads as the bars' actual reference line.
  const negativeMax = niceCeil(Math.max(1, ...data.map((d) => Math.abs(d.value))));
  const negativeTicks = [-negativeMax, -negativeMax / 2, 0, negativeMax / 2, negativeMax];

  // Only `y` is pinned to fix the tall-bar vertical-offset issue above --
  // `x` is left for Recharts to compute itself, which clamps it to the
  // chart's own viewBox so the tooltip never overflows the container's
  // left/right edge (a full {x, y} `position` bypasses that clamping
  // entirely and let the tooltip get cut off by an ancestor's overflow).
  const tooltip = (
    <Tooltip cursor={rich ? { fill: cssVar('--color-bg-subtle') ?? '#f5f4f2', fillOpacity: 0.6, radius: CORNER_RADIUS } : false} content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} position={hoverPos ? { y: hoverPos.y } : undefined} />
  );

  // Hovering never recolors a bar -- only "active" (categorical, every bar
  // its own color) and "negative" (sign-based) change fill. Hover itself is
  // communicated purely by dimming every OTHER bar to 45%.
  const singleSeriesFill = (i: number) => {
    if (variant === 'active') return activePalette[i % activePalette.length];
    if (variant === 'negative' && data[i].value < 0) return chartNegative;
    return chartDefault;
  };
  // default (Figma): every OTHER bar dims to 45%. rich: the other bars never change at all -- the hovered bar lifts
  // and the tooltip names it, and nothing around it flickers as the pointer crosses from bar to bar.
  const dims = (i: number) => !rich && hoverIndex !== null && i !== hoverIndex;
  const singleSeriesOpacity = (i: number) => (dims(i) ? 0.45 : 1);

  // Figma's hover state adds a small ring-stroked dot at the tip of the
  // hovered bar (the same marker AreaChart/LineChart use at their active
  // point) -- Recharts' `activeBar` renders only the currently-hovered bar,
  // so this reuses the default Rectangle shape and layers the dot on top,
  // keeping the bar's own resting fill instead of Recharts' default
  // active-bar recolor.
  const tipTip = (isHorizontal: boolean, x: number, y: number, width: number, height: number, raw: number) => ({
    x: isHorizontal ? x + width : x + width / 2,
    y: isHorizontal ? y + height / 2 : raw < 0 ? y + height : y,
  });

  const makeActiveBar = (dataKey: 'value' | 'value2') => (props: any) => {
    const { x, y, width, height, fill, radius } = props;
    const raw = Number(data[props.index]?.[dataKey] ?? 0);
    const { x: cx, y: cy } = tipTip(variant === 'horizontal', x, y, width, height, raw);

    // "stacked": value (bottom) paints before value2 (top) so the whole
    // column reads bottom-to-top -- but that means a dot drawn at the seam
    // from value's own <g> gets its upper half painted over by value2's
    // rectangle, which renders right after it. Both dots are drawn from
    // value2's <g> instead, since it paints last and nothing covers it.
    if (variant === 'stacked' && dataKey === 'value') {
      return <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={radius} />;
    }

    return (
      <g>
        <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={radius} />
        <circle cx={cx} cy={cy} r={4} fill={fill} stroke={canvasBg} strokeWidth={1.5} />
        {variant === 'stacked' && dataKey === 'value2' && (
          <circle cx={x + width / 2} cy={y + height} r={4} fill={chartDefault} stroke={canvasBg} strokeWidth={1.5} />
        )}
      </g>
    );
  };

  // Same tip position as the dot above, computed from the hovered Bar
  // entry's own geometry (Recharts passes x/y/width/height directly on the
  // entry object here) so the Tooltip can be pinned to match via `position`.
  const handleBarEnter = (dataKey: 'value' | 'value2') => (entry: any, index: number) => {
    setHoverIndex(index);
    const raw = Number(data[index]?.[dataKey] ?? 0);
    setHoverPos(tipTip(variant === 'horizontal', entry.x, entry.y, entry.width, entry.height, raw));
  };
  const handleBarLeave = () => {
    setHoverIndex(null);
    setHoverPos(null);
  };

  // Recharts' default legend icon is an SVG <path> rectangle -- no `rx`
  // option, so no way to round its corners via the built-in `iconType`s.
  // Rendered as plain HTML instead so the swatch can be a normal
  // border-radius box.
  const renderLegend = (props: any) => (
    <ul className={styles.legend}>
      {props.payload?.map((entry: any) => (
        <li key={entry.value} className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: entry.color }} />
          <span style={{ color: entry.color }}>{entry.value}</span>
        </li>
      ))}
    </ul>
  );

  if (loading) {
    return <ChartSkeleton kind={variant === 'horizontal' ? 'bars-horizontal' : 'bars'} height={heights[size]} className={className} label="Loading bar chart" />;
  }

  return (
    <div
      ref={chartRef}
      className={[styles.chart, rich ? `${styles.rich} sk-chart-rich` : '', variant === 'horizontal' ? styles.horizontal : variant === 'negative' ? styles.negative : '', className ?? ''].filter(Boolean).join(' ')}
      data-entering={entering || undefined}
    >
      <ResponsiveContainer width="100%" height={heights[size]}>
        <ReBarChart
          data={data}
          layout={variant === 'horizontal' ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 8, bottom: 8, left: variant === 'horizontal' ? 8 : 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={grid}
            horizontal
            vertical={variant === 'horizontal'}
          />
          {variant === 'horizontal' ? (
            <>
              <XAxis type="number" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" stroke={axis} fontSize={12} tickLine={false} axisLine={false} width={64} />
            </>
          ) : (
            <XAxis dataKey="label" stroke={axis} fontSize={12} tickLine={false} axisLine={false} interval={0} />
          )}
          {variant === 'negative' && <YAxis hide domain={[-negativeMax, negativeMax]} ticks={negativeTicks} />}
          {tooltip}
          {isGrouped && <Legend content={renderLegend} />}

          {isGrouped ? (
            <>
              <Bar
                dataKey="value"
                name={seriesLabels[0] ?? 'Value'}
                fill={chartDefault}
                stackId={variant === 'stacked' ? 'stack' : undefined}
                radius={variant === 'stacked' ? [0, 0, CORNER_RADIUS, CORNER_RADIUS] : [CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS]}
                // See DonutChart.tsx: Recharts 3.9.2 can commit a shape's
                // entrance animation on an empty intermediate frame and never
                // repaint past it. Confirmed here too for grouped/stacked
                // Bars (plain single-series Bar wasn't affected).
                isAnimationActive={false}
                activeBar={makeActiveBar('value')}
                onMouseEnter={handleBarEnter('value')}
                onMouseLeave={handleBarLeave}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={chartDefault} fillOpacity={dims(i) ? 0.45 : 1} className={rich && hoverIndex === i ? styles.hot : undefined} />
                ))}
              </Bar>
              {hasSecondSeries && (
                <Bar
                  dataKey="value2"
                  name={seriesLabels[1] ?? 'Value 2'}
                  fill={chartSecondary}
                  stackId={variant === 'stacked' ? 'stack' : undefined}
                  radius={variant === 'stacked' ? [CORNER_RADIUS, CORNER_RADIUS, 0, 0] : [CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS]}
                  isAnimationActive={false}
                  activeBar={makeActiveBar('value2')}
                  onMouseEnter={handleBarEnter('value2')}
                  onMouseLeave={handleBarLeave}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={chartSecondary} fillOpacity={dims(i) ? 0.45 : 1} className={rich && hoverIndex === i ? styles.hot : undefined} />
                  ))}
                </Bar>
              )}
            </>
          ) : (
            <Bar
              dataKey="value"
              name="Value"
              // Recharts' tooltip payload derives its color swatch from the
              // Bar's own `fill`, not from per-index Cells -- keep it in
              // sync with whichever bar is actually hovered so the
              // tooltip's dot matches (Cells still drive the real render).
              fill={hoverIndex !== null ? singleSeriesFill(hoverIndex) : chartDefault}
              radius={[CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS]}
              isAnimationActive={false}
              activeBar={makeActiveBar('value')}
              onMouseEnter={handleBarEnter('value')}
              onMouseLeave={handleBarLeave}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={singleSeriesFill(i)} fillOpacity={singleSeriesOpacity(i)} className={rich && hoverIndex === i ? styles.hot : undefined} />
              ))}
            </Bar>
          )}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
