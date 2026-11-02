/**
 * MapControlButton and MapControls
 *
 * The buttons a Map shows top-right. Match the Figma "Map Control Button" set (State: Default, Hover,
 * Disabled) and "Map Controls" (a zoom group, and an optional locate button below it):
 *   button   32x32, icon 16, fg/default; hover bg/subtle; disabled fg/subtle
 *   group    bg/surface, border/default, radius-md, shadow-md; the two zoom buttons share one with a divider
 * Map renders MapControls itself (`controls`, `locate`); these are exported so a custom overlay can reuse them.
 */

import React from 'react';
import { IconPlus as Plus } from '../../icons/outline/plus';
import { IconMinus as Minus } from '../../icons/outline/minus';
import { IconCurrentLocation as Locate } from '../../icons/outline/current-location';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import type { IconComponent } from '../../icons/types';
import styles from './Map.module.css';

export interface MapControlButtonProps {
  /** The icon, drawn at 16px. */
  icon: IconComponent;
  /** Accessible name; the button has no visible text. */
  'aria-label': string;
  disabled?: boolean;
  /** Shows the hover appearance without a pointer (documentation and visual tests). */
  hovered?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MapControlButton: React.FC<MapControlButtonProps> = ({ icon: Icon, hovered, className, onClick, disabled, ...rest }) => (
  <button
    type="button"
    className={[styles.button, className ?? ''].filter(Boolean).join(' ')}
    data-hovered={hovered ? '' : undefined}
    disabled={disabled}
    onClick={onClick}
    {...rest}
  >
    <Icon size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
  </button>
);
MapControlButton.displayName = 'MapControlButton';

export interface MapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  /** Disables the zoom-in button, e.g. at the map's maximum zoom. */
  zoomInDisabled?: boolean;
  zoomOutDisabled?: boolean;
  /** Show the zoom group. Defaults to true. */
  zoom?: boolean;
  /** Show the locate button under it (Figma "Show locate"). Defaults to false. */
  locate?: boolean;
  onLocate?: () => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn, onZoomOut, zoomInDisabled, zoomOutDisabled, zoom = true, locate = false, onLocate, className,
}) => (
  <div className={[styles.controls, className ?? ''].filter(Boolean).join(' ')} data-map-ui="">
    {zoom && (
      <div className={styles.group}>
        <MapControlButton icon={Plus} aria-label="Zoom in" disabled={zoomInDisabled} onClick={onZoomIn} />
        <span className={styles.divider} />
        <MapControlButton icon={Minus} aria-label="Zoom out" disabled={zoomOutDisabled} onClick={onZoomOut} />
      </div>
    )}
    {locate && (
      <div className={styles.group}>
        <MapControlButton icon={Locate} aria-label="Show my location" onClick={onLocate} />
      </div>
    )}
  </div>
);
MapControls.displayName = 'MapControls';
