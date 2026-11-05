/**
 * CommandMenu / CommandMenuTrigger / CommandMenuAnswer
 *
 * A ⌘K search and command palette: a field, scope tabs, grouped results, a footer of key
 * hints, and the states a real search needs (loading, no results, error). Matches the Figma
 * "Command Menu" page:
 *   Command Menu          State Default | Results | Filtered | Preview | AI | No results | Loading | Error | Simple
 *   Command Trigger       the ⌘K pill that opens it
 *   Command AI Answer     an answer card with its sources, for the Ask AI state
 *
 * You own the data and the actions: pass `groups` of `items`, handle `onSelect`. By default the
 * menu filters those items as you type (label, description, `keywords`, the scope and your
 * filter tokens); set `filter={false}` to show exactly what you pass, for results that come
 * from a server. It opens with ⌘K (Ctrl K), closes with esc (which clears the query first),
 * and moves with the arrow keys over one gliding highlight, like the rest of SakaniUI.
 *
 * Keyboard:  ↑ ↓ Home End  move      ↵  select      ⌘↵  ask AI (with `onAskAI`)
 *            Tab / Shift Tab  switch scope           ⌫ in an empty field  remove the last token
 *            esc  clear the query, then close        key:value + space  a filter token (`filterKeys`)
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { usePortalThemeClass, usePortalSurface } from '../../lib/usePortalThemeClass';
import { useHoverHighlight } from '../../lib/useHoverHighlight';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import type { IconComponent } from '../../icons/types';
import { IconSearch as Search } from '../../icons/outline/search';
import { IconCircleX as CircleX } from '../../icons/outline/circle-x';
import { IconX as X } from '../../icons/outline/x';
import { IconSparkles as Sparkles } from '../../icons/outline/sparkles';
import { IconAlertTriangle as AlertTriangle } from '../../icons/outline/alert-triangle';
import { IconFileText as FileText } from '../../icons/outline/file-text';
import { IconBolt as Bolt } from '../../icons/outline/bolt';
import { IconCopy as Copy } from '../../icons/outline/copy';
import { IconChevronDown as ChevronDown } from '../../icons/outline/chevron-down';
import { Avatar } from '../Avatar';
import { Kbd } from '../Kbd';
import { Skeleton } from '../Skeleton';
import { Spinner } from '../Spinner';
import { Button } from '../Button';
import styles from './CommandMenu.module.css';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** Keep in step with the animation duration in CommandMenu.module.css. */
const EXIT_MS = 160;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CommandMenuItemType = 'page' | 'action' | 'file' | 'person' | 'ai';

export interface CommandMenuItem {
  /** Unique within the menu. */
  id: string;
  label: string;
  /** A second line under the label (a path, a role, a hint). */
  description?: string;
  /** What kind of result it is. Sets the default icon and the scope it belongs to ("pages", "people", "files", "actions"). */
  type?: CommandMenuItemType;
  /** Overrides the scope this item belongs to (the `value` of a scope). */
  scope?: string;
  /** The icon in the leading tile. Defaults by `type`. */
  icon?: IconComponent;
  /** For a person: shows an Avatar (and a status dot) instead of an icon. */
  avatar?: { src?: string; initials?: string; alt?: string; status?: 'online' | 'away' };
  /** Small text on the right, e.g. "Page" or "Edited 2h ago". */
  meta?: string;
  /** Shortcut keys on the right, e.g. ['⌘', 'N']. */
  shortcut?: string[];
  /** Extra words the built-in filter matches. */
  keywords?: string[];
  /** Matched by filter tokens: a token whose `value` (or label) is in `tags` keeps the item. */
  tags?: string[];
  /** Called when the item is chosen, in addition to the menu's `onSelect`. */
  onSelect?: () => void;
  disabled?: boolean;
}

