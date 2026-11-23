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
 * Moving between stages: give the card `stages`, `stage` and `onMoveTo` and its footer gets a small "Move to" button
 * (⇄), shown when the card is hovered or focused. It opens a short list of the stages, each with its colour; the card's
 * own stage has a check and the next one is highlighted to start with, so one click moves it on and any other stage is
 * one click away. ↑ ↓ or a number pick, Enter moves. The card becomes focusable and Alt + → / Alt + ← move it one stage
 * without the menu. This is the "State=Move" look in the Figma "Board Card" set (with the "Stage Menu").
 */

import React from 'react';
import { StageMenu, type BoardCardStage } from './StageMenu';

export type { BoardCardStage };
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
  /** Every stage the card can be in, in order. With `stage` and `onMoveTo`, adds the "Move to" button to the footer. */
  stages?: BoardCardStage[];
  /** The id of the stage the card is in. */
  stage?: string;
  /** A stage was chosen (from the menu, or Alt + → / Alt + ← on the focused card). The card only reports it: you move it. */
  onMoveTo?: (stageId: string) => void;
  /** Hides the button and ignores the shortcuts: a move is under way, or a card is being dragged. */
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
  stages,
  stage,
  onMoveTo,
  moveDisabled,
  className,
}) => {
  const showBody = type !== 'compact';
  const at = stages && stage != null ? stages.findIndex((x) => x.id === stage) : -1;
  const movable = !!(onMoveTo && stages && stages.length > 1 && at >= 0);
  const hasFooter = meta || assignees || movable;
  const onKeyDown = movable
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Alt + arrows on the card itself (not on a button or field inside it): one stage on or back
        if (!e.altKey || moveDisabled || e.target !== e.currentTarget) return;
        const to = e.key === 'ArrowRight' ? stages![at + 1] : e.key === 'ArrowLeft' ? stages![at - 1] : undefined;
        if (to) { e.preventDefault(); onMoveTo!(to.id); }
      }
    : undefined;
  return (
    <div
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={movable ? 0 : undefined}
      data-mover-host={movable ? '' : undefined}
      aria-keyshortcuts={movable ? 'Alt+ArrowLeft Alt+ArrowRight' : undefined}
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
                <StageMenu stages={stages!} current={stage!} onMove={onMoveTo!} disabled={moveDisabled} />
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
