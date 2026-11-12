/**
 * SignUpBlock — Blocks / Authentication / Sign Up
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this file into
 * your project and edit it directly: wire `onSubmit` to your real
 * registration call in place of the simulated one here.
 *
 * Matches Figma "Sign up" (6 states, collapsed into one `status` state
 * machine, same pattern as the other Authentication blocks):
 *   'idle'             -- Default/Filled: just field state, not a manual prop
 *   'validation-error' -- passwords don't match on submit; error surfaces
 *                          only on the Confirm field, same as ResetPasswordBlock
 *   'server-error'     -- Alert banner ("Sign up failed" / email already
 *                          registered). Unlike LoginBlock's server-error,
 *                          Figma does NOT clear or red-border any field
 *                          here -- every value just stays as typed, which
 *                          makes sense for an "email taken" failure (there's
 *                          nothing wrong with what was typed, just followed
 *                          literally from Figma)
 *   'loading'           -- all four fields disabled here, and unlike
 *                          LoginBlock's own (inconsistent) Loading state,
 *                          Figma's Sign Up Loading dims all four consistently
 *   'skeleton'
 * No dedicated Success view -- same reasoning as LoginBlock: a real signup
 * either logs the user straight in or sends a verification email (see
 * EmailVerificationBlock), so there's nothing distinct to render here.
 *
 * Full name / Email reuse the shared Input directly (leading icon only,
 * no interactive trailing control). Password / Confirm password are
 * hand-built for the same reason as every other password field in this
 * set: the trailing eye toggle is a real interactive control, and Input's
 * trailingIcon slot is decorative-only (aria-hidden).
 *
 * Same third-party-trademark reasoning as LoginBlock for the social row:
 * `socialProviders` is a fully consumer-supplied slot, not shipped here.
 */

import React from 'react';
import { IconUser as User } from '../../icons/outline/user';
import { IconMail as Mail } from '../../icons/outline/mail';
import { IconLock as Lock } from '../../icons/outline/lock';
import { IconEye as Eye } from '../../icons/outline/eye';
import { IconEyeOff as EyeOff } from '../../icons/outline/eye-off';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { Link } from '../../components/Link';
import { Checkbox } from '../../components/Checkbox';
import { Divider } from '../../components/Divider';
import { Skeleton } from '../../components/Skeleton';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import styles from './SignUpBlock.module.css';


/** The field frame is taller than the input it holds; a press on its padding or icon focuses the input, so on a phone
 *  the whole frame works as the field instead of only the text line in the middle. */
const focusField = (e: React.MouseEvent<HTMLDivElement>) => {
  if ((e.target as HTMLElement).closest('button, a, input')) return;
  e.currentTarget.querySelector('input')?.focus();
};

export type SignUpStatus = 'idle' | 'validation-error' | 'server-error' | 'loading' | 'skeleton';

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