export interface CommandMenuGroup {
  id: string;
  /** The small heading above the items. */
  label?: string;
  /** A link on the right of the heading, e.g. "See all". */
  action?: { label: string; onClick: () => void };
  items: CommandMenuItem[];
}

export interface CommandMenuScope {
  /** "all" is the unfiltered scope. */
  value: string;
  label: string;
  /** The count shown on the tab. Computed from the items when you leave it out (and `filter` is on); `null` shows no count. */
  count?: number | null;
}

export interface CommandMenuFilter {
  id: string;
  /** Shown in the token, e.g. "People" or "team: Design". */
  label: string;
  /** What `tags` are matched against. Defaults to the label. */
  value?: string;
  icon?: IconComponent;
}

export interface CommandMenuSuggestion {
  label: string;
  icon?: IconComponent;
  /** Where the icon sits: before the label (default) or after it (e.g. the × on "Remove the Files filter"). */
  iconPosition?: 'start' | 'end';
  /** A word inside `label` to set in the strong weight ("invoice" in "Did you mean invoice?"). */
  emphasis?: string;
  onSelect: () => void;
}

export interface CommandMenuProps {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The key that opens it with ⌘ / Ctrl. `false` turns the shortcut off. Defaults to "k". */
  hotkey?: string | false;
  /** "default" has scopes and a workspace footer; "simple" is just the field, the rows and the key hints. */
  variant?: 'default' | 'simple';

  /** The field's text (controlled). */
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  placeholder?: string;

  /** Results, in groups. */
  groups: CommandMenuGroup[];
  /** Filter the groups by the query, scope and tokens here. Pass a function to match your own way, or `false` to show `groups` as given. Defaults to true. */
  filter?: boolean | ((item: CommandMenuItem, query: string) => boolean);
  /** Wrap the matched letters of each label in the strong weight. Defaults to true. */
  highlightMatches?: boolean;
  /** "loading" shows skeleton rows, "error" the error message. */
  state?: 'ready' | 'loading' | 'error';
  /** Called when an item is chosen (click or ↵). */
  onSelect?: (item: CommandMenuItem) => void;
  /** Close the menu when an item is chosen. Defaults to true. */
  closeOnSelect?: boolean;

  /** Scope tabs under the field (not shown in the simple variant). */
  scopes?: CommandMenuScope[];
  scope?: string;
  defaultScope?: string;
  onScopeChange?: (scope: string) => void;

  /** Filter tokens shown in the field. */
  filters?: CommandMenuFilter[];
  onFiltersChange?: (filters: CommandMenuFilter[]) => void;
  /** Typing `key:value` and a space turns it into a token for these keys, e.g. ["team", "status"]. */
  filterKeys?: string[];

  /** Adds ⌘↵ and the "Ask AI" hint; called with the current query. */
  onAskAI?: (query: string) => void;

  /** Shown above the results (an answer card, a Chain of Thought). */
  answer?: React.ReactNode;
  /** Shows a preview pane beside the list for the active item. Return null for no pane. */
  renderPreview?: (item: CommandMenuItem) => React.ReactNode;

  /** The "No results" message. */
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  /** Quick fixes under the empty message, e.g. "Did you mean invoice?". */
  suggestions?: CommandMenuSuggestion[];
  /** Shown under the empty or error message, and navigable like any group (e.g. "Try instead"). */
  fallbackGroups?: CommandMenuGroup[];
  errorTitle?: React.ReactNode;
  errorDescription?: React.ReactNode;
  onRetry?: () => void;
  /** A second, quieter action beside "Try again" in the error state ("Report"). */
  onReport?: () => void;
  retryLabel?: React.ReactNode;
  reportLabel?: React.ReactNode;

  /** The workspace switcher in the footer (default variant). */
  workspace?: React.ReactNode;
  /** Hide the footer of key hints. */
  hideFooter?: boolean;

