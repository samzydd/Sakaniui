/**
 * RadarChart
 *
 * Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Radar
 * charts" component set:
 *
 *   default             — solid filled area, polygon grid, no dots
 *   dots                — filled area + dot markers at each data point
 *   dots-grid-none      — dots, but no grid/boundary at all
 *   lines-only          — two series, stroke only (no fill), no dots
 *   circle-grid         — circular grid instead of polygon, with dots
 *   circle-grid-no-lines — circular grid with dots, no radial spoke lines
 *   grid-custom         — boundary-only grid, same treatment as "default"
 *   grid-filled         — polygon grid, alternating filled concentric bands
 *   circle-grid-filled  — same, circular bands instead of polygon
 *   multiple            — two series overlaid, semi-transparent fills
 *   custom-label        — two series, vertex labels replaced by a
 *                          "value/value2" + category name block
 *
 * Not ported: the soft blurred glow behind one mockup ("Variant12") -- a
 * decorative embellishment on top of the same underlying shape rather than
 * a structurally different chart.
 *
 * grid-filled/circle-grid-filled's alternating bands aren't something
 * PolarGrid can do (it only strokes rings, never fills them).
 * grid-filled's bands are built as extra low-opacity `<Radar>` series at
 * fixed fractions of the data's max value, so they automatically share the
 * real series' exact polygon geometry with no separate coordinate math.
 * circle-grid-filled needs true circles, which `<Radar>` can't draw (it
 * only ever connects data points with straight lines) -- those are a
 * measured SVG overlay instead, replicating Recharts' own
 * cx/cy/outerRadius="70%" math (confirmed against its PolarUtils source)
 * via a ResizeObserver, with PolarGrid left enabled on top of it for the
 * spokes/ring outlines. Both give the "denser toward center" look for
 * free, via ordinary alpha compositing of same-color layers.
 */

