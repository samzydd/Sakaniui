/**
 * SuggestionChip
 *
 * A suggested prompt. Matches Figma "Suggestion Chip": Style (Starter | Follow-up) x State (Default | Hover).
 *
 *   starter    a card with an icon tile, a title and a one-line hint, for the empty screen
 *   follow-up  a pill with an arrow, for under a reply
 *
 * Choosing one is up to you: fill the prompt box with `label` and send it. Starters rise 8px and fade in 50ms apart when you
 * give each an `index`; hover lifts 1px and strengthens the border; press scales to 0.98. Reduced motion: no rise, lift or scale.
 */

import React from 'react';
import { IconArrowRight } from '../../icons/outline/arrow-right';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import styles from './SuggestionChip.module.css';
import type { IconComponent } from '../../icons/types';

export type SuggestionChipVariant = 'starter' | 'follow-up';

export interface SuggestionChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: SuggestionChipVariant;
  /** The prompt. For a starter it is the title. */
  label: string;
  /** Starter only: a one-line hint under the title. */
  hint?: string;
  /** Starter: the icon in the tile. Follow-up: defaults to an arrow. */
  icon?: IconComponent;
  /** Starter: its place in the row, so each rises 50ms after the one before. */
  index?: number;
}

export const SuggestionChip = React.forwardRef<HTMLButtonElement, SuggestionChipProps>(
  ({ variant = 'follow-up', label, hint, icon, index = 0, className, style, type = 'button', ...rest }, ref) => {
    const Icon = icon ?? (variant === 'follow-up' ? IconArrowRight : undefined);
    return (
      <button
        ref={ref}
        type={type}
        className={[styles.chip, styles[`chip--${variant}`], className ?? ''].filter(Boolean).join(' ')}
        style={{ ['--chip-i' as string]: index, ...style }}
        {...rest}
      >
        {variant === 'starter' ? (
          <>
            {Icon && <span className={styles.tile} aria-hidden="true"><Icon size={16} strokeWidth={iconStrokeWidth(16)} /></span>}
            <span className={styles.text}>
              <span className={styles.label}>{label}</span>
              {hint && <span className={styles.hint}>{hint}</span>}
            </span>
          </>
        ) : (
          <>
            {Icon && <span className={styles.arrow} aria-hidden="true"><Icon size={14} strokeWidth={iconStrokeWidth(14)} /></span>}
            <span className={styles.label}>{label}</span>
          </>
        )}
      </button>
    );
  },
);
SuggestionChip.displayName = 'SuggestionChip';

export default SuggestionChip;
