/**
 * Input
 *
 * Text input with optional label (Title), help text (Description), and
 * leading/trailing icons. Built to match the Figma "Input" parent component set:
 *   Size (sm|md|lg) x State (Default|Focus|Error|Disabled|Filled)
 *
 * Exact Figma spec (read from the parent component):
 *   - Field: vertical stack, 6px gap (space-6)
 *   - Label:  label/md  -> 14px / 500 / fg/default
 *   - Field frame: bg/surface, border/subtle 1px, radius-md (8px)
 *       padding: sm 6/14 · md 10/14 · lg 12/14  (horizontal always 14px)
 *   - Placeholder / value: body/sm -> 14px / 500, fg/subtle / fg/default
 *   - Description: body/xs -> 13px / fg/muted
 *   - Icons: 16px, fg/muted stroke
 *   - Focus: border/focus 1.5px · Error: danger/solid 1.5px · Disabled: bg/subtle
 *
 * variant="ai": the prompt box of an AI product. A pill with a larger 16px field, room for action buttons on either side
 * (`leading`, `trailing`: an attach button, a mic, a send button) and a light that sweeps around the border (`glow`).
 */

import React from 'react';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { AiGlow, type AiGlowMode } from '../../lib/AiGlow';
import styles from './Input.module.css';

const ICON_PX = 16;
/** .input__icon svg forces every leading/trailing icon to 16px via CSS
 * regardless of what the caller passed it -- cloning in a matching
 * compensated strokeWidth so it renders a true 1.5px line, same as
 * Avatar's custom icon slot and ActivityFeed's rail icon. */
const renderInputIcon = (icon: React.ReactNode) =>
  React.isValidElement<{ size?: number; strokeWidth?: number }>(icon)
    ? React.cloneElement(icon, { size: ICON_PX, strokeWidth: iconStrokeWidth(ICON_PX) })
    : icon;

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'ai';
export type InputGlow = AiGlowMode;

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field label (Figma: Title). */
  label?: string;
  /** Help text under the field (Figma: Description). */
  description?: string;
  /** Error message — sets error visual state and displays the text. */
  error?: string;
  /** Figma Size axis. Defaults to "md". */
  size?: InputSize;
  /** Strip the field's own border, background and focus highlight so a parent
   *  container can own the chrome (used by TopBar's search). */
  unstyled?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** "ai" is the prompt box of an AI product: a pill with a 16px field, action slots and a light around the border. Defaults to "default". */
  variant?: InputVariant;
  /** variant="ai": the light that sweeps clockwise around the border. "once" (default) sweeps one lap shortly after it appears and then stays still, focused or not; "pulse" sweeps every 2.5s while idle and once each time
   *  the field takes focus; "focus" sweeps only on focus; "off" draws none. Reduced motion draws none. */
  glow?: AiGlowMode;
  /** variant="ai": actions before the field, such as an attach button. Interactive content is fine here (unlike `leadingIcon`). */
  leading?: React.ReactNode;
  /** variant="ai": actions after the field, such as a mic and a send button. */
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, size = 'md',
    unstyled, leadingIcon, trailingIcon, variant = 'default', glow = 'once', leading, trailing,
    disabled, id, className, ...rest }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const hasError = Boolean(error);
    const ai = variant === 'ai';

    // The frame is taller than the text field inside it (10px of padding above and below at md), and a tap on that padding,
    // or on a decorative icon, would otherwise do nothing: on a phone that reads as a dead field. Any press on the frame
    // that isn't on a control of its own focuses the field.
    const control = React.useRef<HTMLInputElement | null>(null);
    const setControl = React.useCallback((node: HTMLInputElement | null) => {
      control.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }, [ref]);
    const focusFromFrame = (e: React.MouseEvent<HTMLDivElement>) => {
      const t = e.target as HTMLElement;
      if (disabled || t === control.current || t.closest('button, a, input, select, textarea, [role="button"]')) return;
      control.current?.focus();
    };

    return (
      <div className={[styles.field, className ?? ''].filter(Boolean).join(' ')}>
        {/* Label — Figma Title, label/md */}
        {label && (
          <label htmlFor={inputId} className={styles.field__label}>{label}</label>
        )}

        {/* Field frame — bg/surface, border/subtle, radius-md */}
        <div
          className={[
            styles.input,
            styles[`input--${size}`],
            ai ? styles['input--ai'] : '',
            ai && leading ? styles['input--aiLeading'] : '',
            hasError ? styles['input--error'] : '',
            disabled ? styles['input--disabled'] : '',
          ].filter(Boolean).join(' ')}
          onClick={focusFromFrame}
        >
          {ai && <AiGlow mode={disabled ? 'off' : glow} />}
          {ai && leading && <span className={styles.input__actions}>{leading}</span>}
          {leadingIcon && <span className={styles.input__icon} aria-hidden="true">{renderInputIcon(leadingIcon)}</span>}
          <input
            ref={setControl}
            id={inputId}
            className={styles.input__control}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={description || error ? `${inputId}-desc` : undefined}
            {...rest}
          />
          {trailingIcon && <span className={styles.input__icon} aria-hidden="true">{renderInputIcon(trailingIcon)}</span>}
          {ai && trailing && <span className={styles.input__actions}>{trailing}</span>}
        </div>

        {/* Description (Figma) or error message */}
        {(description || error) && (
          <span id={`${inputId}-desc`} className={hasError ? styles.field__error : styles.field__description}>
            {error || description}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
