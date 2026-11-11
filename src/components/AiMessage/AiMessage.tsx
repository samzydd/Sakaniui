/**
 * AiMessage
 *
 * One turn of an AI conversation. Matches Figma "AI Message": Role Assistant (State Streaming | Done) or User.
 *
 *   assistant  full-width text beside an ember-ringed avatar; a row of copy, regenerate and feedback actions under it once done
 *   user       a right-aligned bubble
 *
 * `streaming` hides the actions and ends the text with a slate caret. Paragraphs: pass several children (or <p>s) and they sit
 * 12px apart; a plain string is one paragraph. The actions are callbacks (`onCopy`, `onRegenerate`, `onFeedback`): it copies
 * and sends nothing itself. Pass `actions={false}` to leave the row out, or a node to replace it.
 */

import React from 'react';
import { AiGlyph } from '../../lib/AiGlyph';
import { IconCopy } from '../../icons/outline/copy';
import { IconRefresh } from '../../icons/outline/refresh';
import { IconThumbUp } from '../../icons/outline/thumb-up';
import { IconThumbDown } from '../../icons/outline/thumb-down';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { IconButton } from '../IconButton';
import styles from './AiMessage.module.css';

export type AiMessageRole = 'assistant' | 'user';

export interface AiMessageProps {
  role?: AiMessageRole;
  /** Assistant only: the reply is still arriving. */
  streaming?: boolean;
  /** The text. */
  children?: React.ReactNode;
  /** Assistant only. `false` leaves the row out; a node replaces it. Default: the four built-in actions. */
  actions?: boolean | React.ReactNode;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onFeedback?: (value: 'up' | 'down') => void;
  className?: string;
}

export const AiMessage: React.FC<AiMessageProps> = ({
  role = 'assistant', streaming, children, actions = true, onCopy, onRegenerate, onFeedback, className,
}) => {
  if (role === 'user') {
    return (
      <div className={[styles.user, className ?? ''].filter(Boolean).join(' ')}>
        <div className={styles.bubble}>{children}</div>
      </div>
    );
  }
  const paragraphs = React.Children.toArray(children).map((c, i) => (typeof c === 'string' || typeof c === 'number' ? <p key={i}>{c}</p> : c));
  return (
    <div className={[styles.assistant, streaming ? styles['assistant--streaming'] : '', className ?? ''].filter(Boolean).join(' ')}>
      <span className={styles.avatar} aria-hidden="true"><AiGlyph size={14} strokeWidth={iconStrokeWidth(14)} /></span>
      <div className={styles.content}>
        <div className={styles.text} aria-live={streaming ? 'polite' : undefined} aria-busy={streaming || undefined}>{paragraphs}</div>
        {!streaming && actions !== false && (
          actions === true || actions === undefined ? (
            <div className={styles.actions} role="group" aria-label="Message actions">
              <IconButton icon={IconCopy} variant="ghost" size="sm" aria-label="Copy" onClick={onCopy} />
              <IconButton icon={IconRefresh} variant="ghost" size="sm" aria-label="Regenerate" onClick={onRegenerate} />
              <IconButton icon={IconThumbUp} variant="ghost" size="sm" aria-label="Good response" onClick={() => onFeedback?.('up')} />
              <IconButton icon={IconThumbDown} variant="ghost" size="sm" aria-label="Bad response" onClick={() => onFeedback?.('down')} />
            </div>
          ) : actions
        )}
      </div>
    </div>
  );
};

export default AiMessage;
