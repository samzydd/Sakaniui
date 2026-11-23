/**
 * useKanbanDrag — pointer-based drag and drop for the Kanban board block.
 *
 * Replaces native HTML5 drag and drop, which can't style the dragged image or
 * show where a card will land. Mouse, pen and touch all go through pointer
 * events:
 *
 *   - The card lifts into an overlay that follows the pointer and hangs from
 *     the grab point: moving sideways swings it in the direction of travel,
 *     springing back upright as it slows.
 *   - A card-shaped slot opens where the card will land; `target` says which
 *     column and index. The block renders the slot, and `capture()` + the
 *     block's FLIP layout effect slide the other cards out of its way.
 *   - On release the overlay glides into the slot and settles, then `onMove`
 *     commits the move. Released outside every column, the slot returns to the
 *     card's origin and the card springs back there.
 *   - Mouse drags start after 4px of movement (so clicks still click); touch
 *     drags start after a short press-and-hold (so swipes still scroll).
 *   - Near the board's left/right edge the columns row scrolls.
 *   - With prefers-reduced-motion the card doesn't swing and drops in place.
 *
 * `capture()` is also returned: call it just before a layout change you want the cards to slide through (the block's
 * "move to the next stage" uses it, so the cards slide the same way for a click as for a drag).
 */
import React from 'react';

export interface KanbanPos { col: number; index: number }

export interface KanbanDragActive {
  id: string;
  from: KanbanPos;
  width: number;
  height: number;
}

interface Options {
  enabled: boolean;
  /** Commit a move. `to.index` counts the target column's cards without the moved one. */
  onMove: (from: KanbanPos, to: KanbanPos) => void;
}

const MOUSE_THRESHOLD = 4;     // px before a press becomes a drag
const TOUCH_HOLD = 180;        // ms of press-and-hold before a touch drag
const TOUCH_SLOP = 8;          // px a touch may move during the hold
const EDGE = 64;               // px from the board edge where auto-scroll starts
const MAX_TILT = 9;            // degrees
const LIFT_SCALE = 1.035;

