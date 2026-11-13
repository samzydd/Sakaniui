/**
 * PieChart
 *
 * Recharts wrapper styled with Sakani chart tokens. Matches Figma's "Pie
 * chart" component set (10 variants):
 *
 *   pie                — full pie, white separator strokes between slices
 *   pie-no-separator    — full pie, slices touch directly
 *   label               — full pie, outside leader-line value labels
 *   custom-label        — full pie, leader-line labels in a filled pill
 *   label-list          — full pie, category-name labels inside each slice
 *   donut               — plain ring, no labels
 *   donut-active        — ring with one slice pushed outward ("exploded")
 *   donut-with-text     — ring + center value/caption
 *   stacked             — two concentric rings, same data, same colors
 *   interactive         — ring + a halo ring bracketing one slice
 *
 * No variant has an angular gap between slices (Figma's slices always
 * touch) -- "pie"'s separator is a thin stroke drawn on top of the shared
 * edge, not an actual padding-angle gap.
 *
 * The exploded slice and halo ring aren't things Pie's `activeShape` can
 * do on their own (Recharts 3 dropped `activeIndex` from Pie's types, so
 * there's no way to force a *default* active slice without a real hover) --
 * both are built via a custom `shape` render function using the exported
 * `Sector` primitive, driven by this component's own hover/default-active
 * state instead.
 */

import React from 'react';
import { PieChart as RePieChart, Pie, Cell, Sector, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartTokens } from '../../lib/useChartTokens';
import { CHART_PALETTE_FALLBACK } from '../../lib/chartPalette';
import { ChartTooltip } from '../../lib/ChartTooltip';
import { ChartSkeleton } from '../../lib/ChartLoading';
import styles from './PieChart.module.css';

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
export type PieChartVariant =
  | 'pie' | 'pie-no-separator' | 'label' | 'custom-label' | 'label-list'
  | 'donut' | 'donut-active' | 'donut-with-text' | 'stacked' | 'interactive';

export interface PieDatum { label: string; value: number; }

export interface PieChartProps {
  data: PieDatum[];
  variant?: PieChartVariant;
  size?: ChartSize;
  /** Big number shown in the center. Only rendered for "donut-with-text". */
  centerValue?: string;
  centerCaption?: string;
  /** Draw the loading state (the chart's own silhouette, breathing) instead of the chart. */
  loading?: boolean;
  className?: string;
}

const dims: Record<ChartSize, { h: number; outer: number }> = {
  sm: { h: 180, outer: 72 },
  md: { h: 220, outer: 90 },
  lg: { h: 280, outer: 116 },
  xl: { h: 340, outer: 142 },
};

const HAS_HOLE = new Set<PieChartVariant>(['donut', 'donut-active', 'donut-with-text', 'interactive']);
const HAS_EXPLODE = new Set<PieChartVariant>(['donut-active']);
const HAS_HALO = new Set<PieChartVariant>(['interactive']);
const HAS_CENTER = new Set<PieChartVariant>(['donut-with-text']);
const RAD = Math.PI / 180;

