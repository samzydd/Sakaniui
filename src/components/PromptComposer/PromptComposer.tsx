/**
 * PromptComposer
 *
 * The prompt box of an AI product. Matches Figma "AI Prompt Composer": State Empty | Typing | Streaming | Attached.
 *
 *   empty      the send button is off
 *   typing     a metal focus border draws in, send is on
 *   streaming  `status="streaming"`: send becomes Stop (`onStop`)
 *   attached   pass chips (AttachmentChip) as `attachments` and they sit above the field
 *
 * The field is a textarea that grows with the text up to `maxRows` lines (8), then scrolls. Enter sends and Shift+Enter breaks
 * the line. `value` / `onValueChange` control it, or leave them and `defaultValue` is the start. It owns no model, files or
 * voice: the + button calls `onAttach`, the mic `onVoice`, and the model picker and the like go beside it, in `actions`
 * (left, after the +) or in a row under the box. Focus draws the metal border in over 160ms; send and stop morph over 180ms.
 */

import React from 'react';
import { IconPlus } from '../../icons/outline/plus';
import { IconMicrophone } from '../../icons/outline/microphone';
import { IconArrowUp } from '../../icons/outline/arrow-up';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { AiFocusRing } from '../../lib/AiGlow';
import styles from './PromptComposer.module.css';

export type PromptComposerStatus = 'idle' | 'streaming';

export interface PromptComposerProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** While `streaming`, send becomes Stop. */
  status?: PromptComposerStatus;
  /** Enter, or the send button. Receives the trimmed text. */
  onSubmit?: (value: string) => void;
  onStop?: () => void;
  /** The + button. Hidden when there is no handler and `attachments` is unset... pass `onAttach` to show it. */
  onAttach?: () => void;
  /** The mic. Hidden when there is no handler. */
  onVoice?: () => void;
  /** Chips above the field, usually AttachmentChip. */
  attachments?: React.ReactNode;
  /** Extra controls on the left, after the +. */
  actions?: React.ReactNode;
  /** The most lines the field grows to before it scrolls. Default 8. */
  maxRows?: number;
  disabled?: boolean;
  /** Focus the field on mount. */
  autoFocus?: boolean;
  /** Accessible name of the field. */
  'aria-label'?: string;
  className?: string;
}

const LINE = 24;

export const PromptComposer = React.forwardRef<HTMLTextAreaElement, PromptComposerProps>(
  ({
    value, defaultValue = '', onValueChange, placeholder = 'Ask anything, or type / for skills', status = 'idle', onSubmit, onStop,
    onAttach, onVoice, attachments, actions, maxRows = 8, disabled, autoFocus, 'aria-label': ariaLabel = 'Message', className,
  }, forwarded) => {
    const [inner, setInner] = React.useState(defaultValue);
    const text = value !== undefined ? value : inner;
    const area = React.useRef<HTMLTextAreaElement | null>(null);
    const setRef = (el: HTMLTextAreaElement | null) => {
      area.current = el;
      if (typeof forwarded === 'function') forwarded(el); else if (forwarded) forwarded.current = el;
    };
    const streaming = status === 'streaming';
    const canSend = !disabled && !streaming && text.trim().length > 0;

    // grow with the text, up to maxRows
    React.useLayoutEffect(() => {
      const el = area.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, maxRows * LINE)}px`;
      el.style.overflowY = el.scrollHeight > maxRows * LINE ? 'auto' : 'hidden';
    }, [text, maxRows]);

    const change = (v: string) => { if (value === undefined) setInner(v); onValueChange?.(v); };
    const submit = () => { if (canSend) { onSubmit?.(text.trim()); if (value === undefined) setInner(''); } };

    return (
      <div className={[styles.root, attachments ? styles['root--attached'] : '', disabled ? styles['root--disabled'] : '', className ?? ''].filter(Boolean).join(' ')}>
        {attachments && <div className={styles.attachments}>{attachments}</div>}
        <textarea
          ref={setRef}
          className={styles.field}
          rows={1}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          onChange={(e) => change(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
          }}
        />
        <div className={styles.actions}>
          <div className={styles.left}>
            {onAttach && (
              <button type="button" className={styles.attach} onClick={onAttach} disabled={disabled} aria-label="Attach files">
                <IconPlus size={16} strokeWidth={iconStrokeWidth(16)} />
              </button>
            )}
            {actions}
          </div>
          <div className={styles.right}>
            {onVoice && (
              <button type="button" className={styles.voice} onClick={onVoice} disabled={disabled} aria-label="Dictate">
                <IconMicrophone size={16} strokeWidth={iconStrokeWidth(16)} />
              </button>
            )}
            <button
              type="button"
              className={[styles.send, canSend || streaming ? styles['send--on'] : ''].filter(Boolean).join(' ')}
              onClick={streaming ? onStop : submit}
              disabled={disabled || (!streaming && !canSend)}
              aria-label={streaming ? 'Stop generating' : 'Send message'}
            >
              <span className={[styles.send__icon, streaming ? styles['send__icon--out'] : ''].filter(Boolean).join(' ')}><IconArrowUp size={16} strokeWidth={iconStrokeWidth(16)} /></span>
              <span className={[styles.send__icon, streaming ? '' : styles['send__icon--out']].filter(Boolean).join(' ')}><span className={styles.stop} /></span>
            </button>
          </div>
        </div>
        <AiFocusRing />
      </div>
    );
  },
);
PromptComposer.displayName = 'PromptComposer';

export default PromptComposer;
