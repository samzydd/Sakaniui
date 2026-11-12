/**
 * ResetPasswordBlock — Blocks / Authentication / Reset Password
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this file into
 * your project and edit it directly: wire `onSubmit` to your real API call
 * in place of the simulated one here, and swap in a real password-strength
 * check for the demo's "just don't match" validation.
 *
 * Matches Figma "Reset Password" (7 states, collapsed into one `status`
 * state machine, same pattern as the other Authentication blocks):
 *   'idle'     -- Default/Filled: just field state, not a manual prop
 *   'mismatch' -- Validation Error: only the Confirm field gets the error
 *                 (New password stays valid-looking, matching Figma exactly)
 *   'loading'  -- both fields disabled, Button spinner
 *   'expired'  -- an entirely different layout (shield icon-wrap + centered
 *                 copy + "Request new link" + "Back to log in"), not a
 *                 modifier on the form -- this is reachable via
 *                 `initialStatus` for a token-expired deep link, not
 *                 something the form itself transitions into
 *   'success'  -- another different layout (check icon-wrap + centered
 *                 copy + single "Continue to log in" button)
 *   'skeleton'
 *
 * The Update button stays disabled until both fields are non-empty, same
 * disabled-until-complete pattern as the other Authentication blocks.
 *
 * Neither password field reuses the shared Input component: Figma's
 * trailing eye icon toggles show/hide, a real interactive control, but
 * Input's trailingIcon slot renders inside an aria-hidden, non-focusable
 * span (fine for the decorative icons every other block uses it for, wrong
 * for a control someone needs to actually click/tab to) -- so these are
 * hand-built instead, bound to the exact same tokens as Input's own field
 * frame (border/subtle, radius-md, bg/surface, disabled bg/subtle).
 */

import React from 'react';
import { IconLock as Lock } from '../../icons/outline/lock';
import { IconEye as Eye } from '../../icons/outline/eye';
import { IconEyeOff as EyeOff } from '../../icons/outline/eye-off';
import { IconShieldCheck as ShieldCheck } from '../../icons/outline/shield-check';
import { IconCircleCheck as CircleCheck } from '../../icons/outline/circle-check';
import { Button } from '../../components/Button';
import { Link } from '../../components/Link';
import { Skeleton } from '../../components/Skeleton';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import styles from './ResetPasswordBlock.module.css';


/** The field frame is taller than the input it holds; a press on its padding or icon focuses the input, so on a phone
 *  the whole frame works as the field instead of only the text line in the middle. */
const focusField = (e: React.MouseEvent<HTMLDivElement>) => {
  if ((e.target as HTMLElement).closest('button, a, input')) return;
  e.currentTarget.querySelector('input')?.focus();
};

export type ResetPasswordStatus = 'idle' | 'mismatch' | 'loading' | 'expired' | 'success' | 'skeleton';

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ id, label, placeholder, value, onChange, disabled, error }) => {
  const [visible, setVisible] = React.useState(false);
  const hasError = Boolean(error);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      <div className={[styles.fieldFrame, hasError ? styles.fieldFrameError : '', disabled ? styles.fieldFrameDisabled : ''].filter(Boolean).join(' ')} onClick={focusField}>
        <span className={styles.fieldIcon} aria-hidden="true"><Lock size={16} strokeWidth={iconStrokeWidth(16)} /></span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={styles.fieldControl}
          aria-invalid={hasError || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className={styles.visibilityToggle}
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} strokeWidth={iconStrokeWidth(16)} /> : <Eye size={16} strokeWidth={iconStrokeWidth(16)} />}
        </button>
      </div>
      {error && <span id={`${id}-error`} className={styles.fieldError}>{error}</span>}
    </div>
  );
};

export interface ResetPasswordBlockProps {
  initialStatus?: ResetPasswordStatus;
  onSubmit?: (newPassword: string) => void;
  onRequestNewLink?: () => void;
  onLogIn?: () => void;
  className?: string;
}

export const ResetPasswordBlock: React.FC<ResetPasswordBlockProps> = ({
  initialStatus = 'idle',
  onSubmit,
  onRequestNewLink,
  onLogIn,
  className,
}) => {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState(initialStatus === 'mismatch' ? 'different-password' : '');
  const [status, setStatus] = React.useState<ResetPasswordStatus>(initialStatus);

  React.useEffect(() => {
    if (initialStatus === 'mismatch') setNewPassword('my-new-password');
  }, [initialStatus]);

  const handleSubmit = () => {
    if (newPassword !== confirmPassword) { setStatus('mismatch'); return; }
    setStatus('loading');
    onSubmit?.(newPassword);
    // Simulated request -- replace with your own API call.
    setTimeout(() => setStatus('success'), 1500);
  };

  if (status === 'skeleton') {
    return (
      <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
        <div className={styles.skeletonHeader}>
          <Skeleton variant="rect" width={220} height={26} />
          <Skeleton variant="rect" width={320} height={14} />
        </div>
        <Skeleton variant="rect" width="100%" height={66} />
        <Skeleton variant="rect" width="100%" height={66} />
        <Skeleton variant="rect" width="100%" height={48} />
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
        <span className={styles.iconWrap} aria-hidden="true">
          <ShieldCheck size={24} strokeWidth={iconStrokeWidth(24)} />
        </span>
        <div className={styles.centeredHeader}>
          <h2 className={styles.title}>Link expired</h2>
          <p className={styles.description}>This password reset link is invalid or has expired. Please request a new one.</p>
        </div>
        <Button variant="primary" className={styles.fullWidth} onClick={() => onRequestNewLink?.()}>Request new link</Button>
        <Link href="#" onClick={(e) => { e.preventDefault(); onLogIn?.(); }}>Back to log in</Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
        <span className={styles.iconWrap} aria-hidden="true">
          <CircleCheck size={24} strokeWidth={iconStrokeWidth(24)} />
        </span>
        <div className={styles.centeredHeader}>
          <h2 className={styles.title}>Password updated</h2>
          <p className={styles.description}>Your password has been changed successfully.</p>
        </div>
        <Button variant="primary" className={styles.fullWidth} onClick={() => onLogIn?.()}>Continue to log in</Button>
      </div>
    );
  }

  const isLoading = status === 'loading';
  const isMismatch = status === 'mismatch';
  const isComplete = newPassword.trim() !== '' && confirmPassword.trim() !== '';

  return (
    <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h2 className={styles.title}>Set new password</h2>
        <p className={styles.description}>Your new password must be different from previous passwords.</p>
      </div>

      <PasswordField
        id="reset-new-password"
        label="New password"
        placeholder="Enter a new password"
        value={newPassword}
        disabled={isLoading}
        onChange={(v) => { setNewPassword(v); if (isMismatch) setStatus('idle'); }}
      />
      <PasswordField
        id="reset-confirm-password"
        label="Confirm new password"
        placeholder="Re-enter your new password"
        value={confirmPassword}
        disabled={isLoading}
        error={isMismatch ? 'Passwords do not match.' : undefined}
        onChange={(v) => { setConfirmPassword(v); if (isMismatch) setStatus('idle'); }}
      />

      <Button variant="primary" className={styles.fullWidth} loading={isLoading} disabled={!isLoading && !isComplete} onClick={handleSubmit}>
        {isLoading ? 'Updating…' : 'Update password'}
      </Button>
    </div>
  );
};

export default ResetPasswordBlock;
