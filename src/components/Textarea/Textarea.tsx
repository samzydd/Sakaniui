/**
 * Textarea
 *
 * Multi-line text input. Matches Figma "Textarea" parent component:
 *   State (Default|Focus|Error|Disabled|Filled), Title/Description toggles.
 *
 * Exact Figma spec:
 *   - Field: vertical, 6px gap
 *   - Label: label/md (14px/500, fg/default)
 *   - Box: bg/surface, border/default 1px, radius-md, padding 10/14, 84px tall
 *   - Value/placeholder: body/sm (14px/500, fg/subtle placeholder / fg/default value)
 *   - Description: body/xs (13px/500, fg/muted)
 *   - Focus: border/strong 1.5px, no shadow (re-read from Figma, matching
 *     Input's own focus-within exactly)
 *   - Error: danger/solid 1.5px, unaffected by focus
 *   - Disabled: bg/subtle, border/subtle, 60% opacity
 *
 * variant="ai": the prompt box of an AI product. A rounded 28px box with the field on top (16px, growing with the text up
 * to `maxRows`), an actions row underneath (`leading` on the left, `trailing` on the right: an attach button, a mic, a send
 * button) and a light that sweeps around the border (`glow`).
 */

import React from 'react';
import { AiGlow, type AiGlowMode } from '../../lib/AiGlow';
import styles from './Textarea.module.css';

export type TextareaVariant = 'default' | 'ai';
export type TextareaGlow = AiGlowMode;

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  /** "ai" is the prompt box of an AI product: a rounded box, a 16px field that grows with the text, an actions row and a light
   *  around the border. Defaults to "default". */
  variant?: TextareaVariant;
  /** variant="ai": the light that sweeps clockwise around the border. "pulse" (default) sweeps every 2.5s while idle and once each
   *  time the field takes focus; "focus" sweeps only on focus; "off" draws none. Reduced motion draws none. */
  glow?: AiGlowMode;
  /** variant="ai": actions on the left of the row under the field, such as an attach button. */
  leading?: React.ReactNode;
  /** variant="ai": actions on the right of that row, such as a mic and a send button. */
  trailing?: React.ReactNode;
  /** variant="ai": the most lines the field grows to before it scrolls. Defaults to 8. */
  maxRows?: number;
}

const LINE_PX = 24;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  // rows=3 is what lands on Figma's 84px box (3 x 20px lines + 10/10 padding);
  // the old default of 4 rendered 102px, so min-height never applied.
  ({ label, description, error, disabled, id, className, rows, variant = 'default', glow = 'pulse', leading, trailing, maxRows = 8, onInput, ...rest }, ref) => {
    const reactId = React.useId();
    const areaId = id ?? reactId;
    const hasError = Boolean(error);
    const descId = description || error ? `${areaId}-desc` : undefined;
    const ai = variant === 'ai';
    const inner = React.useRef<HTMLTextAreaElement | null>(null);
    const setRef = (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    // ai: grow with the text, up to maxRows lines, then scroll
    const grow = React.useCallback(() => {
      const el = inner.current;
      if (!el || !ai) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, maxRows * LINE_PX)}px`;
    }, [ai, maxRows]);
    React.useLayoutEffect(() => { grow(); }, [grow, rest.value]);

    const field = (
      <textarea
        ref={setRef}
        id={areaId}
        rows={ai ? (rows ?? 1) : (rows ?? 3)}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={descId}
        onInput={(e) => { grow(); onInput?.(e); }}
        className={[
          ai ? styles.ai__control : styles.textarea,
          hasError && !ai ? styles['textarea--error'] : '',
          disabled && !ai ? styles['textarea--disabled'] : '',
        ].filter(Boolean).join(' ')}
        {...rest}
      />
    );

    return (
      <div className={[styles.field, className ?? ''].filter(Boolean).join(' ')}>
        {label && <label htmlFor={areaId} className={styles.field__label}>{label}</label>}

        {ai ? (
          <div className={[styles.ai, hasError ? styles['ai--error'] : '', disabled ? styles['ai--disabled'] : ''].filter(Boolean).join(' ')}>
            <AiGlow mode={disabled ? 'off' : glow} />
            {field}
            {(leading || trailing) && (
              <div className={styles.ai__actions}>
                <span className={styles.ai__side}>{leading}</span>
                <span className={styles.ai__side}>{trailing}</span>
              </div>
            )}
          </div>
        ) : field}

        {(description || error) && (
          <span id={descId} className={hasError ? styles.field__error : styles.field__description}>
            {error || description}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
