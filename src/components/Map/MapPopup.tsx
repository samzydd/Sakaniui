/**
 * MapPopup
 *
 * Card that opens above a place on a Map. Matches the Figma "Map Popup":
 * 240px wide, padding 12, gap 4, bg/surface, border/subtle, radius-md,
 * shadow-lg, title (label/md-strong) with an optional close button, a
 * description (body/2xs, fg/muted), and an 8px pointer on the bottom centre
 * whose tip sits `offset` px above the position (48 clears a pin).
 */

import React from 'react';
import { IconX as X } from '../../icons/outline/x';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { useMapContext } from './context';
import { useGlide } from './useGlide';
import type { LatLng } from './geo';
import styles from './Map.module.css';

export interface MapPopupProps {
  /** [latitude, longitude] the pointer points at. */
  position: LatLng;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Shows a close button when given. */
  onClose?: () => void;
  /** Gap between the place and the pointer tip, in px. Defaults to 48 (above a pin); use 14 for a dot. */
  offset?: number;
  /** Milliseconds to follow a moving `position`; use the same value as the marker it points at. */
  glide?: number;
  /** Extra content under the description (actions, a thumbnail...). */
  children?: React.ReactNode;
  className?: string;
}

export const MapPopup: React.FC<MapPopupProps> = ({
  position, title, description, onClose, offset = 48, glide, children, className,
}) => {
  const { project } = useMapContext();
  const shown = useGlide(position, glide);
  const p = project(shown);
  if (!p) return null;
  return (
    <div
      className={[styles.popup, className ?? ''].filter(Boolean).join(' ')}
      style={{ left: p.x, top: p.y - offset }}
      role="dialog"
      aria-label={typeof title === 'string' ? title : undefined}
      data-map-ui=""
      onKeyDown={(e) => { if (e.key === 'Escape' && onClose) { e.stopPropagation(); onClose(); } }}
    >
      {(title || onClose) && (
        <div className={styles.popupHeader}>
          {title && <div className={styles.popupTitle}>{title}</div>}
          {onClose && (
            <button type="button" className={styles.popupClose} aria-label="Close" onClick={onClose}>
              <X size={14} strokeWidth={iconStrokeWidth(14)} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {description && <div className={styles.popupDescription}>{description}</div>}
      {children}
      <span className={styles.popupPointer} aria-hidden="true" />
    </div>
  );
};

MapPopup.displayName = 'MapPopup';
export default MapPopup;