  /** Accessible name of the dialog. Defaults to "Command menu". */
  'aria-label'?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TYPE_SCOPE: Record<CommandMenuItemType, string | null> = { page: 'pages', person: 'people', file: 'files', action: 'actions', ai: null };
const TYPE_ICON: Record<CommandMenuItemType, IconComponent> = { page: FileText, action: Bolt, file: FileText, person: FileText, ai: Sparkles };

const scopeOf = (item: CommandMenuItem) => item.scope ?? (item.type ? TYPE_SCOPE[item.type] : null);

/** Wraps the part of `text` that matches `query` in <mark>, and leaves the rest as it is. */
/** The No results feed: four placeholder rows (drawn twice, once under the lens, once magnified inside it). */
function GhostTrack() {
  return (
    <span className={styles.ghost__track}>
      <span className={styles.ghost__row} /><span className={styles.ghost__row} /><span className={styles.ghost__row} /><span className={styles.ghost__row} />
    </span>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <span className={styles.dim}>
      {text.slice(0, at)}
      <mark className={styles.match}>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* CommandMenuTrigger                                                  */
/* ------------------------------------------------------------------ */

export interface CommandMenuTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The text in the pill. Defaults to "Search or jump to…". */
  placeholder?: string;
  /** The key caps on the right. Defaults to ["⌘", "K"]. */
  shortcut?: string[];
}

/** The ⌘K pill for a top bar or sidebar. Give it `onClick` to open your CommandMenu. */
export const CommandMenuTrigger = React.forwardRef<HTMLButtonElement, CommandMenuTriggerProps>(function CommandMenuTrigger(
  { placeholder = 'Search or jump to…', shortcut = ['⌘', 'K'], className, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx(styles.trigger, className)} aria-haspopup="dialog" {...rest}>
      <Search size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" className={styles.trigger__icon} />
      <span className={styles.trigger__text}>{placeholder}</span>
      <span className={styles.trigger__keys} aria-hidden="true">{shortcut.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* CommandMenuAnswer                                                   */
/* ------------------------------------------------------------------ */

export interface CommandMenuAnswerProps {
  /** Defaults to "SakaniUI AI". */
  title?: string;
  /** e.g. "Answered in 2.4s". */
  status?: string;
  /** The answer text. */
  children: React.ReactNode;
  /** Sources as chips under the answer. */
  sources?: { label: string; icon?: IconComponent }[];
  /** Adds an "Ask a follow-up" button. */
  onFollowUp?: () => void;
  /** Adds an "Open in chat" hint with ⌘↵. */
  onOpenInChat?: () => void;
  onCopy?: () => void;
  className?: string;
}

/** An answer card for the Ask AI state: the answer, its sources and a follow-up. Pass it as the menu's `answer`. */
export const CommandMenuAnswer: React.FC<CommandMenuAnswerProps> = ({
  title = 'SakaniUI AI', status, children, sources, onFollowUp, onOpenInChat, onCopy, className,
}) => (
  <section className={cx(styles.answer, className)} aria-label={title}>
    <header className={styles.answer__header}>
      <span className={styles.answer__mark} aria-hidden="true"><Sparkles size={14} strokeWidth={iconStrokeWidth(14)} /></span>
      <span className={styles.answer__title}>{title}</span>
      {status && <span className={styles.answer__status}>{status}</span>}
      {onCopy && (
        <button type="button" className={styles.answer__copy} onClick={onCopy} aria-label="Copy the answer">
          <Copy size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
        </button>
      )}
    </header>
    <div className={styles.answer__body}>{children}</div>
    {sources && sources.length > 0 && (
      <div className={styles.answer__sources}>
        <span className={styles.answer__sourcesLabel}>Sources</span>
        {sources.map((s) => {
          const Icon = s.icon ?? FileText;
          return (
            <span key={s.label} className={styles.answer__source}>
              <Icon size={12} strokeWidth={iconStrokeWidth(12)} aria-hidden="true" />{s.label}
            </span>
          );
        })}
      </div>
    )}
    {(onFollowUp || onOpenInChat) && (
      <footer className={styles.answer__footer}>
        {onFollowUp && <Button variant="secondary" size="sm" onClick={onFollowUp}>Ask a follow-up</Button>}
        {onOpenInChat && <span className={styles.answer__openInChat}>Open in chat <Kbd>⌘</Kbd><Kbd>↵</Kbd></span>}
      </footer>
    )}
  </section>
);
CommandMenuAnswer.displayName = 'CommandMenuAnswer';

/* ------------------------------------------------------------------ */
/* CommandMenu                                                         */
/* ------------------------------------------------------------------ */

export const CommandMenu: React.FC<CommandMenuProps> = ({
  open: openProp, defaultOpen = false, onOpenChange, hotkey = 'k', variant = 'default',
  query: queryProp, defaultQuery = '', onQueryChange, placeholder = 'Search or ask anything…',
  groups, filter = true, highlightMatches = true, state = 'ready', onSelect, closeOnSelect = true,
  scopes, scope: scopeProp, defaultScope, onScopeChange,
  filters: filtersProp, onFiltersChange, filterKeys,
  onAskAI, answer, renderPreview,
  emptyTitle, emptyDescription, suggestions, fallbackGroups,
  errorTitle = 'Search is unavailable', errorDescription = 'We couldn’t reach the search index. Your recent items still work.', onRetry, onReport, retryLabel = 'Try again', reportLabel = 'Report',
  workspace, hideFooter = false, 'aria-label': ariaLabel = 'Command menu', className,
}) => {
  const simple = variant === 'simple';
  const reactId = React.useId();

  /* ---- controlled / uncontrolled state ---- */
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = React.useCallback((next: boolean) => { if (openProp === undefined) setOpenState(next); onOpenChange?.(next); }, [openProp, onOpenChange]);

  const [queryState, setQueryState] = React.useState(defaultQuery);
  const query = queryProp ?? queryState;
  const setQuery = (q: string) => { if (queryProp === undefined) setQueryState(q); onQueryChange?.(q); };

  const [scopeState, setScopeState] = React.useState(defaultScope ?? scopes?.[0]?.value ?? 'all');
  const scope = scopeProp ?? scopeState;
  const setScope = (s: string) => { if (scopeProp === undefined) setScopeState(s); onScopeChange?.(s); };

  const [filtersState, setFiltersState] = React.useState<CommandMenuFilter[]>([]);
  const filters = filtersProp ?? filtersState;
  const setFilters = (f: CommandMenuFilter[]) => { if (filtersProp === undefined) setFiltersState(f); onFiltersChange?.(f); };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { if (open) setMounted(true); }, [open]);

  /* ---- a closed menu starts fresh: its own (uncontrolled) query, tokens and scope reset once the exit has played ---- */
  const wasMounted = React.useRef(false);
  React.useEffect(() => {
    if (mounted) { wasMounted.current = true; return; }
    if (!wasMounted.current) return;
    wasMounted.current = false;
    if (queryProp === undefined) setQueryState(defaultQuery);
    if (filtersProp === undefined) setFiltersState([]);
    if (scopeProp === undefined) setScopeState(defaultScope ?? scopes?.[0]?.value ?? 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  /* ---- shortcut ---- */
  React.useEffect(() => {
    if (hotkey === false) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === hotkey.toLowerCase()) { e.preventDefault(); setOpen(!open); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hotkey, open, setOpen]);

  /* ---- what is shown ---- */
  const q = query.trim().toLowerCase();
  const matchesQuery = React.useCallback((item: CommandMenuItem) => {
    if (typeof filter === 'function') return filter(item, query);
    if (!q) return true;
    return [item.label, item.description, ...(item.keywords ?? [])].some((s) => s && s.toLowerCase().includes(q));
  }, [filter, query, q]);
  const matchesFilters = React.useCallback((item: CommandMenuItem) => filters.every((f) => !item.tags || item.tags.includes(f.value ?? f.label)), [filters]);

  const filtering = filter !== false;
  const base = React.useMemo(() => (filtering ? groups.map((g) => ({ ...g, items: g.items.filter((i) => matchesQuery(i) && matchesFilters(i)) })).filter((g) => g.items.length) : groups), [filtering, groups, matchesQuery, matchesFilters]);

  const scopeCounts = React.useMemo(() => {
    const out: Record<string, number> = {};
    if (!scopes) return out;
    const all = base.flatMap((g) => g.items);
    for (const s of scopes) if (s.count !== null) out[s.value] = s.count ?? (s.value === 'all' ? all.length : all.filter((i) => scopeOf(i) === s.value).length);
    return out;
  }, [scopes, base]);

  const shownGroups = React.useMemo(() => {
    if (!filtering || !scopes || scope === 'all' || simple) return base;
    return base.map((g) => ({ ...g, items: g.items.filter((i) => scopeOf(i) === scope || i.type === 'ai') })).filter((g) => g.items.length);
  }, [filtering, scopes, scope, simple, base]);

  const total = shownGroups.reduce((n, g) => n + g.items.length, 0);
  const searching = Boolean(q) || filters.length > 0;
  /* Counts say "this many matches": only meaningful for a finished search (not the idle list, loading or an error). */
  const showCounts = state === 'ready' && searching;
  const empty = state === 'ready' && total === 0 && searching;
  const showFallback = (empty || state === 'error') && fallbackGroups;
  const listGroups = React.useMemo(() => (state === 'loading' ? [] : showFallback ? fallbackGroups! : shownGroups), [state, showFallback, fallbackGroups, shownGroups]);
  const flat = React.useMemo(() => listGroups.flatMap((g) => g.items).filter((i) => !i.disabled), [listGroups]);

  /* ---- active item ---- */
  const [active, setActive] = React.useState(0);
  const listKey = flat.map((i) => i.id).join('|');
  React.useEffect(() => { setActive(0); }, [listKey, scope]);
  const activeItem = flat[Math.min(active, flat.length - 1)];
  const optionId = (item: CommandMenuItem) => `${reactId}-opt-${item.id}`;


  const hover = useHoverHighlight<HTMLDivElement>();
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const itemEls = React.useRef(new Map<string, HTMLElement>());
  React.useEffect(() => {
    if (!open || !activeItem) return;
    const el = itemEls.current.get(activeItem.id);
    if (el) {
      hover.showItem(el);
      /* The first row sits under whatever heads the list (a group label, or the empty/error message), so go to the
         very top rather than just bringing the row into view, which would scroll that heading out of sight. */
      const body = bodyRef.current;
      if (flat[0]?.id === activeItem.id && body) body.scrollTop = 0;
      else el.scrollIntoView?.({ block: 'nearest' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted, activeItem?.id, listKey]);

  /* ---- mount, exit animation, focus, scroll lock ---- */
  const markerRef = React.useRef<HTMLSpanElement>(null);
  const portalTheme = usePortalThemeClass(markerRef, open);
  const portalSurface = usePortalSurface(markerRef, open);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const lastFocus = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), EXIT_MS + 60);
    return () => clearTimeout(t);
  }, [open, mounted]);
  // remember where focus was and lock page scroll while open; both undo on close
  React.useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; lastFocus.current?.focus?.(); };
  }, [open]);
  // focus the field once the panel exists (it mounts a render after `open` flips)
  React.useEffect(() => {
    if (!open || !mounted) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, mounted]);

  /* ---- choosing ---- */
  const choose = (item: CommandMenuItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    onSelect?.(item);
    if (closeOnSelect) { setOpen(false); }
  };

  /* ---- field keyboard ---- */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const last = flat.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (last < 0 ? 0 : Math.min(i + 1, last))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Home' && !e.currentTarget.value) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && !e.currentTarget.value) { e.preventDefault(); setActive(Math.max(last, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if ((e.metaKey || e.ctrlKey) && onAskAI) { onAskAI(query); return; }
      if (activeItem) choose(activeItem);
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (query) setQuery(''); else setOpen(false);
    } else if (e.key === 'Backspace' && !query && filters.length) {
      e.preventDefault(); setFilters(filters.slice(0, -1));
    } else if (e.key === 'Tab' && scopes && !simple) {
      e.preventDefault();
      const i = scopes.findIndex((s) => s.value === scope);
      setScope(scopes[(i + (e.shiftKey ? -1 : 1) + scopes.length) % scopes.length].value);
    } else if (e.key === ' ' && filterKeys?.length) {
      const m = /(?:^|\s)([A-Za-z][\w-]*):(\S+)$/.exec(e.currentTarget.value);
      if (m && filterKeys.includes(m[1].toLowerCase())) {
        e.preventDefault();
        const key = m[1].toLowerCase();
        setFilters([...filters, { id: `${key}:${m[2]}`, label: `${key}: ${m[2]}`, value: m[2] }]);
        setQuery(e.currentTarget.value.slice(0, m.index).trim());
      }
    }
  };

  /* ---- rendering ---- */
  if (!mounted) return <span ref={markerRef} style={{ display: 'none' }} aria-hidden="true" />;

  const hasPreview = Boolean(renderPreview && activeItem && renderPreview(activeItem));
  const announcement = state === 'loading' ? 'Searching' : state === 'error' ? 'Search is unavailable' : empty ? 'No results' : `${total} result${total === 1 ? '' : 's'}`;

  const renderItem = (item: CommandMenuItem, highlight = highlightMatches) => {
    const isActive = activeItem?.id === item.id;
    const Icon = item.icon ?? TYPE_ICON[item.type ?? 'action'];
    const person = item.type === 'person' || item.avatar;
    return (
      <div
        key={item.id}
        id={optionId(item)}
        role="option"
        aria-selected={isActive}
        aria-disabled={item.disabled || undefined}
        data-hover-item={item.disabled ? 'off' : ''}
        data-type={item.type}
        ref={(el) => { if (el) itemEls.current.set(item.id, el); else itemEls.current.delete(item.id); }}
        className={cx(styles.item, isActive && styles['item--active'], item.disabled && styles['item--disabled'])}
        onMouseMove={() => { const i = flat.findIndex((x) => x.id === item.id); if (i >= 0 && i !== active) setActive(i); }}
        onClick={() => choose(item)}
      >
        {(!simple || person) && (
          <span className={cx(styles.item__lead, item.type === 'ai' && styles['item__lead--ai'], person && styles['item__lead--person'])} aria-hidden="true">
            {person ? (
              <>
                <Avatar size="sm" src={item.avatar?.src} initials={item.avatar?.initials} alt={item.avatar?.alt ?? ''} />
                {item.avatar?.status && <span className={cx(styles.item__status, styles[`item__status--${item.avatar.status}`])} />}
              </>
            ) : (
              <Icon size={16} strokeWidth={iconStrokeWidth(16)} />
            )}
          </span>
        )}
        {simple && !person && <Icon size={16} strokeWidth={iconStrokeWidth(16)} className={styles.item__bare} aria-hidden="true" />}
        <span className={styles.item__text}>
          <span className={styles.item__label}>{highlight ? <Highlighted text={item.label} query={query} /> : item.label}</span>
          {item.description && <span className={styles.item__desc}>{item.description}</span>}
        </span>
        <span className={styles.item__trail}>
          {item.meta && <span className={styles.item__meta}>{item.meta}</span>}
          {item.shortcut && <span className={styles.item__keys} aria-hidden="true">{item.shortcut.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>}
          {isActive && !item.shortcut && item.type !== 'ai' && <span className={styles.item__enter} aria-hidden="true"><Kbd>↵</Kbd></span>}
        </span>
      </div>
    );
  };

  const renderGroup = (g: CommandMenuGroup, highlight: boolean) => (
    <div key={g.id} role="group" aria-labelledby={g.label ? `${reactId}-g-${g.id}` : undefined} className={styles.group}>
      {g.label && (
        <div className={styles.group__label}>
          <span id={`${reactId}-g-${g.id}`}>{g.label}</span>
          {g.action && <button type="button" tabIndex={-1} className={styles.group__action} onClick={g.action.onClick}>{g.action.label}</button>}
        </div>
      )}
      {g.items.map((item) => renderItem(item, highlight))}
    </div>
  );

  const hints = [
    { keys: ['↑', '↓'], label: 'Navigate' },
    { keys: ['↵'], label: 'Open' },
    ...(onAskAI && !simple ? [{ keys: ['⌘', '↵'], label: 'Ask AI' }] : []),
    { keys: ['esc'], label: 'Close' },
  ];

  return (
    <>
      <span ref={markerRef} style={{ display: 'none' }} aria-hidden="true" />
      {createPortal(
        <div
          className={cx(styles.backdrop, portalTheme, open ? styles['backdrop--in'] : styles['backdrop--out'])}
          data-surface={portalSurface}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className={cx(styles.panel, simple && styles['panel--simple'], hasPreview && styles['panel--preview'], open ? styles['panel--in'] : styles['panel--out'], className)}
          >
            {/* field */}
            <div className={styles.field}>
              <Search size={20} strokeWidth={iconStrokeWidth(20)} className={styles.field__icon} aria-hidden="true" />
              <div className={styles.field__content}>
                {filters.map((f) => {
                  const FIcon = f.icon;
                  return (
                    <span key={f.id} className={styles.token}>
                      {FIcon && <FIcon size={13} strokeWidth={iconStrokeWidth(13)} className={styles.token__icon} aria-hidden="true" />}
                      {f.label}
                      <button type="button" tabIndex={-1} className={styles.token__remove} onClick={() => { setFilters(filters.filter((x) => x.id !== f.id)); inputRef.current?.focus(); }} aria-label={`Remove ${f.label}`}>
                        <X size={12} strokeWidth={iconStrokeWidth(12)} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                <input
                  ref={inputRef}
                  className={styles.input}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={`${reactId}-list`}
                  aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
                  aria-autocomplete="list"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={ariaLabel}
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                />
              </div>
              {state === 'loading' && <Spinner size="sm" label="Searching" />}
              {query && state !== 'loading' && (
                <button type="button" tabIndex={-1} className={styles.field__clear} onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear the search">
                  <CircleX size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
                </button>
              )}
              <Kbd>esc</Kbd>
            </div>

            {/* scopes */}
            {scopes && !simple && (
              <div className={styles.scopes} role="tablist" aria-label="Scope">
                {scopes.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="tab"
                    tabIndex={-1}
                    aria-selected={s.value === scope}
                    className={cx(styles.scope, s.value === scope && styles['scope--active'])}
                    onClick={() => { setScope(s.value); inputRef.current?.focus(); }}
                  >
                    {s.label}
                    {showCounts && scopeCounts[s.value] != null && <span className={styles.scope__count}>{scopeCounts[s.value]}</span>}
                  </button>
                ))}
                <span className={styles.scopes__hint} aria-hidden="true">Switch scope <Kbd>tab</Kbd></span>
              </div>
            )}

            {/* body */}
            <div className={styles.split}>
              <div
                ref={(node) => { bodyRef.current = node; hover.ref(node); }}
                {...hover.groupProps}
                onMouseLeave={() => { hover.groupProps.onMouseLeave(); if (activeItem) { const el = itemEls.current.get(activeItem.id); if (el) requestAnimationFrame(() => hover.showItem(el)); } }}
                className={styles.body}
              >
                {hover.highlight}
                {answer && <div className={styles.answerSlot}>{answer}</div>}

                {state === 'loading' && (
                  <div className={styles.loading} aria-hidden="true">
                    <div className={styles.group__label}><span>Searching…</span></div>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={styles.skeleton}>
                        <Skeleton variant="rect" width={28} height={28} />
                        <div className={styles.skeleton__lines}><Skeleton variant="text" width={i % 2 ? 160 : 220} height={10} /><Skeleton variant="text" width={i % 2 ? 110 : 140} height={8} /></div>
                      </div>
                    ))}
                  </div>
                )}

                {state === 'error' && (
                  <div className={cx(styles.message, styles['message--error'])}>
                    <span className={styles.message__tile} aria-hidden="true"><AlertTriangle size={22} strokeWidth={iconStrokeWidth(22)} /></span>
                    <div className={styles.message__text}><strong>{errorTitle}</strong><span>{errorDescription}</span></div>
                    {(onRetry || onReport) && (
                      <div className={styles.message__actions}>
                        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button>}
                        {onReport && <Button variant="ghost" size="sm" onClick={onReport}>{reportLabel}</Button>}
                      </div>
                    )}
                  </div>
                )}

                {empty && (
                  <div className={cx(styles.message, styles['message--empty'])}>
                    <span className={styles.ghost} aria-hidden="true">
                      <GhostTrack />
                      <span className={styles.ghost__lens}>
                        <span className={styles.ghost__glass}><span className={styles.ghost__zoom}><GhostTrack /></span></span>
                      </span>
                    </span>
                    <div className={styles.message__text}>
                      <strong>{emptyTitle ?? <>No results for “{query.trim() || filters.map((f) => f.label).join(', ')}”</>}</strong>
                      <span>{emptyDescription ?? 'Check the spelling, or try a broader search.'}</span>
                    </div>
                    {suggestions && suggestions.length > 0 && (
                      <div className={styles.message__chips}>
                        {suggestions.map((s) => {
                          const SIcon = s.icon;
                          const at = s.emphasis ? s.label.indexOf(s.emphasis) : -1;
                          const icon = SIcon && <SIcon size={14} strokeWidth={iconStrokeWidth(14)} aria-hidden="true" />;
                          return (
                            <button key={s.label} type="button" tabIndex={-1} className={styles.chip} onClick={s.onSelect}>
                              {s.iconPosition !== 'end' && icon}
                              <span>
                                {at < 0 ? s.label : <>{s.label.slice(0, at)}<strong className={styles.chip__em}>{s.emphasis}</strong>{s.label.slice(at + (s.emphasis as string).length)}</>}
                              </span>
                              {s.iconPosition === 'end' && icon}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div id={`${reactId}-list`} role="listbox" aria-label="Results" aria-busy={state === 'loading' || undefined} className={styles.groups}>
                  {listGroups.map((g) => renderGroup(g, highlightMatches && !showFallback))}
                </div>
              </div>
              {hasPreview && activeItem && <aside className={styles.preview} aria-label="Preview">{renderPreview!(activeItem)}</aside>}
            </div>

            <div role="status" className={styles.sr}>{announcement}</div>

            {/* footer */}
            {!hideFooter && (
              <div className={styles.footer}>
                {!simple && workspace && <span className={styles.footer__workspace}><span className={styles.footer__dot} aria-hidden="true" />{workspace}<ChevronDown size={12} strokeWidth={iconStrokeWidth(12)} className={styles.footer__chevron} aria-hidden="true" /></span>}
                <span className={styles.footer__hints} aria-hidden="true">
                  {hints.map((h) => (
                    <span key={h.label} className={styles.hint}><span className={styles.hint__keys}>{h.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>{h.label}</span>
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
CommandMenu.displayName = 'CommandMenu';

export default CommandMenu;
