/**
 * StageMover
 *
 * The small round button on a board card's edge that moves the card one stage on. A chevron at rest; hover or focus
 * it and it opens into a pill that names where the card is going ("In progress"), with that stage's colour. Matches
 * the Figma "Stage Mover" set (Direction: Next | Back).
 *
 * Internal to BoardCard: you pass `onMoveNext` / `onMoveBack` to the card and it draws these.
 */

import React from 'react';
import { IconChevronLeft } from '../../icons/outline/chevron-left';
import { IconChevronRight } from '../../icons/outline/chevron-right';
import styles from './StageMover.module.css';

export interface StageMoverProps {
  direction: 'next' | 'back';
  /** The stage the card goes to: shown in the pill and read out ("Move to In progress"). */
  label: string;
  /** The stage's colour: a dot in the pill. Any CSS colour. */
  color?: string;
  onClick: () => void;
  disabled?: boolean;
}

export const StageMover: React.FC<StageMoverProps> = ({ direction, label, color, onClick, disabled }) => {
  const Chevron = direction === 'next' ? IconChevronRight : IconChevronLeft;
  const text = (
    <span className={styles.text}>
      <span>
        {color && <i className={styles.dot} style={{ background: color }} aria-hidden />}
        {label}
      </span>
    </span>
  );
  return (
    <button
      type="button"
      className={[styles.mover, styles[`mover--${direction}`]].join(' ')}
      aria-label={`Move to ${label}`}
      disabled={disabled}
      data-mover={direction}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {direction === 'next' ? (<>{text}<Chevron size={16} aria-hidden /></>) : (<><Chevron size={16} aria-hidden />{text}</>)}
    </button>
  );
};

export default StageMover;
