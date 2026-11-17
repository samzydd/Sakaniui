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
  /** The line under the key, e.g. "Shaded by annual recurring revenue". */
  caption?: React.ReactNode;
  className?: string;
}

export const RegionMapLegend: React.FC<RegionMapLegendProps> = ({ scale, formatValue = String, caption, className }) => {
  const n = scale.breaks.length + 1;
  return (
    <div className={[styles.legend, className].filter(Boolean).join(' ')}>
      <div className={styles.keyWrap}>
        <div className={styles.key} aria-hidden>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={styles.seg} style={{ background: binColor(i, scale) }} />
          ))}
        </div>
        <ul className={styles.ticks}>
          {scale.breaks.map((b, i) => (
            <li key={i} className={styles.tick} style={{ left: `${((i + 1) / n) * 100}%` }}>
              {formatValue(b)}
            </li>
          ))}
        </ul>
      </div>
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
};

export default RegionMapLegend;
