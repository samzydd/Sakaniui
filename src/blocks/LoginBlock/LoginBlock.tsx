/**
 * LoginBlock — Blocks / Authentication / Login
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this file into
 * your project and edit it directly: wire `onSubmit` to your real auth
 * call in place of the simulated one here.
 *
 * Matches Figma "Login" (6 states, collapsed into one `status` state
 * machine, same pattern as the other Authentication blocks):
 *   'idle'             -- Default/Filled: just field state, not a manual prop
 *   'validation-error' -- email fails a basic format check on submit
 *   'server-error'     -- Alert banner ("Login failed"); Figma also clears
 *                          and danger-borders the password field for retry
 *                          while leaving the email value in place, followed
 *                          literally here
 *   'loading'          -- Figma's own Loading state only dims the password
 *                          field, not email -- read as an authoring slip
 *                          (there's no reason submitting should leave email
 *                          editable but not password), so both fields are
 *                          disabled here instead
 *   'skeleton'
 * No dedicated Success view -- a real login just navigates away, so there's
 * nothing to render for it here.
 *
 * The password field is hand-built, not a reuse of Input, for the same
 * reason as ResetPasswordBlock's fields: the trailing eye toggle is a real
 * interactive control, and Input's trailingIcon slot is decorative-only
 * (renders inside an aria-hidden span). Email reuses Input directly since
 * it has no such control.
 *
 * The three social sign-in icons in Figma are real Google/Apple/GitHub
 * marks. Unlike StockMarket's logo slot, this component's *story* does
 * render the real marks (path data matched to Figma) -- "Continue with
 * Google/Apple/GitHub" is exactly the sanctioned use each of those brand
 * guidelines calls for, not a general-purpose decorative placement. The
 * component itself still doesn't hardcode them: `socialProviders` stays a
 * fully consumer-supplied slot, and if left empty the divider + social
 * row doesn't render at all rather than showing an empty row.
 *
 * The divider + "OR CONTINUE WITH" row is NOT a reuse of RichSeparator --
 * RichSeparator's overline sits centered as a single label with no
 * required-flanking-line-length behavior; here both Dividers must flex to
 * fill remaining space around the centered label, a distinct enough layout
 * to build directly rather than fighting RichSeparator's own centering
 * assumptions.
 */

import React from 'react';
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
import styles from './LoginBlock.module.css';


/** The field frame is taller than the input it holds; a press on its padding or icon focuses the input, so on a phone
 *  the whole frame works as the field instead of only the text line in the middle. */
const focusField = (e: React.MouseEvent<HTMLDivElement>) => {
  if ((e.target as HTMLElement).closest('button, a, input')) return;
  e.currentTarget.querySelector('input')?.focus();
};

export type LoginStatus = 'idle' | 'validation-error' | 'server-error' | 'loading' | 'skeleton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginSocialProvider {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export interface LoginBlockProps {
  initialStatus?: LoginStatus;
  initialEmail?: string;
  socialProviders?: LoginSocialProvider[];
  onSubmit?: (email: string, password: string, rememberMe: boolean) => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  className?: string;
}

export const LoginBlock: React.FC<LoginBlockProps> = ({
  initialStatus = 'idle',
  initialEmail = '',
  socialProviders = [],
  onSubmit,
  onForgotPassword,
  onSignUp,
  className,
}) => {
  const [email, setEmail] = React.useState(initialEmail || (initialStatus === 'server-error' || initialStatus === 'loading' ? 'sam@sakani.com' : ''));
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false);
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [status, setStatus] = React.useState<LoginStatus>(initialStatus);

  const handleSubmit = () => {
    if (!EMAIL_RE.test(email)) { setStatus('validation-error'); return; }
    setStatus('loading');
    onSubmit?.(email, password, rememberMe);
    // Simulated request -- replace with your own auth call. On a real
    // server error, clear `password` and setStatus('server-error') the
    // same way this demo does after the timeout.
    setTimeout(() => { setPassword(''); setStatus('server-error'); }, 1500);
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
        <div className={styles.skeletonRow}>
          <Skeleton variant="rect" width={120} height={14} />
        </div>
        <Skeleton variant="rect" width={180} height={18} />
        <Skeleton variant="rect" width="100%" height={48} />
        <div className={styles.skeletonSocialRow}>
          <Skeleton variant="rect" width={112} height={44} />
          <Skeleton variant="rect" width={112} height={44} />
          <Skeleton variant="rect" width={112} height={44} />
        </div>
        <Skeleton variant="rect" width={200} height={14} />
      </div>
    );
  }

  const isServerError = status === 'server-error';
  const isLoading = status === 'loading';
  const emailError = status === 'validation-error' ? 'Please enter a valid email address.' : undefined;

  return (
    <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.description}>Enter your credentials to access your account</p>
      </div>

      {isServerError && (
        <Alert color="danger" title="Login failed" description="The email or password you entered is incorrect." />
      )}

      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        leadingIcon={<Mail />}
        value={email}
        disabled={isLoading}
        error={emailError}
        onChange={(e) => { setEmail(e.target.value); if (status !== 'idle') setStatus('idle'); }}
        className={styles.fullWidth}
      />

      <div className={styles.field}>
        <label htmlFor="login-password" className={styles.fieldLabel}>Password</label>
        <div className={[styles.fieldFrame, isServerError ? styles.fieldFrameError : '', isLoading ? styles.fieldFrameDisabled : ''].filter(Boolean).join(' ')} onClick={focusField}>
          <span className={styles.fieldIcon} aria-hidden="true"><Lock size={16} strokeWidth={iconStrokeWidth(16)} /></span>
          <input
            id="login-password"
            type={passwordVisible ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            disabled={isLoading}
            onChange={(e) => { setPassword(e.target.value); if (isServerError) setStatus('idle'); }}
            className={styles.fieldControl}
          />
          <button
            type="button"
            className={styles.visibilityToggle}
            onClick={() => setPasswordVisible((v) => !v)}
            disabled={isLoading}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          >
            {passwordVisible ? <EyeOff size={16} strokeWidth={iconStrokeWidth(16)} /> : <Eye size={16} strokeWidth={iconStrokeWidth(16)} />}
          </button>
        </div>
      </div>

      <div className={styles.forgotRow}>
        <Link href="#" onClick={(e) => { e.preventDefault(); onForgotPassword?.(); }}>Forgot password?</Link>
      </div>

      <Checkbox
        label="Remember me for 30 days"
        checked={rememberMe}
        disabled={isLoading}
        onChange={(e) => setRememberMe(e.target.checked)}
      />

      <Button variant="primary" className={styles.fullWidth} loading={isLoading} onClick={handleSubmit}>
        {isLoading ? 'Logging in…' : 'Log in'}
      </Button>

      {socialProviders.length > 0 && (
        <>
          <div className={styles.dividerRow}>
            <Divider className={styles.dividerLine} />
            <span className={styles.dividerLabel}>OR CONTINUE WITH</span>
            <Divider className={styles.dividerLine} />
          </div>
          <div className={styles.socialRow}>
            {/* Plain buttons, not the shared IconButton -- IconButton's
               `icon` prop takes an actual Lucide icon component (so it can
               inject its own compensated size/strokeWidth), not a
               pre-rendered node, which is what a consumer-supplied social
               mark is here. Matched to IconButton's own outline-variant
               tokens directly instead. */}
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
        <p className={styles.footerText}>Don&rsquo;t have an account?</p>
        <Link href="#" onClick={(e) => { e.preventDefault(); onSignUp?.(); }}>Sign up</Link>
      </div>
    </div>
  );
};

export default LoginBlock;