export interface SignUpSocialProvider {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export interface SignUpBlockProps {
  initialStatus?: SignUpStatus;
  socialProviders?: SignUpSocialProvider[];
  onSubmit?: (data: { fullName: string; email: string; password: string }) => void;
  onLogIn?: () => void;
  className?: string;
}

export const SignUpBlock: React.FC<SignUpBlockProps> = ({
  initialStatus = 'idle',
  socialProviders = [],
  onSubmit,
  onLogIn,
  className,
}) => {
  const seedFilled = initialStatus === 'server-error' || initialStatus === 'loading';
  const [fullName, setFullName] = React.useState(seedFilled ? 'Sam Okpere' : '');
  const [email, setEmail] = React.useState(seedFilled ? 'sam@sakani.com' : '');
  const [password, setPassword] = React.useState(seedFilled ? 'my-password' : '');
  const [confirmPassword, setConfirmPassword] = React.useState(
    initialStatus === 'validation-error' ? 'different-password' : seedFilled ? 'my-password' : '',
  );
  const [agreed, setAgreed] = React.useState(false);
  const [status, setStatus] = React.useState<SignUpStatus>(initialStatus);

  const handleSubmit = () => {
    if (password !== confirmPassword) { setStatus('validation-error'); return; }
    setStatus('loading');
    onSubmit?.({ fullName, email, password });
    // Simulated request -- replace with your own registration call.
    setTimeout(() => setStatus('server-error'), 1500);
  };

  if (status === 'skeleton') {
    return (
      <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
        <div className={styles.skeletonHeader}>
          <Skeleton variant="rect" width={180} height={26} />
          <Skeleton variant="rect" width={280} height={14} />
        </div>
        <Skeleton variant="rect" width="100%" height={66} />
        <Skeleton variant="rect" width="100%" height={66} />
        <Skeleton variant="rect" width="100%" height={66} />
        <Skeleton variant="rect" width="100%" height={66} />
        <Skeleton variant="rect" width={280} height={18} />
        <Skeleton variant="rect" width="100%" height={48} />
        <div className={styles.skeletonSocialRow}>
          <Skeleton variant="rect" width={112} height={44} />
          <Skeleton variant="rect" width={112} height={44} />
          <Skeleton variant="rect" width={112} height={44} />
        </div>
        <Skeleton variant="rect" width={220} height={14} />
      </div>
    );
  }

  const isServerError = status === 'server-error';
  const isLoading = status === 'loading';
  const isMismatch = status === 'validation-error';

  return (
    <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h2 className={styles.title}>Create an account</h2>
        <p className={styles.description}>Get started — it only takes a minute.</p>
      </div>

      {isServerError && (
        <Alert color="danger" title="Sign up failed" description="An account with this email already exists." />
      )}

      <Input
        label="Full name"
        placeholder="Enter your full name"
        leadingIcon={<User />}
        value={fullName}
        disabled={isLoading}
        onChange={(e) => setFullName(e.target.value)}
        className={styles.fullWidth}
      />
      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        leadingIcon={<Mail />}
        value={email}
        disabled={isLoading}
        onChange={(e) => setEmail(e.target.value)}
        className={styles.fullWidth}
      />
      <PasswordField
        id="signup-password"
        label="Password"
        placeholder="Create a password"
        value={password}
        disabled={isLoading}
        onChange={(v) => { setPassword(v); if (isMismatch) setStatus('idle'); }}
      />
      <PasswordField
        id="signup-confirm-password"
        label="Confirm password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        disabled={isLoading}
        error={isMismatch ? 'Passwords do not match.' : undefined}
        onChange={(v) => { setConfirmPassword(v); if (isMismatch) setStatus('idle'); }}
      />

      <Checkbox
        label="I agree to the Terms of Service and Privacy Policy"
        checked={agreed}
        disabled={isLoading}
        onChange={(e) => setAgreed(e.target.checked)}
      />

      <Button
        variant="primary"
        className={styles.fullWidth}
        loading={isLoading}
        disabled={!isLoading && (!fullName.trim() || !email.trim() || !password || !confirmPassword || !agreed)}
        onClick={handleSubmit}
      >
        {isLoading ? 'Creating account…' : 'Create account'}
      </Button>

      {socialProviders.length > 0 && (
        <>
          <div className={styles.dividerRow}>
            <Divider className={styles.dividerLine} />
            <span className={styles.dividerLabel}>OR CONTINUE WITH</span>
            <Divider className={styles.dividerLine} />
          </div>
          <div className={styles.socialRow}>
            {socialProviders.map((provider) => (
              <button
                key={provider.label}
                type="button"
                className={styles.socialButton}
                aria-label={provider.label}
                disabled={isLoading}
                onClick={provider.onClick}
              >
                {provider.icon}
              </button>
            ))}
          </div>
        </>
      )}

      <div className={styles.footer}>
        <p className={styles.footerText}>Already have an account?</p>
        <Link href="#" onClick={(e) => { e.preventDefault(); onLogIn?.(); }}>Log in</Link>
      </div>
    </div>
  );
};

export default SignUpBlock;
