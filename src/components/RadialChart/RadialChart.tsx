/**
 * RadialChart
 *
 * Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Radial
 * chart" component set (8 variants):
 *
 *   multi          — one concentric ring per data row, full circle
 *   grid           — "multi" + a faint polar grid (spokes + rings) behind it
 *   text           — one thick ring + center value/caption
 *   gauge-tick     — a dial built from individual radial tick marks
 *   stacked-label  — "multi" + a center value/caption overlay
 *   shape          — a single 240° gauge arc, data rows stacked angularly
 *                    (not concentric), remainder shown as a track
 *   stacked        — same 240° gauge arc, no track (rows fill it exactly)
 *   stacked-3-layers — same 240° gauge arc, sized for a 3-row breakdown
 *
 * `gauge-tick` (individual tick marks) and `shape`/`stacked`/
 * `stacked-3-layers` (angularly-stacked segments in one band) have no
 * RadialBarChart equivalent -- RadialBarChart only stacks rows as
 * concentric rings, never as angular segments sharing one ring -- so all
 * four are hand-rolled SVG using the exported `Sector` primitive, same
 * call as HeatmapChart/FunnelChart. "multi"/"grid"/"text"/"stacked-label"
 * are genuine concentric-ring cases, so those stay thin RadialBarChart
 * wrappers.
 */

