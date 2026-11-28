/**
 * ShareBlock
 *
 * A "Share" panel for a document, note or board: who can open it, who you have invited, and the link.
 *
 *   - the access row switches between "Anyone with the link" and "Invited people only"; only the second shows the
 *     invite field and the people who have access
 *   - the invite field turns e-mail addresses into people as you type them: a comma, Enter or paste commits one
 *     (a known address becomes a name and a photo, an unknown one stays an address with an initial), a bad address is
 *     refused in words, Backspace takes the last one back
 *   - Invite sends them (`onInvite`, which may be async), confirms with a banner, then lists them under "People with
 *     access" with a Remove button; the avatars in the header follow
 *   - Copy link copies the link and says so for a moment
 *
 * Every part opens and closes by height, so the card grows and shrinks instead of jumping. It is a fixed-width card
 * (420px, `width: 100%` up to that): put it where a dialog or popover would go.
 *
 * Access and the list of people can be left to the block (`defaultAccess`, `defaultPeople`) or controlled
 * (`access` + `onAccessChange`, `people` + `onPeopleChange`).
 */

import React from 'react';
import { Avatar } from '../../components/Avatar';
import { AvatarGroup } from '../../components/AvatarGroup';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Switch } from '../../components/Switch';
import { IconCheck } from '../../icons/outline/check';
import { IconCopy } from '../../icons/outline/copy';
import { IconFileText } from '../../icons/outline/file-text';
import { IconLink } from '../../icons/outline/link';
import { IconLock } from '../../icons/outline/lock';
import { IconSend } from '../../icons/outline/send';
import { IconUserPlus } from '../../icons/outline/user-plus';
import { IconWorld } from '../../icons/outline/world';
import { IconX } from '../../icons/outline/x';
import type { ShareAccess, ShareOwner, SharePerson } from './types';
import styles from './ShareBlock.module.css';

export type { ShareAccess, ShareOwner, SharePerson } from './types';

