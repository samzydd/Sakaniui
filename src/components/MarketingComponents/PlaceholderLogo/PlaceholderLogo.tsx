/**
 * PlaceholderLogo
 *
 * Matches Figma "Placeholder Logo" (Marketing primitives set, 3 sizes:
 * sm 22 / md 40 / lg 46) -- a bg/surface + border/subtle + radius/lg
 * square slot for a company/brand mark, same "empty-state avatar" role
 * Avatar's own Icon type fills for a person. Figma's own asset inside
 * this frame is this library's own SakaniUI arc mark, used here as the
 * default fill exactly as shown in the design file. It is drawn inline in
 * fg/default, so it re-themes with the frame. `logo` is still a consumer-supplied override slot exactly like
 * Avatar's own `icon` prop -- a real usage (a logo wall, a company
 * directory row, a "brands using this" grid) drops in an arbitrary
 * company's own mark instead, whether that's another lucide icon (still
 * cloned with the correct compensated size/strokeWidth) or a plain
 * image/ReactNode.
 *
 * Container/icon px pairs per size are Figma's own literal presets, not
 * one shared ratio -- sm is 22/14, md is 40/16, lg is 46/18, none of
 * which share a common scale factor, so each is hardcoded rather than
 * derived from a formula.
 */

import React from 'react';
import { SakaniLogo } from '../../../lib/SakaniLogo';
import { iconStrokeWidth } from '../../../lib/iconStrokeWidth';
import styles from './PlaceholderLogo.module.css';

export type PlaceholderLogoSize = 'sm' | 'md' | 'lg';

const ICON_PX: Record<PlaceholderLogoSize, number> = { sm: 14, md: 16, lg: 18 };

export interface PlaceholderLogoProps {
  /** Figma Size axis. Defaults to "md". */
  size?: PlaceholderLogoSize;
  /** Custom logo/icon slot. Defaults to the Sakani mark, matching Figma. */
  logo?: React.ReactNode;
  /** Accessible name, e.g. "Acme Inc." */
  label?: string;
  className?: string;
}

export const PlaceholderLogo: React.FC<PlaceholderLogoProps> = ({
  size = 'md', logo, label, className,
}) => {
  const iconPx = ICON_PX[size];
  const renderedLogo = React.isValidElement<{ size?: number; strokeWidth?: number }>(logo)
    ? React.cloneElement(logo, { size: iconPx, strokeWidth: iconStrokeWidth(iconPx) })
    : (logo ?? <span className={styles.defaultMark} style={{ width: iconPx, height: iconPx }}><SakaniLogo size={iconPx} /></span>);

  return (
    <span
      className={[styles.root, styles[`root--${size}`], className ?? ''].filter(Boolean).join(' ')}
      role="img"
      aria-label={label ?? 'Logo placeholder'}
    >
      {renderedLogo}
    </span>
  );
};

export default PlaceholderLogo;