import React from 'react';
import {
  RadarChart as ReRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { useChartTokens } from '../../lib/useChartTokens';
import { ChartTooltip, ChartTooltipCard } from '../../lib/ChartTooltip';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { useReducedMotion } from '../../lib/useReducedMotion';
import styles from './RadarChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type ChartAppearance = 'default' | 'rich';
export type RadarChartVariant =
  | 'default' | 'dots' | 'dots-grid-none' | 'lines-only' | 'circle-grid' | 'circle-grid-no-lines'
  | 'grid-custom' | 'grid-filled' | 'circle-grid-filled' | 'multiple' | 'custom-label';

export interface RadarDatum {
  label: string;
  value: number;
  /** Second series (variant="multiple"). */
  value2?: number;
}

export interface RadarChartProps {
  data: RadarDatum[];
  variant?: RadarChartVariant;
  size?: ChartSize;
  /** Legend labels for `value` / `value2`, shown for "multiple". */
  seriesLabels?: [string, string?];
  /** Draw the loading state (the radar's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  /**
   * `rich`: the livelier look. Shapes get a soft gradient fill, a crisp edge and a glow, grow out of the centre on mount
   * and morph when the data changes, and hovering a spoke draws a crosshair, a dot on each series and a card with the
   * values and the gap between two series. `default` is the Figma look.
   */
  appearance?: ChartAppearance;
  /** appearance="rich" only: the spoke crosshair and its card. Default true. */
  interactive?: boolean;
  className?: string;
}

const heights: Record<ChartSize, number> = { sm: 200, md: 260, lg: 340, xl: 420 };

const CIRCLE_GRID = new Set<RadarChartVariant>(['circle-grid', 'circle-grid-no-lines', 'circle-grid-filled']);
// "Boundary only" grid variants -- no inner concentric rings, no spokes.
const MINIMAL_GRID = new Set<RadarChartVariant>(['default', 'grid-custom']);
// No grid or boundary at all -- just the shape, dots, and axis labels.
const NO_GRID = new Set<RadarChartVariant>(['dots-grid-none']);
// "grid-filled"'s bands follow the polygon's own vertex directions, so
// they're built from stacked `<Radar>` series (see the module doc
// comment). "circle-grid-filled" wants smooth round bands instead, which
// `<Radar>` can't draw -- a measured SVG circle overlay does that job.
const FILLED_GRID = new Set<RadarChartVariant>(['grid-filled']);
const isCircleFilled = (v: RadarChartVariant) => v === 'circle-grid-filled';
// These variants' shape has no stroke around it in Figma -- just the fill.
const NO_STROKE = new Set<RadarChartVariant>([
  'default', 'dots', 'dots-grid-none', 'circle-grid', 'circle-grid-no-lines', 'multiple', 'custom-label',
  'grid-custom', 'grid-filled', 'circle-grid-filled',
]);
const RING_LEVELS = [1, 0.8, 0.6, 0.4, 0.2];

export const RadarChart: React.FC<RadarChartProps> = ({
  data, variant = 'default', size = 'md', seriesLabels = ['Value', 'Value 2'], loading = false, appearance = 'default', interactive = true, className,
}) => {
  const rich = appearance === 'rich';
  const reduced = useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(containerRef);
  const chart1 = cssVar('--color-chart-1') ?? '#ff4700';
  const chart2 = cssVar('--color-chart-2') ?? '#5b92dd';
  // Figma's Radar chart set uses border/default for its grid strokes
  // (confirmed via its variable defs), not border/subtle like most of the
  // other charts here.
  const grid = cssVar('--color-border-default') ?? '#dbdad7';
  // Every label in this chart (axis category ticks, custom-label's
  // value+category block) uses fg/subtle.
  const label = cssVar('--color-fg-subtle') ?? '#a8a29b';
  const isMultiple = variant === 'multiple';
  const isLinesOnly = variant === 'lines-only';
  // "custom-label"/"lines-only" also get the second series, same as
  // "multiple" -- neither shows a legend though (custom-label's own vertex
  // labels already identify each point; lines-only has no fill to need one).
  const showSecondSeries = isMultiple || variant === 'custom-label' || isLinesOnly;
  const showFill = !isLinesOnly;
  const showDots = variant === 'dots' || variant === 'dots-grid-none' || variant === 'circle-grid' || variant === 'circle-grid-no-lines';
  const isFilledGrid = FILLED_GRID.has(variant);
  const isMinimalGrid = MINIMAL_GRID.has(variant);
  const isNoGrid = NO_GRID.has(variant);
  const circleFilled = isCircleFilled(variant);

  // circle-grid-filled: measure the container so the filled-circle overlay
  // below can compute cx/cy/outerRadius pixel-for-pixel the same way
  // Recharts itself does (getMaxRadius in its PolarUtils: half of
  // min(width, height) minus the default 5px margin on each side, times
  // the 70% passed to outerRadius) -- height is already known statically
  // via `heights[size]`, only width needs a runtime measurement.
  const [containerWidth, setContainerWidth] = React.useState(0);
  React.useEffect(() => {
    if (loading || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  // The value axis is given its domain here (a round number just above the data's maximum) rather than left to
  // Recharts' "auto", so the hover overlay can place a dot on each series with the same arithmetic.
  const niceMax = React.useMemo(() => {
    const max = Math.max(1, ...data.flatMap((d) => [d.value, d.value2 ?? 0]));
    const step = 10 ** Math.floor(Math.log10(max)) / 2;
    return Math.ceil(max / step) * step;
  }, [data]);

  const [hover, setHover] = React.useState<{ index: number; x: number; y: number } | null>(null);
  const n = data.length;

  // grid-filled/circle-grid-filled: augment the shared dataset with N extra
  // fields, each a fixed fraction of the real data's max value, so a
  // background `<Radar>` per level can reuse the exact same geometry as
  // the real series (see the module doc comment for why).
  const chartData = React.useMemo(() => {
    if (!isFilledGrid) return data;
    const maxValue = Math.max(1, ...data.flatMap((d) => [d.value, d.value2 ?? 0]));
    return data.map((d) => {
      const rings: Record<string, number> = {};
      RING_LEVELS.forEach((lvl, i) => { rings[`ring${i}`] = lvl * maxValue; });
      return { ...d, ...rings };
    });
  }, [data, isFilledGrid]);

  // "custom-label" replaces the plain category tick with a two-line block:
  // bold "value/value2" on top, the category name muted underneath --
  // there's no separate axis label or grid in Figma's reference, just this.
  const renderVertexTick = (props: any) => {
    const { x, y, cx, cy, payload, textAnchor } = props;
    const row = data.find((d) => d.label === payload?.value) ?? data[payload?.index];
    if (!row) return <g />;
    // Recharts' own computed `textAnchor` (not a hardcoded "middle") is
    // what right-aligns the group at right-side vertices and left-aligns
    // it at left-side ones, matching Figma -- top/bottom vertices already
    // resolve to "middle".
    const dx = x - cx;
    const dy = y - cy;
    const gap = 4;
    const combined = row.value2 !== undefined ? `${row.value}/${row.value2}` : `${row.value}`;

    // Left/right vertices: the two lines straddle the vertex's own height
    // (value above, category below), so a small outward push along the
    // cx/cy -> x/y ray is enough to clear the grid line horizontally.
    // Top/bottom vertices need direction-aware stacking instead -- both
    // lines have to land on the *same* side of the vertex (both above for
    // the top vertex, both below for the bottom one), with whichever line
    // sits nearest the hexagon getting the actual 4px gap; the symmetric
    // straddle used for the sides would otherwise put one line on the
    // wrong side of the vertex, on top of the grid line.
    const isVertical = Math.abs(dy) > Math.abs(dx);
    let valueY: number;
    let labelY: number;
    if (isVertical && dy < 0) {
      // top vertex: category line (nearest) 4px above, value further above
      labelY = y - gap - 6;
      valueY = labelY - 16;
    } else if (isVertical) {
      // bottom vertex: value line (nearest) 4px below, category further below
      valueY = y + gap + 10;
      labelY = valueY + 18;
    } else {
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ly = y + (dy / len) * gap;
      valueY = ly - 8;
      labelY = ly + 12;
    }
    const lx = isVertical ? x : x + (dx / Math.sqrt(dx * dx + dy * dy || 1)) * gap;

    return (
      <g>
        <text x={lx} y={valueY} textAnchor={textAnchor} fill={label} fontSize={15} fontWeight={600} fontFamily="var(--font-sans)">
          {combined}
        </text>
        <text x={lx} y={labelY} textAnchor={textAnchor} fill={label} fontSize={13} fontFamily="var(--font-sans)">
          {row.label}
        </text>
      </g>
    );
  };

  const height = heights[size];
  if (loading) return <ChartSkeleton kind="radar" height={height} className={className} label="Loading radar chart" />;
  const maxRadius = containerWidth > 0 ? Math.min(containerWidth, height) / 2 - 5 : 0;
  const outerR = maxRadius * 0.7;
  const cx = containerWidth / 2;
  const cy = height / 2;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rich || !interactive || n < 3 || containerWidth === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top;
    const dx = x - cx, dy = y - cy;
    if (Math.hypot(dx, dy) > outerR * 1.3) { setHover(null); return; }
    const turn = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
    setHover({ index: Math.round(turn / ((Math.PI * 2) / n)) % n, x, y });
  };

  // where a value sits on a spoke
  const at = (k: number, v: number) => {
    const a = (Math.PI * 2 * k) / n - Math.PI / 2;
    const r = (v / niceMax) * outerR;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const row = hover ? data[hover.index] : null;
  const series = [
    { name: seriesLabels[0] ?? 'Value', color: chart2, key: 'value' as const },
    ...(showSecondSeries ? [{ name: seriesLabels[1] ?? 'Value 2', color: chart1, key: 'value2' as const }] : []),
  ];
  const gap = row && showSecondSeries && row.value2 !== undefined ? row.value2 - row.value : undefined;
  const fillFor = (id: string) => `url(#${uid}${id})`;

  return (
    <div
      ref={containerRef}
      className={[styles.chart, rich ? 'sk-chart-rich' : '', className ?? ''].filter(Boolean).join(' ')}
      style={{ ['--radar-1' as string]: chart2, ['--radar-2' as string]: chart1 }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {/* "circle-grid-filled": concentric filled circles, measured to align
          pixel-for-pixel with Recharts' own circle grid/spokes underneath
          (see the module doc comment). Rendered before ResponsiveContainer
          so the real chart content (including PolarGrid's spokes and ring
          outlines) paints on top of it. */}
      {circleFilled && containerWidth > 0 && (
        <svg className={styles.circleFillSvg} width={containerWidth} height={height}>
          {RING_LEVELS.map((lvl) => (
            <circle key={lvl} cx={containerWidth / 2} cy={height / 2} r={outerR * lvl} fill={chart2} fillOpacity={0.1} />
          ))}
        </svg>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ReRadarChart data={chartData} outerRadius="70%">
          {/* grid-filled skips PolarGrid's stroked rings entirely -- the
              filled bands are the "grid" there, and stroke lines on top of
              them would just compete visually (Figma's reference has
              none). circle-grid-filled keeps PolarGrid enabled for its
              spokes/ring outlines, on top of the filled circles above. */}
          {!isFilledGrid && !isNoGrid && (
            <PolarGrid
              gridType={CIRCLE_GRID.has(variant) ? 'circle' : 'polygon'}
              radialLines={variant !== 'circle-grid-no-lines' && !isMinimalGrid}
              stroke={grid}
            />
          )}
          {/* `stroke` on PolarAngleAxis colors its own outer boundary
              polygon (axisLine), not just the tick text -- left at its
              default it drew a second, fg-muted-colored hexagon directly
              on top of PolarGrid's correct border/default one, reading as
              one much darker/heavier border. PolarGrid already draws the
              real boundary, so this one is switched off entirely. */}
          <PolarAngleAxis
            dataKey="label"
            axisLine={false}
            tick={variant === 'custom-label' ? renderVertexTick : { fill: label, fontSize: 12, fontFamily: 'var(--font-sans)' }}
          />
          {/* "default" shows only the outer boundary -- no inner concentric
              rings, no radial spokes. tickCount=2 on a [0, max] domain
              collapses PolarGrid's auto-generated rings down to just the
              zero-radius point and the outer one. */}
          <PolarRadiusAxis tick={false} axisLine={false} domain={rich ? [0, niceMax] : undefined} tickCount={isMinimalGrid ? 2 : undefined} />
          {!rich && <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />}
          <defs>
            {/* Each shape fades from a faint core to a stronger rim, so the grid shows through its middle. */}
            <radialGradient id={`${uid}a`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={chart2} stopOpacity={0.06} />
              <stop offset="100%" stopColor={chart2} stopOpacity={isMinimalGrid ? 0.55 : 0.42} />
            </radialGradient>
            <radialGradient id={`${uid}b`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={chart1} stopOpacity={0.06} />
              <stop offset="100%" stopColor={chart1} stopOpacity={0.4} />
            </radialGradient>
          </defs>
          {isMultiple && <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-sans)' }} />}
          {isFilledGrid && RING_LEVELS.map((_, i) => (
            <Radar
              key={`ring${i}`}
              dataKey={`ring${i}`}
              stroke="none"
              fill={chart2}
              fillOpacity={0.1}
              isAnimationActive={false}
              legendType="none"
            />
          ))}
          {/* "default"/"dots"/"circle-grid"(-no-lines): Figma's shape has
              no stroke at all around it, just the fill -- "default" is
              also fully opaque (every other variant here keeps the
              semi-transparent fill + stroke, since they need to show
              overlapping series or the grid through it).
              Rendered before value2 (Recharts paints children in JSX
              order, later on top) so the red series sits above blue. */}
          <Radar
            name={isMultiple ? (seriesLabels[0] ?? 'Value') : undefined}
            dataKey="value"
            className={rich ? styles.shape1 : undefined}
            // default (Figma): most variants are fill only, "default" fully opaque, the rest translucent so a second
            // series or the grid shows through. rich: a gradient fill under a crisp edge.
            stroke={rich ? chart2 : NO_STROKE.has(variant) ? 'none' : chart2}
            fill={!showFill ? 'none' : rich ? fillFor('a') : chart2}
            fillOpacity={rich ? 1 : showFill ? (isMinimalGrid ? 1 : showSecondSeries ? 0.45 : 0.5) : 0}
            strokeWidth={rich ? 1.75 : NO_STROKE.has(variant) ? 0 : 2}
            // Recharts' dot markers default to the parent Radar's own stroke color; they get their own explicit fill.
            dot={showDots ? { r: 4, fill: chart2, stroke: 'none' } : false}
            // rich: the shape grows out of the centre on mount and morphs when the data changes
            isAnimationActive={rich && !reduced}
            animationDuration={760}
            animationEasing="ease-out"
          />
          {showSecondSeries && (
            <Radar
              name={isMultiple ? (seriesLabels[1] ?? 'Value 2') : undefined}
              dataKey="value2"
              className={rich ? styles.shape2 : undefined}
              stroke={rich || isLinesOnly ? chart1 : 'none'}
              fill={isLinesOnly ? 'none' : rich ? fillFor('b') : chart1}
              fillOpacity={isLinesOnly ? 0 : rich ? 1 : 0.8}
              strokeWidth={rich ? 1.75 : isLinesOnly ? 2 : 0}
              dot={showDots ? { r: 4, fill: chart1, stroke: 'none' } : false}
              isAnimationActive={rich && !reduced}
              animationDuration={760}
              animationBegin={90}
              animationEasing="ease-out"
            />
          )}
        </ReRadarChart>
      </ResponsiveContainer>

      {hover && row && containerWidth > 0 && (
        <>
          <svg className={styles.overlay} width={containerWidth} height={height} aria-hidden="true">
            <defs>
              <linearGradient id={`${uid}x`} gradientUnits="userSpaceOnUse" x1={cx} y1={cy} x2={at(hover.index, niceMax).x} y2={at(hover.index, niceMax).y}>
                <stop offset="0" stopColor={label} stopOpacity={0.05} />
                <stop offset="1" stopColor={label} stopOpacity={0.75} />
              </linearGradient>
            </defs>
            <line className={styles.crosshair} x1={cx} y1={cy} x2={at(hover.index, niceMax).x} y2={at(hover.index, niceMax).y} stroke={`url(#${uid}x)`} strokeWidth={1.25} />
            {series.map((sr) => {
              const v = row[sr.key];
              if (v === undefined) return null;
              const pt = at(hover.index, v);
              return (
                <g key={sr.key} className={styles.hit} style={{ transformOrigin: `${pt.x}px ${pt.y}px` }}>
                  <circle cx={pt.x} cy={pt.y} r={9} fill={sr.color} fillOpacity={0.18} />
                  <circle cx={pt.x} cy={pt.y} r={4.5} fill={sr.color} stroke={cssVar('--color-bg-canvas') ?? '#fff'} strokeWidth={2} />
                </g>
              );
            })}
          </svg>
          <ChartTooltipCard
            title={row.label}
            rows={series.flatMap((sr, k) => {
              const v = row[sr.key];
              if (v === undefined) return [];
              return [{ color: sr.color, label: sr.name, value: v, delta: k === 1 && gap !== undefined && gap !== 0 ? `${gap > 0 ? '+' : '\u2212'}${Math.abs(gap)}` : undefined }];
            })}
            style={{
              position: 'absolute', zIndex: 20, pointerEvents: 'none',
              left: hover.x > containerWidth * 0.6 ? hover.x - 16 : hover.x + 16,
              top: hover.y - 12,
              transform: hover.x > containerWidth * 0.6 ? 'translate(-100%, -100%)' : 'translate(0, -100%)',
            }}
          />
        </>
      )}
    </div>
  );
};

export default RadarChart;