export interface ShareBlockProps {
  /** The panel's heading. Default "Share". */
  title?: string;
  /** What is being shared, under the heading: "Enterprise roadmap · Note 453". */
  subtitle?: string;
  /** The tile beside the heading. Default: a document icon. */
  icon?: React.ReactNode;
  /** The document's owner: their photo leads the avatars in the header. */
  owner?: ShareOwner;
  /** The link to share. The scheme is hidden in the row (`https://acme.com/x` reads `acme.com/x`); Copy link copies it as given. */
  link: string;
  /** Who can open it, controlled. */
  access?: ShareAccess;
  /** Who can open it, when the block owns it. Default "anyone". */
  defaultAccess?: ShareAccess;
  onAccessChange?: (access: ShareAccess) => void;
  /** The people with access, controlled. */
  people?: SharePerson[];
  /** The people with access to start with, when the block owns the list. */
  defaultPeople?: SharePerson[];
  onPeopleChange?: (people: SharePerson[]) => void;
  /** People you already know: an address that matches one becomes its name and photo. */
  directory?: SharePerson[];
  /**
   * Called with the people to invite. Return a promise to show "Sending…" until it settles; if it rejects the invitations
   * stay in the field and the error is shown. Without it (or when it returns at once) the block sends for ~1s as a demo.
   */
  onInvite?: (people: SharePerson[]) => void | Promise<void>;
  onRemove?: (person: SharePerson) => void;
  onCopyLink?: (link: string) => void;
  className?: string;
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
const SEND_MS = 1100;
const SENT_MS = 2600;
const COPIED_MS = 1800;
const LEAVE_MS = 320;

type Phase = 'idle' | 'sending' | 'sent';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const firstName = (p: SharePerson) => (p.name ?? p.email.split('@')[0]).split(/[\s._-]+/)[0];
const initialsOf = (p: SharePerson) => (p.name ?? p.email).trim().charAt(0).toUpperCase();
const display = (p: SharePerson) => p.name ?? p.email;
const hideScheme = (url: string) => url.replace(/^https?:\/\//, '');

/** A value the parent may own (`value`) or the block may (`initial`). */
function useControllable<T>(value: T | undefined, initial: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState(initial);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : inner;
  const set = React.useCallback((next: T) => { if (!controlled) setInner(next); onChange?.(next); }, [controlled, onChange]);
  return [current, set] as const;
}

/** Opens and closes by height (grid rows 0fr to 1fr), so what is below it glides instead of jumping. */
const Collapse: React.FC<{ open: boolean; className?: string; children: React.ReactNode }> = ({ open, className, children }) => (
  <div
    className={[styles.collapse, className ?? ''].filter(Boolean).join(' ')}
    data-open={open ? '' : undefined}
    aria-hidden={open ? undefined : true}
    {...(open ? {} : ({ inert: '' } as object))}
  >
    <div className={styles.collapseInner}>{children}</div>
  </div>
);

const PersonAvatar: React.FC<{ person: SharePerson; size?: 'sm' | 'md' }> = ({ person, size = 'sm' }) =>
  person.avatarSrc
    ? <Avatar size={size} src={person.avatarSrc} alt="" />
    : <Avatar size={size} initials={initialsOf(person)} />;

export const ShareBlock: React.FC<ShareBlockProps> = ({
  title = 'Share',
  subtitle,
  icon,
  owner,
  link,
  access: accessProp,
  defaultAccess = 'anyone',
  onAccessChange,
  people: peopleProp,
  defaultPeople = [],
  onPeopleChange,
  directory = [],
  onInvite,
  onRemove,
  onCopyLink,
  className,
}) => {
  const [access, setAccess] = useControllable<ShareAccess>(accessProp, defaultAccess, onAccessChange);
  const [people, setPeople] = useControllable<SharePerson[]>(peopleProp, defaultPeople, onPeopleChange);

  const [chips, setChips] = React.useState<SharePerson[]>([]);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [sent, setSent] = React.useState<SharePerson[]>([]);
  const [leaving, setLeaving] = React.useState<string[]>([]);
  const [copied, setCopied] = React.useState(false);
  const [fresh, setFresh] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState('');

  const inputRef = React.useRef<HTMLInputElement>(null);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef<number[]>([]);
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; timers.current.forEach(window.clearTimeout); }, []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { if (alive.current) fn(); }, ms);
    timers.current.push(id);
  };

  const invited = access === 'invited';
  const sending = phase === 'sending';

  const resolve = (email: string): SharePerson =>
    directory.find((p) => same(p.email, email)) ?? { email: email.trim() };

  /** Turns what is typed into people. Stops at the first bad address and leaves it in the field with the reason. */
  const commit = (raw: string): boolean => {
    const parts = raw.split(/[,;\s]+/).filter(Boolean);
    if (!parts.length) return true;
    const next = [...chips];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!EMAIL.test(part)) {
        setChips(next);
        setDraft(parts.slice(i).join(' '));
        setError('Enter a valid email address, like name@company.com');
        return false;
      }
      if (next.some((c) => same(c.email, part)) || people.some((p) => same(p.email, part))) {
        setChips(next);
        setDraft(parts.slice(i + 1).join(' '));
        setError(`${part} already has access`);
        return false;
      }
      next.push(resolve(part));
    }
    setChips(next);
    setDraft('');
    setError(null);
    return true;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === ';' || (e.key === 'Enter' && draft.trim())) {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Enter' && chips.length) {
      e.preventDefault();
      invite();
    } else if (e.key === 'Backspace' && !draft && chips.length) {
      setChips(chips.slice(0, -1));
      setError(null);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (/[,;\s]/.test(text.trim())) { e.preventDefault(); commit(draft + ' ' + text); }
  };

  const invite = async () => {
    if (sending) return;
    // anything still being typed counts, if it is a real address
    let batch = chips;
    if (draft.trim()) {
      if (!EMAIL.test(draft.trim())) { setError('Enter a valid email address, like name@company.com'); inputRef.current?.focus(); return; }
      if (chips.some((c) => same(c.email, draft)) || people.some((p) => same(p.email, draft))) { setError(`${draft.trim()} already has access`); return; }
      batch = [...chips, resolve(draft)];
    }
    if (!batch.length) { setError('Enter an email address to invite'); inputRef.current?.focus(); return; }

    setError(null);
    setChips([]);
    setDraft('');
    setPhase('sending');
    const started = Date.now();
    try {
      await onInvite?.(batch);
    } catch {
      if (!alive.current) return;
      setChips(batch);
      setPhase('idle');
      setError('Couldn’t send the invitations. Try again.');
      return;
    }
    // even an instant onInvite shows "Sending" long enough to read
    const wait = Math.max(0, SEND_MS - (Date.now() - started));
    later(() => {
      // newest first, so the people you just added are at the top of the list
      setPeople([...[...batch].reverse(), ...people]);
      setSent(batch);
      setFresh(batch.map((b) => b.email));
      setPhase('sent');
      setStatus(`${batch.length} ${batch.length === 1 ? 'invitation' : 'invitations'} sent`);
      later(() => setPhase('idle'), SENT_MS);
    }, wait);
  };

  const remove = (person: SharePerson) => {
    setLeaving((l) => [...l, person.email]);
    setPeople(people.filter((p) => p.email !== person.email));
    onRemove?.(person);
    setStatus(`${display(person)} removed`);
    later(() => setLeaving((l) => l.filter((e) => e !== person.email)), LEAVE_MS + 40);
  };

  const copy = async () => {
    try { await navigator.clipboard?.writeText(link); } catch { /* the label still confirms; some browsers block the clipboard in frames */ }
    onCopyLink?.(link);
    setCopied(true);
    setStatus('Link copied');
    later(() => setCopied(false), COPIED_MS);
  };

  const removeChip = (email: string) => { setChips(chips.filter((c) => c.email !== email)); setError(null); inputRef.current?.focus(); };

  // people on their way out stay in the list until their row has closed
  const shown = React.useMemo(() => {
    const gone = leaving.filter((e) => !people.some((p) => p.email === e));
    return gone.length ? [...people, ...gone.map((e) => ({ email: e }))] : people;
  }, [people, leaving]);
  const lastLeft = React.useRef<Record<string, SharePerson>>({});
  people.forEach((p) => { lastLeft.current[p.email] = p; });
  const rows = shown.map((p) => lastLeft.current[p.email] ?? p);

  const headerAvatars = [
    ...(owner ? [{ src: owner.avatarSrc, initials: owner.name?.charAt(0).toUpperCase(), alt: owner.name }] : []),
    ...people.map((p) => ({ src: p.avatarSrc, initials: initialsOf(p), alt: display(p) })),
  ];

  const sentNames = (() => {
    const names = sent.map(firstName);
    return names.length > 3 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} others` : names.join(', ');
  })();

  const rootClass = [styles.card, className ?? ''].filter(Boolean).join(' ');

  return (
    <section className={rootClass} aria-label={title}>
      <header className={styles.header}>
        <span className={styles.tile} aria-hidden>{icon ?? <IconFileText size={16} />}</span>
        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {headerAvatars.length > 0 && <AvatarGroup size="sm" max={4} avatars={headerAvatars} />}
      </header>

      <label className={styles.access}>
        <span className={styles.tile} aria-hidden>{invited ? <IconLock size={16} /> : <IconWorld size={16} />}</span>
        <span className={styles.accessText}>
          <span className={styles.rowTitle}>{invited ? 'Invited people only' : 'Anyone with the link'}</span>
          <span className={styles.rowHint}>{invited ? 'Only people you invite can access' : 'Everyone with the link can view'}</span>
        </span>
        <Switch
          variant="stretch"
          checked={!invited}
          onChange={(e) => setAccess(e.target.checked ? 'anyone' : 'invited')}
          aria-label="Anyone with the link can view"
        />
      </label>

      <Collapse open={invited}>
        <div className={styles.section} data-invite="" data-error={error ? '' : undefined}>
          <span className={styles.label} id="share-invite-label">Invite people</span>

          <div className={styles.swap}>
            <Collapse open={phase !== 'sent'}>
              <div
                ref={fieldRef}
                className={styles.field}
                data-focus={focused ? '' : undefined}
                data-error={error ? '' : undefined}
                data-busy={sending ? '' : undefined}
                onMouseDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.fill) { e.preventDefault(); inputRef.current?.focus(); } }}
              >
                <span className={styles.fieldIcon} aria-hidden data-fill><IconUserPlus size={16} /></span>
                <div className={styles.tokens} data-fill>
                  {chips.map((c) => (
                    <span key={c.email} className={styles.chip}>
                      <PersonAvatar person={c} />
                      <span className={styles.chipName}>{display(c)}</span>
                      <button type="button" className={styles.chipRemove} aria-label={`Remove ${display(c)}`} onClick={() => removeChip(c.email)} tabIndex={-1}>
                        <IconX size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    className={styles.input}
                    type="text"
                    inputMode="email"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={draft}
                    placeholder={chips.length ? 'Add another…' : 'Enter email to share'}
                    aria-labelledby="share-invite-label"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'share-invite-error' : undefined}
                    disabled={sending}
                    onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                      setFocused(false);
                      // a finished address is kept as a person; a half-typed one is left alone
                      if (draft.trim() && EMAIL.test(draft.trim())) commit(draft);
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  className={styles.invite}
                  leftIcon={<IconSend size={16} />}
                  loading={sending}
                  onClick={invite}
                >
                  {sending ? 'Sending' : 'Invite'}
                </Button>
              </div>
              <p className={styles.error} id="share-invite-error" role="alert" data-open={error ? '' : undefined}>
                <span>{error}</span>
              </p>
            </Collapse>

            <Collapse open={phase === 'sent'}>
              <div className={styles.banner}>
                <span className={styles.bannerTick} aria-hidden><IconCheck size={14} /></span>
                <span className={styles.bannerText}>
                  <span className={styles.rowTitle}>{sent.length === 1 ? 'Invitation sent' : `${sent.length} invitations sent`}</span>
                  <span className={styles.rowHint}>{sentNames} will get an email</span>
                </span>
                <AvatarGroup size="sm" max={3} avatars={sent.map((p) => ({ src: p.avatarSrc, initials: initialsOf(p), alt: display(p) }))} />
              </div>
            </Collapse>
          </div>
        </div>
      </Collapse>

      <div className={styles.linkRow}>
        <span className={styles.linkIcon} aria-hidden><IconLink size={16} /></span>
        <span className={styles.linkText} title={link}>{hideScheme(link)}</span>
        <Button
          size="sm"
          variant="outline"
          className={styles.copy}
          data-copied={copied ? '' : undefined}
          leftIcon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          onClick={copy}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>

      <Collapse open={invited && people.length > 0}>
        <div className={styles.section}>
          <span className={styles.label}>People with access</span>
          <ul className={styles.people}>
            {rows.map((p) => {
              const out = leaving.includes(p.email) && !people.some((q) => q.email === p.email);
              return (
                <li key={p.email} className={styles.personItem}>
                  <Collapse open={!out}>
                    <div className={styles.person} data-new={fresh.includes(p.email) ? '' : undefined}>
                      <PersonAvatar person={p} size="md" />
                      <span className={styles.personText}>
                        <span className={styles.rowTitle}>{display(p)}</span>
                        {p.name && <span className={styles.rowHint}>{p.email}</span>}
                      </span>
                      <Badge variant="neutral" emphasis="subtle" className={styles.badge}>Invited</Badge>
                      <button type="button" className={styles.remove} onClick={() => remove(p)} aria-label={`Remove ${display(p)}`}>
                        Remove
                      </button>
                    </div>
                  </Collapse>
                </li>
              );
            })}
          </ul>
        </div>
      </Collapse>

      <span className={styles.srOnly} role="status" aria-live="polite">{status}</span>
    </section>
  );
};

export default ShareBlock;
