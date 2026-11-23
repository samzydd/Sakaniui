/**
 * StageMenu
 *
 * The "Move to" control in a board card's footer. A small round button (⇄); click it and a menu opens with every stage
 * laid out as a pipeline: the stages behind the card filled in, the one it is in ringed and marked "Current", the ones
 * ahead hollow, each with its colour and how many cards it holds. The next stage is chosen to start with, so a click and
 * Enter move the card on; ↑ ↓ (or a number key) pick another. Matches the Figma "Stage Menu Trigger" set and the
 * "Stage Menu" component.
 *
 * Internal to BoardCard: you pass `stages`, `stage` and `onMoveTo` to the card and it draws this in its footer. The menu
 * portals to <body> (so a scrolling board cannot clip it) and keeps the theme of the place it opened from.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { IconSwitchHorizontal } from '../../icons/outline/switch-horizontal';
import { IconCornerDownLeft } from '../../icons/outline/corner-down-left';
import { IconArrowUp } from '../../icons/outline/arrow-up';
import { IconArrowDown } from '../../icons/outline/arrow-down';
import { usePortalThemeClass } from '../../lib/usePortalThemeClass';
import styles from './StageMenu.module.css';

export interface BoardCardStage {
  /** What `onMoveTo` gets back. */
  id: string;
  label: string;
  /** The stage's colour: its dot in the menu. Any CSS colour. */
  color?: string;
  /** How many cards the stage holds, shown beside it. */
  count?: number;
}

export interface StageMenuProps {
  stages: BoardCardStage[];
  /** The id of the stage the card is in. */
  current: string;
  onMove: (id: string) => void;
  disabled?: boolean;
}

const WIDTH = 248;
const GAP = 8;

export const StageMenu: React.FC<StageMenuProps> = ({ stages, current, onMove, disabled }) => {
  const at = Math.max(0, stages.findIndex((s) => s.id === current));
  const firstChoice = at + 1 < stages.length ? at + 1 : at > 0 ? at - 1 : -1;

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
    const above = r.bottom + GAP + h > window.innerHeight - 8 && r.top - GAP - h > 8;
    const left = Math.min(Math.max(8, r.right - WIDTH), window.innerWidth - WIDTH - 8);
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
  React.useEffect(() => { if (open && pos) rows.current[active]?.focus({ preventScroll: true }); }, [open, pos, active]);
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
        className={styles.trigger}
        aria-label="Move to another stage"
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open ? '' : undefined}
        data-stage-trigger
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if (open) hide(false); else show(); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); show(); } }}
      >
        <IconSwitchHorizontal size={16} aria-hidden />
        {!open && <span className={styles.tip} aria-hidden>Move to…</span>}
      </button>

      {mounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={panel}
          role="menu"
          aria-label="Move to"
          className={[theme, styles.menu, open ? styles['menu--in'] : styles['menu--out'], pos?.above ? styles['menu--above'] : ''].filter(Boolean).join(' ')}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: WIDTH }}
          onKeyDown={onKeyDown}
          onAnimationEnd={() => { if (!open) { setMounted(false); setPos(null); } }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className={styles.head}>Move to</p>
          <div className={styles.list} style={{ ['--rows' as string]: stages.length }}>
            <span className={styles.highlight} aria-hidden style={{ transform: `translateY(${Math.max(0, active) * 38}px)`, opacity: active >= 0 && active !== at ? 1 : 0 }} />
            {stages.map((s, i) => {
              const kind = i < at ? 'passed' : i === at ? 'current' : 'ahead';
              return (
                <button
                  key={s.id}
                  ref={(el) => { rows.current[i] = el; }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={i === at}
                  aria-disabled={i === at || undefined}
                  tabIndex={-1}
                  className={styles.row}
                  data-kind={kind}
                  data-active={i === active && i !== at ? '' : undefined}
                  style={{ ['--stage' as string]: s.color ?? 'var(--color-fg-muted)' }}
                  onMouseEnter={() => { if (i !== at) setActive(i); }}
                  onClick={() => choose(i)}
                >
                  <i className={styles.node} aria-hidden />
                  <span className={styles.label}>{s.label}</span>
                  {i === at ? (
                    <span className={styles.meta}>Current</span>
                  ) : (
                    <>
                      {s.count != null && <span className={styles.meta}>{s.count}</span>}
                      <IconCornerDownLeft size={14} className={styles.enter} aria-hidden />
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <div className={styles.hint} aria-hidden>
            <span><kbd><IconArrowUp size={11} /></kbd><kbd><IconArrowDown size={11} /></kbd> choose</span>
            <span><kbd><IconCornerDownLeft size={11} /></kbd> move</span>
            <span><kbd>esc</kbd> close</span>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default StageMenu;
