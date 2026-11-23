/**
 * StageMenu
 *
 * The "Move to" control in a board card's footer. A small round button (⇄); click it and a short list of the stages
 * opens, each with its colour. The card's own stage has a check, and the next stage is highlighted to start with, so a
 * click (or Enter) moves the card on, and any other stage is one click away. ↑ ↓ (or a number key) pick, Esc closes.
 * Matches the Figma "Stage Menu Trigger" set and the "Stage Menu" component.
 *
 * Internal to BoardCard: you pass `stages`, `stage` and `onMoveTo` to the card and it draws this in its footer. The menu
 * portals to <body> (so a scrolling board cannot clip it) and keeps the theme of the place it opened from.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { IconSwitchHorizontal } from '../../icons/outline/switch-horizontal';
import { IconCheck } from '../../icons/outline/check';
import { IconChevronUp } from '../../icons/outline/chevron-up';
import { usePortalThemeClass } from '../../lib/usePortalThemeClass';
import styles from './StageMenu.module.css';

export interface BoardCardStage {
  /** What `onMoveTo` gets back. */
  id: string;
  label: string;
  /** The stage's colour: its dot in the menu. Any CSS colour. */
  color?: string;
}

export interface StageMenuProps {
  stages: BoardCardStage[];
  /** The id of the stage the card (or every selected card) is in; left out when they are in different stages. */
  current?: string;
  onMove: (id: string) => void;
  disabled?: boolean;
  /** 'icon': the round ⇄ on a card (default). 'bar': a "Move to" button, for a selection bar; its list opens above it. */
  variant?: 'icon' | 'bar';
  /** What is being moved, for the button's label ("Move 3 cards to another stage"). */
  subject?: string;
}

const WIDTH = 200;
const GAP = 8;

export const StageMenu: React.FC<StageMenuProps> = ({ stages, current, onMove, disabled, variant = 'icon', subject }) => {
  const at = current == null ? -1 : stages.findIndex((s) => s.id === current);
  const firstChoice = at < 0 ? -1 : at + 1 < stages.length ? at + 1 : at > 0 ? at - 1 : -1;

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [active, setActive] = React.useState(firstChoice);
  const [pos, setPos] = React.useState<{ top: number; left: number; above: boolean } | null>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const rows = React.useRef<(HTMLButtonElement | null)[]>([]);
  const theme = usePortalThemeClass(trigger, mounted);

  const show = () => { setActive(firstChoice); setMounted(true); setOpen(true); };
  const hide = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus({ preventScroll: true }); };

  // Place the menu under the button, right edges lined up; above it when there is no room below.
  const place = React.useCallback(() => {
    const t = trigger.current;
    const p = panel.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const h = p?.offsetHeight ?? 240;
    const above = variant === 'bar' ? r.top - GAP - h > 8 : r.bottom + GAP + h > window.innerHeight - 8 && r.top - GAP - h > 8;
    const left = Math.min(Math.max(8, variant === 'bar' ? r.left + r.width / 2 - WIDTH / 2 : r.right - WIDTH), window.innerWidth - WIDTH - 8);
    setPos({ top: above ? r.top - GAP - h : r.bottom + GAP, left, above });
  }, []);
  React.useLayoutEffect(() => { if (mounted) place(); }, [mounted, place]);
  React.useEffect(() => {
    if (!open) return undefined;
    const close = (e: Event) => {
      const n = e.target as Node;
      if (panel.current?.contains(n) || trigger.current?.contains(n)) return;
      hide(false);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open, place]);
  // Focus follows the chosen row, so a screen reader reads it and Enter acts on it.
  React.useEffect(() => {
    if (!open || !pos) return;
    if (active >= 0) rows.current[active]?.focus({ preventScroll: true });
    else panel.current?.focus({ preventScroll: true });
  }, [open, pos, active]);
  // A move starts elsewhere (or the card is dragged): close.
  React.useEffect(() => { if (disabled && open) hide(false); }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (i: number) => {
    const s = stages[i];
    if (!s || i === at) return;
    hide(true); // focus back on the card first, so it keeps focus through the move
    onMove(s.id);
  };
  const step = (dir: 1 | -1) => setActive((i) => {
    for (let n = 1; n <= stages.length; n++) {
      const j = (i + dir * n + stages.length * n) % stages.length;
      if (j !== at) return j;
    }
    return i;
  });
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(at === 0 ? 1 : 0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(at === stages.length - 1 ? stages.length - 2 : stages.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); hide(true); }
    else if (e.key === 'Tab') { hide(false); }
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= stages.length) { e.preventDefault(); choose(Number(e.key) - 1); }
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={variant === 'bar' ? styles.barTrigger : styles.trigger}
        aria-label={variant === 'bar' ? undefined : subject ? `Move ${subject} to another stage` : 'Move to another stage'}
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open ? '' : undefined}
        data-stage-trigger={variant}
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if (open) hide(false); else show(); }}
        onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) { e.preventDefault(); show(); } }}
      >
        {variant === 'bar' ? (
          <>Move to <IconChevronUp size={14} aria-hidden /></>
        ) : (
          <>
            <IconSwitchHorizontal size={16} aria-hidden />
            {!open && <span className={styles.tip} aria-hidden>Move to…</span>}
          </>
        )}
      </button>

      {mounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={panel}
          role="menu"
          tabIndex={-1}
          aria-label={subject ? `Move ${subject} to` : 'Move to'}
          className={[theme, styles.menu, open ? styles['menu--in'] : styles['menu--out'], pos?.above ? styles['menu--above'] : '', variant === 'bar' ? styles['menu--bar'] : ''].filter(Boolean).join(' ')}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: WIDTH }}
          onKeyDown={onKeyDown}
          onAnimationEnd={() => { if (!open) { setMounted(false); setPos(null); } }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={styles.list}>
            <span className={styles.highlight} aria-hidden style={{ transform: `translateY(${Math.max(0, active) * 34}px)`, opacity: active >= 0 && active !== at ? 1 : 0 }} />
            {stages.map((s, i) => (
              <button
                key={s.id}
                ref={(el) => { rows.current[i] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={i === at}
                aria-disabled={i === at || undefined}
                tabIndex={-1}
                className={styles.row}
                data-current={i === at ? '' : undefined}
                style={{ ['--stage' as string]: s.color ?? 'var(--color-fg-muted)' }}
                onMouseEnter={() => { if (i !== at) setActive(i); }}
                onClick={() => choose(i)}
              >
                <i className={styles.dot} aria-hidden />
                <span className={styles.label}>{s.label}</span>
                {i === at && <IconCheck size={16} className={styles.check} aria-hidden />}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default StageMenu;
