/**
 * IconButton
 *
 * Icon-only button. Matches Figma "Icon Button":
 *   variant (IB axis): primary | secondary | outline | ghost | destructive
 *   size: sm (32) | md (40) | lg (48) — square, radius-sm
 *   State handled via CSS (:hover, :disabled).
 *
 * Mirrors Button's variant color logic, but square with a centered Lucide icon.
 */

import React from 'react';

import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import styles from './IconButton.module.css';
import type { IconComponent } from '../../icons/types';

export type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon component (Tabler or Lucide), passed as the component itself, e.g. icon={IconSettings}. */
  icon: IconComponent;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Required for accessibility — describes the action. */
  'aria-label': string;
}

const iconSizes: Record<IconButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, variant = 'primary', size = 'md', disabled, className, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={[
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        className ?? '',
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* Sizes here (16/18/20) are all below Lucide's fixed 24-unit grid,
          so a flat strokeWidth={1.5} would render visibly thinner than
          Figma's own same-size-native icon exports -- see iconStrokeWidth. */}
      <Icon size={iconSizes[size]} strokeWidth={iconStrokeWidth(iconSizes[size])} aria-hidden="true" />
    </button>
  )
);

IconButton.displayName = 'IconButton';
export default IconButton;