import React from 'react';
import { RadialBarChart, RadialBar, Cell, Sector, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { useChartTokens } from '../../lib/useChartTokens';
import { ChartSkeleton } from '../../lib/ChartLoading';
import { CHART_PALETTE_FALLBACK } from '../../lib/chartPalette';
import styles from './RadialChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type RadialChartVariant =
  | 'multi' | 'grid' | 'text' | 'shape' | 'gauge-tick' | 'stacked' | 'stacked-3-layers' | 'stacked-label';

export interface RadialDatum { label: string; value: number; max?: number; }

export interface RadialChartProps {
  data: RadialDatum[];
  variant?: RadialChartVariant;
  size?: ChartSize;
  centerValue?: string;
  centerCaption?: string;
  /** Draw the loading state (the chart's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  className?: string;
}

const dims: Record<ChartSize, number> = { sm: 180, md: 220, lg: 280, xl: 340 };

const RAD = Math.PI / 180;

/** Trig results differ between Node and browser JS engines in the last
 *  bit or two (41.61616164265411 vs ...413). Server-rendered charts then
 *  hydrate with mismatched SVG coordinate attributes, which React reports
 *  and refuses to patch. Rounding to 3dp is far below a subpixel at these
 *  viewBox sizes and makes both sides agree exactly. */
const svgRound = (n: number) => Math.round(n * 1000) / 1000;

// [innerRadius%, outerRadius%] of the chart's own max radius, for the
// RadialBarChart-backed ring variants only.
const RADIUS_BAND: Partial<Record<RadialChartVariant, [string, string]>> = {
  multi: ['30%', '100%'],
  grid: ['30%', '100%'],
  'stacked-label': ['30%', '100%'],
  text: ['76%', '100%'],
};

const GaugeTick: React.FC<{ value: number; max: number; color: string; track: string; centerValue?: string; centerCaption?: string; labelColor: string; captionColor: string }> = ({
  value, max, color, track, centerValue, centerCaption, labelColor, captionColor,
}) => {
  const TICKS = 40;
  const cx = 100;
  const cy = 100;
  const startDeg = 180; // gauge sweeps the top half, left to right
  const sweepDeg = 180;
  const filled = Math.round((Math.min(value, max) / max) * TICKS);
  return (
    <svg viewBox="0 0 200 120" className={styles.gaugeSvg}>
      {Array.from({ length: TICKS }).map((_, i) => {
        const deg = startDeg + (i / (TICKS - 1)) * sweepDeg;
        const outerR = 92;
        const innerR = 78;
        const x1 = svgRound(cx + innerR * Math.cos(deg * RAD));
        const y1 = svgRound(cy + innerR * Math.sin(deg * RAD));
        const x2 = svgRound(cx + outerR * Math.cos(deg * RAD));
        const y2 = svgRound(cy + outerR * Math.sin(deg * RAD));
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={i < filled ? color : track}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        );
      })}
      {(centerValue || centerCaption) && (
        <g textAnchor="middle" fontFamily="var(--font-sans)">
          {centerValue && <text x={cx} y={cy - 8} fontSize={22} fontWeight={500} fill={labelColor}>{centerValue}</text>}
          {centerCaption && <text x={cx} y={cy + 12} fontSize={12} fill={captionColor}>{centerCaption}</text>}
        </g>
      )}
    </svg>
  );
};

const PolarGrid: React.FC<{ rings: number; spokes: number; color: string }> = ({ rings, spokes, color }) => (
  <svg viewBox="0 0 200 200" className={styles.gridSvg}>
    {Array.from({ length: rings }).map((_, i) => (
      <circle key={i} cx={100} cy={100} r={((i + 1) / rings) * 96} fill="none" stroke={color} strokeWidth={1} />
    ))}
    {Array.from({ length: spokes }).map((_, i) => {
      const deg = (i / spokes) * 360;
      // Poke out past the outermost ring circle (96) instead of stopping
      // flush with it, for a more visible starburst edge. Extends past the
      // 0-200 viewBox itself now (needs overflow:visible on .gridSvg).
      const spokeR = 99.5 * 1.1;
      const x = svgRound(100 + spokeR * Math.cos(deg * RAD));
      const y = svgRound(100 + spokeR * Math.sin(deg * RAD));
      return <line key={i} x1={100} y1={100} x2={x} y2={y} stroke={color} strokeWidth={1} />;
    })}
  </svg>
);

// "shape"/"stacked"/"stacked-3-layers": data rows stacked *angularly* in
// one 240° gauge-arc ring band (not concentric rings, not a full circle --
// all three share this exact shape in Figma). A gray track sector fills
// whatever's left over when the rows don't add up to `max`.
const ArcGauge: React.FC<{
  data: RadialDatum[]; palette: string[]; track: string;
  centerValue?: string; centerCaption?: string;
  labelColor: string; captionColor: string;
}> = ({ data, palette, track, centerValue, centerCaption, labelColor, captionColor }) => {
  const cx = 100;
  const cy = 100;
  const outerR = 88;
  const innerR = 64;
  const startDeg = 210;
  const endDeg = -30;
  const sweepDeg = startDeg - endDeg;
  const max = data[0]?.max ?? data.reduce((sum, d) => sum + d.value, 0);
  let cursor = startDeg;
  const segments = data.map((d, i) => {
    const segSweep = max > 0 ? (d.value / max) * sweepDeg : 0;
    const segStart = cursor;
    const segEnd = cursor - segSweep;
    cursor = segEnd;
    return { segStart, segEnd, fill: palette[i % palette.length] };
  });
  return (
    // Same tight-viewBox, label-around-cy approach as GaugeTick (cy-8/
    // cy+12) -- Figma centers the label in the arc's upper region, with
    // the arc's legs extending past it, not framing it from below.
    <svg viewBox="0 0 200 160" className={styles.gaugeSvg}>
      {segments.map((s, i) => (
        <Sector key={i} cx={cx} cy={cy} innerRadius={innerR} outerRadius={outerR} startAngle={s.segStart} endAngle={s.segEnd} fill={s.fill} cornerRadius={4} />
      ))}
      {cursor > endDeg + 0.5 && (
        <Sector cx={cx} cy={cy} innerRadius={innerR} outerRadius={outerR} startAngle={cursor} endAngle={endDeg} fill={track} cornerRadius={4} />
      )}
      {(centerValue || centerCaption) && (
        <g textAnchor="middle" fontFamily="var(--font-sans)">
          {centerValue && <text x={cx} y={cy - 8} fontSize={22} fontWeight={500} fill={labelColor}>{centerValue}</text>}
          {centerCaption && <text x={cx} y={cy + 12} fontSize={12} fill={captionColor}>{centerCaption}</text>}
        </g>
      )}
    </svg>
  );
};

export const RadialChart: React.FC<RadialChartProps> = ({
  data, variant = 'multi', size = 'md', centerValue, centerCaption, loading = false, className,
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  const palette = [1, 2, 3, 4, 5].map((n) => cssVar(`--color-chart-${n}`) ?? CHART_PALETTE_FALLBACK[n - 1]);
  const track = cssVar('--color-bg-subtle') ?? '#f5f4f2';
  const gridColor = cssVar('--color-border-subtle') ?? '#e7e5e1';
  const labelColor = cssVar('--color-fg-default') ?? '#141414';
  const captionColor = cssVar('--color-fg-muted') ?? '#78716a';
  const h = dims[size];

  if (loading) return <ChartSkeleton kind="ring" height={h} className={className} label="Loading radial chart" />;

  if (variant === 'gauge-tick') {
    const d = data[0];
    return (
      <div ref={chartRef} className={[styles.chart, className ?? ''].filter(Boolean).join(' ')} style={{ height: h }}>
        <GaugeTick
          value={d?.value ?? 0}
          max={d?.max ?? 100}
          color={palette[0]}
          track={track}
          centerValue={centerValue}
          centerCaption={centerCaption}
          labelColor={labelColor}
          captionColor={captionColor}
        />
      </div>
    );
  }

  if (variant === 'shape' || variant === 'stacked' || variant === 'stacked-3-layers') {
    return (
      <div ref={chartRef} className={[styles.chart, className ?? ''].filter(Boolean).join(' ')} style={{ height: h }}>
        <ArcGauge
          data={data}
          palette={palette}
          track={track}
          centerValue={centerValue}
          centerCaption={centerCaption}
          labelColor={labelColor}
          captionColor={captionColor}
        />
      </div>
    );
  }

  const [innerR, outerR] = RADIUS_BAND[variant] ?? ['30%', '100%'];
  const showCenter = (variant === 'stacked-label' || variant === 'text') && (centerValue || centerCaption);

  return (
    <div ref={chartRef} className={[styles.chart, className ?? ''].filter(Boolean).join(' ')} style={{ height: h }}>
      {variant === 'grid' && <PolarGrid rings={8} spokes={12} color={gridColor} />}
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          innerRadius={innerR}
          outerRadius={outerR}
          startAngle={90}
          endAngle={-270}
          barCategoryGap="12%"
        >
          <PolarAngleAxis type="number" domain={[0, data[0]?.max ?? 100]} tick={false} axisLine={false} />
          {/* See DonutChart.tsx: Recharts 3.9.2 can commit Sector-based
              shapes' (Pie, RadialBar) entrance animation on an empty
              intermediate frame and never repaint past it -- confirmed here
              too (background track rendered, the actual value arcs didn't,
              until this was added). */}
          <RadialBar
            dataKey="value"
            // "grid" relies on the polar grid itself as the backdrop --  a
            // solid track disc would paint over the grid lines completely
            // (they share the same 30%-100% band), so it's disabled there.
            background={variant === 'grid' ? false : { fill: track }}
            cornerRadius={8}
            isAnimationActive={false}
          >
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </RadialBar>
        </RadialBarChart>
      </ResponsiveContainer>

      {showCenter && (
        <div className={styles.center}>
          {centerValue && <span className={styles.center__value}>{centerValue}</span>}
          {centerCaption && <span className={styles.center__caption}>{centerCaption}</span>}
        </div>
      )}
    </div>
  );
};

export default RadialChart;