export const PieChart: React.FC<PieChartProps> = ({
  data, variant = 'donut', size = 'md', centerValue, centerCaption, loading = false, className,
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const cssVar = useChartTokens(chartRef);
  const [hoverIdx, setHoverIdx] = React.useState<number | undefined>(undefined);
  const palette = [1, 2, 3, 4, 5].map((n) => cssVar(`--color-chart-${n}`) ?? CHART_PALETTE_FALLBACK[n - 1]);
  const surfaceBg = cssVar('--color-bg-surface') ?? '#ffffff';
  const fgDefault = cssVar('--color-fg-default') ?? '#141414';
  const d = dims[size];
  const hasHole = HAS_HOLE.has(variant);
  const hasExplode = HAS_EXPLODE.has(variant);
  const hasHalo = HAS_HALO.has(variant);
  const innerRadius = hasHole ? d.outer * 0.6 : 0;
  const showCenter = HAS_CENTER.has(variant) && (centerValue || centerCaption);
  // "donut-active"/"stacked"/"interactive" show a persistent highlighted
  // slice in Figma's static mockups even with nothing hovered -- default to
  // the first slice, let a real hover override it.
  const activeIdx = hoverIdx ?? ((hasExplode || hasHalo) ? 0 : undefined);

  const renderSector = (props: any) => {
    const { cx, cy, innerRadius: ir, outerRadius: or_, startAngle, endAngle, fill, index } = props;
    const isActive = index === activeIdx;

    // "donut-active"/"stacked"/"interactive": grow the active slice's own
    // outer radius instead of translating it -- translating pulls it out
    // of contact with its neighbors on both sides, leaving a wedge of
    // empty space; growing in place keeps it flush against them, only the
    // outer edge pokes out further than the rest of the ring. "interactive"
    // behaves exactly like "donut-active" here -- same growth amount, same
    // slice size -- the only difference is the extra thin arc added below.
    const growth = isActive && (hasExplode || hasHalo) ? 16 : 0;

    if (isActive && hasHalo) {
      // "interactive" adds one thing on top of the plain grow-in-place
      // above: a thin extra arc just past the grown slice's new outer
      // edge, in the same color as the slice itself (not a neutral halo).
      return (
        <g>
          <Sector cx={cx} cy={cy} innerRadius={ir} outerRadius={or_ + growth} startAngle={startAngle} endAngle={endAngle} fill={fill} />
          <Sector cx={cx} cy={cy} innerRadius={or_ + growth + 3} outerRadius={or_ + growth + 7} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
      );
    }

    return (
      <Sector cx={cx} cy={cy} innerRadius={ir} outerRadius={or_ + growth} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    );
  };

  // Figma's outside leader-line labels are plain fg/default text, not
  // tinted to match each slice (Recharts' own label-color default). Drawing
  // the connecting line ourselves -- as a radial-then-horizontal "elbow",
  // long enough to actually read as a line -- instead of relying on the
  // separate `labelLine` prop (whose default 20px offset renders far too
  // short and faint to notice at this chart size).
  const leaderPath = (props: any) => {
    const { cx, cy, midAngle, outerRadius: or_ } = props;
    const angle = midAngle ?? 0;
    const cos = Math.cos(-angle * RAD);
    const sin = Math.sin(-angle * RAD);
    const startX = cx + or_ * cos;
    const startY = cy + or_ * sin;
    const bendX = cx + (or_ + 16) * cos;
    const bendY = cy + (or_ + 16) * sin;
    const isRight = cos >= 0;
    const endX = bendX + (isRight ? 14 : -14);
    return {
      d: `M ${startX} ${startY} L ${bendX} ${bendY} L ${endX} ${bendY}`,
      endX,
      endY: bendY,
      textAnchor: isRight ? 'start' as const : 'end' as const,
    };
  };

  const renderOutsideLabel = (props: any) => {
    const { value, fill } = props;
    const { d, endX, endY, textAnchor } = leaderPath(props);
    const tx = endX + (textAnchor === 'start' ? 4 : -4);
    return (
      <g>
        <path d={d} fill="none" stroke={fill} strokeWidth={1} />
        <text x={tx} y={endY} textAnchor={textAnchor} dominantBaseline="central" fill={fgDefault} fontSize={12} fontFamily="var(--font-sans)">
          {value}
        </text>
      </g>
    );
  };

  // "custom label": unlike "label", there's no leader line at all -- just
  // larger, bolder plain text sitting close to the slice's own edge, at
  // Recharts' own default outside-label position.
  const renderCustomLabel = (props: any) => {
    const { x, y, textAnchor, value } = props;
    return (
      <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill={fgDefault} fontSize={20} fontWeight={400} fontFamily="var(--font-sans)">
        {value}
      </text>
    );
  };

  const renderInsideLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius: ir, outerRadius: or_, index } = props;
    const r = (ir + or_) / 2;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={11} fontWeight={500} fontFamily="var(--font-sans)">
        {data[index]?.label}
      </text>
    );
  };

  // "stacked": not a single ring at all -- an outer thin donut ring plus a
  // separate inner full pie (no hole, no separator), sharing the same
  // data/colors. Not the single-ring + exploded-slice shape every other
  // variant here uses, so it's handled as its own branch rather than
  // folded into the shared shape/label plumbing below.
  if (loading) return <ChartSkeleton kind={hasHole ? 'ring' : 'pie'} height={d.h} className={className} label="Loading pie chart" />;

  if (variant === 'stacked') {
    const ringFillOpacity = (i: number) => (hoverIdx !== undefined && hoverIdx !== i ? 0.45 : 1);
    return (
      <div ref={chartRef} className={[styles.chart, className ?? ''].filter(Boolean).join(' ')} style={{ height: d.h }}>
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={d.outer * 0.82}
              outerRadius={d.outer}
              paddingAngle={0}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, i) => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(undefined)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} fillOpacity={ringFillOpacity(i)} />
              ))}
            </Pie>
            {/* Inner shape is a full pie (no hole), matching "pie-no-separator"
                -- not a second donut ring. */}
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={0}
              outerRadius={d.outer * 0.62}
              paddingAngle={0}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, i) => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(undefined)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} fillOpacity={ringFillOpacity(i)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
          </RePieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div ref={chartRef} className={[styles.chart, className ?? ''].filter(Boolean).join(' ')} style={{ height: d.h }}>
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius={d.outer}
            // Figma's slices always touch -- "pie"'s separator is a stroke
            // drawn on the shared edge, not an angular gap.
            paddingAngle={0}
            stroke={variant === 'pie' ? surfaceBg : 'none'}
            strokeWidth={variant === 'pie' ? 2 : 0}
            // See DonutChart.tsx: Recharts 3.9.2 can commit Sector-based
            // shapes' entrance animation on an empty intermediate frame and
            // never repaint past it, rendering nothing. Disabled here too.
            isAnimationActive={false}
            shape={hasExplode || hasHalo ? renderSector : undefined}
            label={
              variant === 'label' ? renderOutsideLabel
                : variant === 'custom-label' ? renderCustomLabel
                : variant === 'label-list' ? renderInsideLabel
                : undefined
            }
            labelLine={false}
            onMouseEnter={(_, i) => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(undefined)}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} className={hoverIdx === i ? styles.hot : undefined} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
        </RePieChart>
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

export default PieChart;
