/**
 * RegionMapLegend
 *
 * The colour key for a RegionMap: one segment per bin, with the break values under the joins between segments. Pass
 * the same `scale` the map uses.
 */

import React from 'react';
import { binColor, type RegionScale } from './scale';
import styles from './RegionMapLegend.module.css';

export interface RegionMapLegendProps {
  scale: RegionScale;
  /** Formats the break labels. Default: `String(value)`. */
  formatValue?: (value: number) => string;
  /** An optional line under the key. */
  caption?: React.ReactNode;
  /** The bin that is lit; every other segment steps back. Null: all equal. */
  activeBin?: number | null;
  /** The bin that is locked on (shown pressed). */
  lockedBin?: number | null;
  /** A bin to outline without dimming the others, e.g. the bin of the hovered region. */
  markBin?: number | null;
  /** Pointer or keyboard focus on a segment (i), and leaving it (null). Makes the segments buttons. */
  onBinHover?: (bin: number | null) => void;
  /** A click or Enter on a segment. */
  onBinClick?: (bin: number) => void;
  /** Show a "No data" swatch for regions without a value. */
  noData?: boolean;
  className?: string;
}

export const RegionMapLegend: React.FC<RegionMapLegendProps> = ({ scale, formatValue = String, caption, activeBin = null, lockedBin = null, markBin = null, onBinHover, onBinClick, noData, className }) => {
  const n = scale.breaks.length + 1;
  return (
    <div className={[styles.legend, className].filter(Boolean).join(' ')}>
      <div className={styles.keyWrap}>
        <div className={styles.key} role={onBinClick ? 'group' : undefined} aria-label={onBinClick ? 'Colour bands' : undefined} aria-hidden={onBinClick ? undefined : true}>
          {Array.from({ length: n }, (_, i) => {
            const common = {
              className: styles.seg,
              style: { background: binColor(i, scale) },
              'data-dim': activeBin !== null && activeBin !== i ? '' : undefined,
              'data-mark': markBin === i ? '' : undefined,
            };
            if (!onBinClick && !onBinHover) return <span key={i} {...common} />;
            const lo = i === 0 ? null : scale.breaks[i - 1];
            const hi = i === n - 1 ? null : scale.breaks[i];
            const label = lo === null ? `Below ${formatValue(hi as number)}` : hi === null ? `${formatValue(lo)} and above` : `${formatValue(lo)} to ${formatValue(hi)}`;
            return (
              <button
                key={i}
                type="button"
                {...common}
                aria-label={label}
                aria-pressed={lockedBin === i}
                onPointerEnter={() => onBinHover?.(i)}
                onPointerLeave={() => onBinHover?.(null)}
                onFocus={() => onBinHover?.(i)}
                onBlur={() => onBinHover?.(null)}
                onClick={() => onBinClick?.(i)}
              />
            );
          })}
        </div>
        <ul className={styles.ticks}>
          {scale.breaks.map((b, i) => (
            <li key={i} className={styles.tick} style={{ left: `${((i + 1) / n) * 100}%` }}>
              {formatValue(b)}
            </li>
          ))}
        </ul>
      </div>
      {noData && (
        <p className={styles.noData}>
          <i className={styles.noDataSwatch} aria-hidden /> No data
        </p>
      )}
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
};

export default RegionMapLegend;