const NO_DRAG = 'button, input, textarea, select, a, label, [role="checkbox"], [role="button"], [contenteditable="true"]';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useKanbanDrag({ enabled, onMove }: Options) {
  const [active, setActive] = React.useState<KanbanDragActive | null>(null);
  const [target, setTarget] = React.useState<KanbanPos | null>(null);

  const blockRef = React.useRef<HTMLDivElement | null>(null);
  const boardRef = React.useRef<HTMLDivElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const columnEls = React.useRef(new Map<number, HTMLElement>());

  // Mutable drag state, read every animation frame without re-rendering.
  const s = React.useRef({
    pending: null as null | { x: number; y: number; t: number; from: KanbanPos; id: string; el: HTMLElement; touch: boolean; timer: number },
    active: null as KanbanDragActive | null,
    target: null as KanbanPos | null,
    grabX: 0, grabY: 0,
    px: 0, py: 0, lastPx: 0, lastT: 0, vx: 0,
    x: 0, y: 0, rot: 0, rotV: 0, scale: 1,
    settling: null as null | { x: number; y: number; done: () => void },
    raf: 0,
  });
  const onMoveRef = React.useRef(onMove);
  onMoveRef.current = onMove;

  // FLIP: visual positions of [data-flip-id] elements before a layout change.
  const flipFrom = React.useRef<Map<string, DOMRect> | null>(null);
  const capture = React.useCallback(() => {
    const root = boardRef.current;
    if (!root) return;
    const m = new Map<string, DOMRect>();
    root.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((el) => m.set(el.dataset.flipId!, el.getBoundingClientRect()));
    flipFrom.current = m;
  }, []);

  React.useLayoutEffect(() => {
    const from = flipFrom.current;
    const root = boardRef.current;
    if (!from || !root) return;
    flipFrom.current = null;
    if (reducedMotion()) return;
    // A card with data-flip-skip is animated by its owner (the move to the next stage flies it on its own path).
    const els = [...root.querySelectorAll<HTMLElement>('[data-flip-id]')].filter((el) => el.dataset.flipSkip === undefined);
    // Measure the new layout untransformed, then play each element from where it was.
    els.forEach((el) => { el.style.transition = 'none'; el.style.transform = ''; });
    const moves = els.map((el) => {
      const prev = from.get(el.dataset.flipId!);
      const now = el.getBoundingClientRect();
      // inside a scaled preview the rects are scaled and a translate is not: divide by the element's own scale
      const k = el.offsetWidth ? now.width / el.offsetWidth || 1 : 1;
      return { el, dx: prev ? (prev.left - now.left) / k : 0, dy: prev ? (prev.top - now.top) / k : 0 };
    });
    moves.forEach(({ el, dx, dy }) => { if (dx || dy) el.style.transform = `translate(${dx}px, ${dy}px)`; });
    void root.offsetHeight;
    moves.forEach(({ el, dx, dy }) => {
      if (!dx && !dy) return;
      // a card can ask for its own timing (data-flip-duration, data-flip-ease)
      const ms = el.dataset.flipDuration || '240';
      const ease = el.dataset.flipEase || 'cubic-bezier(0.25, 1, 0.5, 1)';
      el.style.transition = `transform ${ms}ms ${ease}`;
      el.style.transform = '';
    });
  });

  /** Which column and index the pointer is over; the origin when over none. */
  const hitTest = (px: number, py: number): KanbanPos => {
    const st = s.current;
    for (const [col, el] of columnEls.current) {
      const r = el.getBoundingClientRect();
      if (px < r.left - 8 || px > r.right + 8) continue;
      // Walk the column's cards in order, as laid out without the slot.
      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
      const cards = [...el.querySelectorAll<HTMLElement>(':scope > [data-kanban-card]')];
      let y = r.top;
      let index = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const h = cards[i].offsetHeight;
        if (py < y + h / 2) { index = i; break; }
        y += h + gap;
      }
      return { col, index };
    }
    return st.active!.from;
  };

  const frame = (t: number) => {
    const st = s.current;
    const a = st.active;
    const block = blockRef.current;
    const overlay = overlayRef.current;
    if (!a || !block) { st.raf = 0; return; }
    const reduce = reducedMotion();
    const br = block.getBoundingClientRect();

    if (st.settling) {
      // Glide into the slot and settle upright.
      const k = reduce ? 1 : 0.22;
      st.x += (st.settling.x - st.x) * k;
      st.y += (st.settling.y - st.y) * k;
      st.rotV = st.rotV * 0.4 + (0 - st.rot) * 0.2;
      st.rot = reduce ? 0 : st.rot + st.rotV;
      st.scale += (1 - st.scale) * (reduce ? 1 : 0.25);
      const close = Math.abs(st.settling.x - st.x) < 0.5 && Math.abs(st.settling.y - st.y) < 0.5 && Math.abs(st.rot) < 0.2;
      if (close) {
        const done = st.settling.done;
        st.settling = null;
        st.raf = 0;
        done();
        return;
      }
    } else {
      // Follow the pointer; swing with horizontal velocity.
      const dt = Math.max(1, t - st.lastT);
      const v = ((st.px - st.lastPx) / dt) * 16;
      st.vx = st.vx * 0.6 + v * 0.4;
      st.lastPx = st.px;
      st.lastT = t;
      st.x = st.px - st.grabX;
      st.y = st.py - st.grabY;
      const want = reduce ? 0 : Math.max(-MAX_TILT, Math.min(MAX_TILT, st.vx * 0.9));
      st.rotV = st.rotV * 0.45 + (want - st.rot) * 0.18;
      st.rot = reduce ? 0 : st.rot + st.rotV;
      st.scale += (LIFT_SCALE - st.scale) * (reduce ? 1 : 0.3);

      // Auto-scroll the columns row near its edges.
      const board = boardRef.current;
      if (board) {
        const r = board.getBoundingClientRect();
        if (st.px < r.left + EDGE) board.scrollLeft -= Math.ceil((r.left + EDGE - st.px) / 4);
        else if (st.px > r.right - EDGE) board.scrollLeft += Math.ceil((st.px - (r.right - EDGE)) / 4);
      }

      const next = hitTest(st.px, st.py);
      if (!st.target || next.col !== st.target.col || next.index !== st.target.index) {
        st.target = next;
        capture();
        setTarget(next);
      }
    }

    if (overlay) {
      overlay.style.transformOrigin = `${st.grabX}px ${st.grabY}px`;
      overlay.style.transform =
        `translate3d(${st.x - br.left}px, ${st.y - br.top}px, 0) rotate(${st.rot.toFixed(2)}deg) scale(${st.scale.toFixed(4)})`;
    }
    st.raf = requestAnimationFrame(frame);
  };

  const begin = () => {
    const st = s.current;
    const p = st.pending;
    if (!p) return;
    st.pending = null;
    window.clearTimeout(p.timer);
    const r = p.el.getBoundingClientRect();
    st.grabX = p.x - r.left;
    st.grabY = p.y - r.top;
    st.x = r.left; st.y = r.top;
    st.lastPx = st.px; st.lastT = performance.now(); st.vx = 0;
    st.rot = 0; st.rotV = 0; st.scale = 1;
    const a: KanbanDragActive = { id: p.id, from: p.from, width: r.width, height: r.height };
    st.active = a;
    st.target = p.from;
    capture();
    setActive(a);
    setTarget(p.from);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    if (!st.raf) st.raf = requestAnimationFrame(frame);
  };

  const finish = React.useCallback(() => {
    const st = s.current;
    st.active = null;
    st.target = null;
    st.settling = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setActive(null);
    setTarget(null);
  }, []);

  const drop = () => {
    const st = s.current;
    const a = st.active;
    if (!a || st.settling) return;
    const to = st.target ?? a.from;
    const slot = boardRef.current?.querySelector<HTMLElement>('[data-kanban-slot]');
    const r = slot?.getBoundingClientRect();
    st.settling = {
      x: r ? r.left : st.x,
      y: r ? r.top : st.y,
      done: () => {
        capture();
        if (to.col !== a.from.col || to.index !== a.from.index) onMoveRef.current(a.from, to);
        finish();
      },
    };
    if (!st.raf) st.raf = requestAnimationFrame(frame);
  };

  // Window listeners for the whole gesture.
  React.useEffect(() => {
    const st = s.current;
    const move = (e: PointerEvent) => {
      st.px = e.clientX; st.py = e.clientY;
      const p = st.pending;
      if (p && !st.active) {
        const d = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (p.touch) { if (d > TOUCH_SLOP) { window.clearTimeout(p.timer); st.pending = null; } }
        else if (d > MOUSE_THRESHOLD) begin();
      }
    };
    const up = () => {
      if (st.pending) { window.clearTimeout(st.pending.timer); st.pending = null; }
      if (st.active) drop();
    };
    // Once a touch drag is live, stop the page from scrolling under it.
    const touchMove = (e: TouchEvent) => { if (st.active && !st.settling) e.preventDefault(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('touchmove', touchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchmove', touchMove);
      if (st.raf) cancelAnimationFrame(st.raf);
      st.raf = 0;
    };
    // begin/drop read only refs, so binding them once is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Props for a card's wrapper. */
  const cardProps = (from: KanbanPos, id: string) =>
    enabled
      ? {
          'data-kanban-card': id,
          'data-flip-id': id,
          onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            if (e.button !== 0 || s.current.active) return;
            if ((e.target as HTMLElement).closest(NO_DRAG)) return;
            const st = s.current;
            const touch = e.pointerType === 'touch';
            st.px = e.clientX; st.py = e.clientY;
            st.pending = {
              x: e.clientX, y: e.clientY, t: performance.now(), from, id, el: e.currentTarget, touch,
              timer: touch ? window.setTimeout(begin, TOUCH_HOLD) : 0,
            };
          },
        }
      : {};

  /** Ref for a column's card list. */
  const columnRef = (col: number) => (el: HTMLElement | null) => {
    if (el) columnEls.current.set(col, el); else columnEls.current.delete(col);
  };

  return { active, target, blockRef, boardRef, overlayRef, cardProps, columnRef, capture };
}
