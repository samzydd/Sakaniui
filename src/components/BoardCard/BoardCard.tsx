/**
 * BoardCard
 *
 * Flexible board/list card. Matches the Figma "Board Card" set:
 *
 *   type  (Figma "Type" axis)  -> compact | default | cover
 *   state (Figma "State" axis) -> default | hover | selected | dragging | done
 *
 * Content type is NOT a variant — the leading slot, tags, and meta items are
 * composed by the caller, so the same card expresses tasks, deals, files,
 * bugs, or applicants. See the presets in the stories.
 *
 * Regions (top→bottom): cover (cover type) · header (leading + title +
 * trailing) · description (non-compact) · tags (non-compact) · footer
 * (meta items + avatars), separated by a hairline divider.
 *
 * Moving on: give the card `onMoveNext` (and `onMoveBack`) and the card's footer gets a small round control, shown when
 * the card is hovered or focused; hover it and a label names the stage ("In progress"). It is part of the card, in
 * the footer beside the avatars. The card becomes focusable and Alt + → / Alt + ← do the same from the keyboard. This
 * is the "State=Move" look in the Figma "Board Card" set (the Stage Mover set).
 */

import React from 'react';
import { StageMover } from './StageMover';
import styles from './BoardCard.module.css';

export type BoardCardType = 'compact' | 'default' | 'cover';
export type BoardCardState = 'default' | 'hover' | 'selected' | 'dragging' | 'done';

export interface BoardCardProps {
  type?: BoardCardType;
  state?: BoardCardState;
  /** Cover media (cover type only). */
  cover?: React.ReactNode;
  /** Leading slot: Checkbox, Avatar, status dot, or icon. Identity of the card. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** Trailing slot: priority icon, kebab menu trigger, or status. */
  trailing?: React.ReactNode;
  /** Shown for default/cover types. */
  description?: React.ReactNode;
  /** Badge instances. Shown for default/cover types. */
  tags?: React.ReactNode;
  /** CardMetaItem instances. */
  meta?: React.ReactNode;
  /** AvatarGroup / Avatar, right-aligned in the footer. */
  assignees?: React.ReactNode;
  onClick?: () => void;
  /** Move the card to the next stage. Adds a control to the card's footer, and Alt + → on the focused card. */
  onMoveNext?: () => void;
  /** The next stage's name, for the button ("In progress"). */
  nextLabel?: string;
  /** The next stage's colour, a dot in the button. Any CSS colour. */
  nextColor?: string;
  /** Move the card back a stage. Adds a back half to the footer control, and Alt + ← on the focused card. */
  onMoveBack?: () => void;
  backLabel?: string;
  backColor?: string;
  /** Hides the control and ignores the shortcuts: a move is under way, or a card is being dragged. */
  moveDisabled?: boolean;
  className?: string;
}

export const BoardCard: React.FC<BoardCardProps> = ({
  type = 'default',
  state = 'default',
  cover,
  leading,
  title,
  trailing,
  description,
  tags,
  meta,
  assignees,
  onClick,
  onMoveNext,
  nextLabel = 'the next stage',
  nextColor,
  onMoveBack,
  backLabel = 'the previous stage',
  backColor,
  moveDisabled,
  className,
}) => {
  const showBody = type !== 'compact';
  const movable = !!(onMoveNext || onMoveBack);
  const hasFooter = meta || assignees || movable;
  const onKeyDown = movable
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Alt + arrows on the card itself (not on a button or field inside it)
        if (!e.altKey || moveDisabled || e.target !== e.currentTarget) return;
        if (e.key === 'ArrowRight' && onMoveNext) { e.preventDefault(); onMoveNext(); }
        else if (e.key === 'ArrowLeft' && onMoveBack) { e.preventDefault(); onMoveBack(); }
      }
    : undefined;
  return (
    <div
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={movable ? 0 : undefined}
      data-mover-host={movable ? '' : undefined}
      aria-keyshortcuts={movable ? [onMoveBack && 'Alt+ArrowLeft', onMoveNext && 'Alt+ArrowRight'].filter(Boolean).join(' ') : undefined}
      aria-selected={state === 'selected' || undefined}
      className={[styles.card, styles[`card--${type}`], styles[`card--${state}`], className ?? '']
        .filter(Boolean).join(' ')}
    >
      {type === 'cover' && <div className={styles.card__cover}>{cover}</div>}

      <div className={styles.card__header}>
        {leading && <span className={styles.card__leading}>{leading}</span>}
        <span className={styles.card__title}>{title}</span>
        {trailing && <span className={styles.card__trailing}>{trailing}</span>}
      </div>

      {showBody && description && <p className={styles.card__desc}>{description}</p>}
      {showBody && tags && <div className={styles.card__tags}>{tags}</div>}

      {hasFooter && (
        <>
          <div className={styles.card__divider} />
          <div className={styles.card__footer}>
            {meta && <div className={styles.card__meta}>{meta}</div>}
            {movable ? (
              <div className={styles.card__end}>
                {assignees && <div className={styles.card__assignees}>{assignees}</div>}
                <StageMover
                  onNext={onMoveNext}
                  nextLabel={nextLabel}
                  nextColor={nextColor}
                  onBack={onMoveBack}
                  backLabel={backLabel}
                  backColor={backColor}
                  disabled={moveDisabled}
                />
              </div>
            ) : (
              assignees && <div className={styles.card__assignees}>{assignees}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BoardCard;
