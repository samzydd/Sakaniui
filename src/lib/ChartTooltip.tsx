/**
 * ChartTooltip
 *
 * Shared hover-card content for every Recharts `<Tooltip>` in the system.
 * Recharts' own default tooltip renders colored *text*, not the 8px
 * colored ellipse Figma's "Chart Tooltip" spec calls for next to each row
 * -- so every chart passes this in as `content` instead of relying on the
 * default renderer + `contentStyle`.
 */

import React from 'react';
import styles from './ChartTooltip.module.css';

export interface ChartTooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  payload?: { fill?: string; [key: string]: unknown };
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string;
  /** Custom value formatter, e.g. for percentages. */
  formatter?: (value: ChartTooltipPayloadEntry['value'], name: ChartTooltipPayloadEntry['name']) => React.ReactNode;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label, formatter }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={styles.tooltip}>
      {label !== undefined && label !== '' && <span className={styles.title}>{label}</span>}
      {payload.map((entry, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.dot} style={{ background: entry.color ?? entry.payload?.fill ?? entry.fill, color: entry.color ?? entry.payload?.fill ?? entry.fill }} />
          <span className={styles.label}>{entry.name}</span>
          <span className={styles.value}>{formatter ? formatter(entry.value, entry.name) : entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/** One row of a hand-placed tooltip card. */
export interface ChartTooltipRow {
  color?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  /** A change against another row, e.g. "-20". Coloured by its sign. */
  delta?: string;
}

/**
 * The same card as `ChartTooltip`, for the charts that place their own hover card (radar, funnel, heatmap) instead of
 * handing it to Recharts. `style` positions it; it does not shift itself.
 */
export const ChartTooltipCard: React.FC<{ title?: React.ReactNode; rows: ChartTooltipRow[]; style?: React.CSSProperties; className?: string }> = ({ title, rows, style, className }) => (
  <div className={[styles.tooltip, styles['tooltip--placed'], className ?? ''].filter(Boolean).join(' ')} style={style} role="status">
    {title !== undefined && title !== '' && <span className={styles.title}>{title}</span>}
    {rows.map((r, k) => (
      <div key={k} className={styles.row}>
        {r.color && <span className={styles.dot} style={{ background: r.color, color: r.color }} />}
        <span className={styles.label}>{r.label}</span>
        <span className={styles.value}>{r.value}</span>
        {r.delta && <span className={[styles.delta, r.delta.startsWith('-') || r.delta.startsWith('\u2212') ? styles['delta--down'] : styles['delta--up']].join(' ')}>{r.delta}</span>}
      </div>
    ))}
  </div>
);

export default ChartTooltip;
