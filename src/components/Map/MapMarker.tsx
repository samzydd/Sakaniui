/**
 * MapMarker
 *
 * A place on a Map. Matches the Figma "Map Marker" set:
 *   variant  pin (32x40 teardrop, anchored at its tip)
 *            dot (16px, anchored at its centre; "you are here")
 *            cluster (40px circle with a count, anchored at its centre)
 *   state    hover (CSS) and selected (prop): the pin lifts and grows 1.25x,
 *            the dot and cluster gain an accent/subtle halo
 * Fills are accent/default with a 2px bg/surface outline and the glyph in
 * fg/on-accent, so markers flip with the theme like the rest of the system.
 *
 * With onClick it renders a <button>; otherwise a plain element with role="img".
 */

import React from 'react';
import { useMapContext } from './context';
import { useGlide } from './useGlide';
import type { LatLng } from './geo';
import styles from './Map.module.css';

export type MapMarkerVariant = 'pin' | 'dot' | 'cluster';

export interface MapMarkerProps {
  /** [latitude, longitude] */
  position: LatLng;
  variant?: MapMarkerVariant;
  /** Number shown on a cluster. */
  count?: number;
  selected?: boolean;
  /**
   * Milliseconds to slide to a new `position` instead of jumping, for markers fed by a live source
   * (about the interval between updates reads as continuous). Off by default; reduced motion turns it off.
   */
  glide?: number;
  /** Accessible name, e.g. the place's name. */
  label?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const PIN = 'M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24C32 7.163 24.837 0 16 0Z';

export const MapMarker: React.FC<MapMarkerProps> = ({
  position, variant = 'pin', count, selected, glide, label, onClick, className,
}) => {
  const { project } = useMapContext();
  const shown = useGlide(position, glide);
  const p = project(shown);
  if (!p) return null;

  const cls = [styles.marker, styles[`marker--${variant}`], selected ? styles['marker--selected'] : '', className ?? ''].filter(Boolean).join(' ');
  const body = variant === 'pin' ? (
    <>
      <span className={styles.pinShadow} />
      <svg className={styles.pin} viewBox="-1 -1 34 42" aria-hidden="true">
        <path d={PIN} />
        <circle cx="16" cy="16" r="6" />
      </svg>
    </>
  ) : variant === 'cluster' ? (
    <span className={styles.clusterCount}>{count}</span>
  ) : null;

  const style = { left: p.x, top: p.y };
  const name = label ?? (variant === 'cluster' && count != null ? `${count} places` : undefined);

  return onClick ? (
    <button type="button" className={cls} style={style} aria-label={name} aria-pressed={selected} data-map-ui="" onClick={onClick}>
      {body}
    </button>
  ) : (
    <span className={cls} style={style} role={name ? 'img' : undefined} aria-label={name} aria-hidden={name ? undefined : true}>
      {body}
    </span>
  );
};

MapMarker.displayName = 'MapMarker';
export default MapMarker;
