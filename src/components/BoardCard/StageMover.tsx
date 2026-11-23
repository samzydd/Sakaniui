/**
 * StageMover
 *
 * The control inside a board card's footer that moves the card one stage on (and, when you pass a back handler, one
 * stage back). A small round chevron at rest; hover or focus it and a dark label names where the card is going
 * ("In progress"), with that stage's colour. Matches the Figma "Stage Mover" set (Type: Next | Pair).
 *
 * Internal to BoardCard: you pass `onMoveNext` / `onMoveBack` to the card and it draws this in its footer.
 */

import React from 'react';
import { IconChevronLeft } from '../../icons/outline/chevron-left';
import { IconChevronRight } from '../../icons/outline/chevron-right';
import styles from './StageMover.module.css';

export interface StageMoverProps {
  onNext?: () => void;
  /** The stage the card goes to: in the label and read out ("Move to In progress"). */
  nextLabel: string;
  /** That stage's colour: the dot in the label. Any CSS colour. */
  nextColor?: string;
  onBack?: () => void;
  backLabel: string;
  backColor?: string;
  disabled?: boolean;
}

const Tip: React.FC<{ label: string; color?: string }> = ({ label, color }) => (
  <span className={styles.tip} aria-hidden>
    {color && <i style={{ background: color }} />}
    {label}
  </span>
);

export const StageMover: React.FC<StageMoverProps> = ({ onNext, nextLabel, nextColor, onBack, backLabel, backColor, disabled }) => {
  const press = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn?.();
  };
  return (
    <span className={[styles.group, onBack && onNext ? styles['group--pair'] : ''].filter(Boolean).join(' ')} data-stage-mover>
      {onBack && (
        <button type="button" className={[styles.btn, styles['btn--back']].join(' ')} aria-label={`Move to ${backLabel}`} disabled={disabled} data-mover="back" onClick={press(onBack)}>
          <IconChevronLeft size={16} aria-hidden />
          <Tip label={backLabel} color={backColor} />
        </button>
      )}
      {onNext && (
        <button type="button" className={[styles.btn, styles['btn--next']].join(' ')} aria-label={`Move to ${nextLabel}`} disabled={disabled} data-mover="next" onClick={press(onNext)}>
          <IconChevronRight size={16} aria-hidden />
          <Tip label={nextLabel} color={nextColor} />
        </button>
      )}
    </span>
  );
};

export default StageMover;
