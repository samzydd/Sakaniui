/**
 * Toaster
 *
 * Renders the stack of toasts that `toast()` creates. Mount one near the root of the app, then call
 * `toast()`, `toast.success()`, `toast.promise()` and friends from anywhere.
 *
 * Matches Figma "Sonner", "Sonner Stack" and "Sonner Position" (the ↳ Sonner page):
 *   Type (Default|Success|Info|Warning|Error|Loading) → toast.<type>()
 *   Rich colors (Off|On)                              → richColors
 *   Description / Icon / Action / Cancel / Close button → the toast options of the same name
 *   Position (6)                                       → position
 *
 * Behaviour and motion follow Sonner (sonner.emilkowal.ski, MIT): 356px toasts 14px apart, 24px
 * from the viewport edge. New toasts rise in from below (400ms, ease); older ones lift 14px and
 * shrink 5% per level with their content hidden, three visible at most. Hovering or focusing the
 * stack spreads it into a list and pauses the timers (4000ms by default). Swipe a toast towards
 * its edge to dismiss it: past 45px (or a quick flick) it flies out in 200ms, otherwise it springs
 * back. alt+T focuses the stack, Escape folds it. Reduced motion keeps the fades and drops the
 * movement.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import styles from './Sonner.module.css';
import { store, type ToastData, type ToastId, type ToastType } from './state';

export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToasterProps {
  /** Corner or edge the stack sits on. Defaults to "bottom-right". */
  position?: ToastPosition;
  /** Tints success, info, warning and error toasts by type. */
  richColors?: boolean;
  /** Shows the round close button on every toast. */
  closeButton?: boolean;
  /** Keeps the stack spread out instead of piled up. */
  expand?: boolean;
  /** How many toasts show at once; older ones fade out. Defaults to 3. */
  visibleToasts?: number;
  /** Milliseconds before a toast closes itself. Defaults to 4000. */
  duration?: number;
  /** Space between toasts when spread out, in px. Defaults to 14. */
  gap?: number;
  /** Distance from the viewport edge, in px or any CSS length. Defaults to 24. */
  offset?: number | string;
  /** Distance from the viewport edge on screens 600px wide or less. Defaults to 16. */
  mobileOffset?: number | string;
  /** Keys that focus the stack. Defaults to alt+T (`['altKey', 'KeyT']`). */
  hotkey?: string[];
  /** Accessible name of the notifications region. The hotkey is appended. Defaults to "Notifications". */
  containerAriaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const TOAST_WIDTH = 356;
const SWIPE_THRESHOLD = 45;
const TIME_BEFORE_UNMOUNT = 200;

const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* Icons from the Figma "Sonner" set (20px and 24px grids, drawn at 16). */
const ICON_PATHS: Partial<Record<ToastType, { viewBox: string; d: string }>> = {
  success: { viewBox: '0 0 20 20', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z' },
  info: { viewBox: '0 0 20 20', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z' },
  warning: { viewBox: '0 0 24 24', d: 'M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z' },
  error: { viewBox: '0 0 20 20', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z' },
};

function TypeIcon({ type }: { type: ToastType }) {
  if (type === 'loading') {
    return (
      <span className={styles.spinner} aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={styles.spinnerBar} style={{ transform: `rotate(${i * 30 || 0.0001}deg) translate(146%)`, animationDelay: `${-1.2 + i * 0.1}s` }} />
        ))}
      </span>
    );
  }
  const p = ICON_PATHS[type];
  if (!p) return null;
  return (
    <svg viewBox={p.viewBox} width={16} height={16} fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d={p.d} />
    </svg>
  );
}

const CloseIcon = () => (
  <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M9 3L3 9M3 3l6 6" />
  </svg>
);

interface Height { id: ToastId; height: number }

interface ToastItemProps {
  toast: ToastData;
  index: number;
  count: number;
  expanded: boolean;
  expandByDefault: boolean;
  paused: boolean;
  heights: Height[];
  setHeights: React.Dispatch<React.SetStateAction<Height[]>>;
  removeToast: (toast: ToastData) => void;
  gap: number;
  visibleToasts: number;
  yPosition: 'top' | 'bottom';
  xPosition: 'left' | 'center' | 'right';
  closeButton: boolean;
  richColors: boolean;
  duration: number;
}

function ToastItem({
  toast, index, count, expanded, expandByDefault, paused, heights, setHeights, removeToast,
  gap, visibleToasts, yPosition, xPosition, closeButton, richColors, duration: toasterDuration,
}: ToastItemProps) {
  const [mounted, setMounted] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const [swipeOut, setSwipeOut] = useState(false);
  const [swipeOutDirection, setSwipeOutDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [offsetBeforeRemove, setOffsetBeforeRemove] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);
  const ref = useRef<HTMLLIElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const swipeAxis = useRef<'x' | 'y' | null>(null);
  const dragStartTime = useRef(0);
  const remaining = useRef(0);

  const isFront = index === 0;
  const isVisible = index + 1 <= visibleToasts;
  const dismissible = toast.dismissible !== false;
  const duration = toast.duration ?? toasterDuration;
  const rich = toast.richColors ?? richColors;
  const showClose = (toast.closeButton ?? closeButton) && toast.type !== 'loading';

  // Where this toast sits when the stack is spread out: the height of every newer toast plus the gaps.
  const heightIndex = heights.findIndex((h) => h.id === toast.id);
  const offset = useMemo(() => {
    const before = heights.reduce((sum, h, i) => (i >= heightIndex ? sum : sum + h.height), 0);
    return Math.max(0, heightIndex) * gap + before;
  }, [heights, heightIndex, gap]);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  // Measure the natural height on mount and whenever the content changes. Reading layout here also
  // commits the "below the edge, transparent" start state, so the entrance always animates.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = node.style.height;
    node.style.height = 'auto';
    const height = node.offsetHeight;
    node.style.height = previous;
    setInitialHeight(height);
    setHeights((hs) => (hs.some((h) => h.id === toast.id)
      ? hs.map((h) => (h.id === toast.id ? { ...h, height } : h))
      : [{ id: toast.id, height }, ...hs]));
  }, [toast.id, toast.version, setHeights]);

  useEffect(() => { setMounted(true); }, []);

  const deleteToast = useCallback(() => {
    setRemoved(true);
    setOffsetBeforeRemove(offsetRef.current);
    setHeights((hs) => hs.filter((h) => h.id !== toast.id));
    window.setTimeout(() => removeToast(toast), TIME_BEFORE_UNMOUNT);
  }, [toast, removeToast, setHeights]);

  // toast.dismiss() from outside
  useEffect(() => {
    if (toast.delete && !removed) { toast.onDismiss?.(toast); deleteToast(); }
  }, [toast, removed, deleteToast]);

  // Timer: restarts when the toast is updated, pauses while the stack is expanded, pressed or the tab is hidden.
  useEffect(() => { remaining.current = duration; }, [toast.version, duration]);
  useEffect(() => {
    if (removed || paused || toast.type === 'loading' || duration === Infinity) return;
    const start = Date.now();
    const id = window.setTimeout(() => { toast.onAutoClose?.(toast); deleteToast(); }, remaining.current);
    return () => { window.clearTimeout(id); remaining.current -= Date.now() - start; };
  }, [removed, paused, toast, duration, deleteToast]);

  const close = () => { if (!dismissible || removed) return; toast.onDismiss?.(toast); deleteToast(); };

  /* ---- swipe to dismiss ---- */
  const allowed = useMemo(() => {
    const d: ('top' | 'bottom' | 'left' | 'right')[] = [yPosition];
    if (xPosition !== 'center') d.push(xPosition);
    return d;
  }, [yPosition, xPosition]);
  const setSwipe = (x: number, y: number) => {
    ref.current?.style.setProperty('--swipe-amount-x', `${x}px`);
    ref.current?.style.setProperty('--swipe-amount-y', `${y}px`);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.button === 2 || !dismissible || removed) return;
    if ((e.target as HTMLElement).closest('button')) return;
    dragStartTime.current = Date.now();
    setOffsetBeforeRemove(offsetRef.current);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    setSwiping(true);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    swipeAxis.current = null;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    if (!pointerStart.current || !dismissible) return;
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    const dy = e.clientY - pointerStart.current.y;
    const dx = e.clientX - pointerStart.current.x;
    if (!swipeAxis.current && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) swipeAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    // Towards an allowed edge the toast follows the pointer; the other way it resists.
    const damp = (d: number) => d / (1.5 + Math.abs(d) / 20);
    let x = 0, y = 0;
    if (swipeAxis.current === 'y') y = (allowed.includes('top') && dy < 0) || (allowed.includes('bottom') && dy > 0) ? dy : damp(dy);
    else if (swipeAxis.current === 'x') x = (allowed.includes('left') && dx < 0) || (allowed.includes('right') && dx > 0) ? dx : damp(dx);
    if (x !== 0 || y !== 0) setSwiped(true);
    setSwipe(x, y);
  };

  const onPointerUp = () => {
    if (swipeOut || !dismissible || !pointerStart.current) return;
    pointerStart.current = null;
    const style = ref.current?.style;
    const x = parseFloat(style?.getPropertyValue('--swipe-amount-x') || '0') || 0;
    const y = parseFloat(style?.getPropertyValue('--swipe-amount-y') || '0') || 0;
    const amount = swipeAxis.current === 'x' ? x : y;
    const velocity = Math.abs(amount) / Math.max(1, Date.now() - dragStartTime.current);
    const towardsEdge = swipeAxis.current === 'x'
      ? (amount < 0 && allowed.includes('left')) || (amount > 0 && allowed.includes('right'))
      : (amount < 0 && allowed.includes('top')) || (amount > 0 && allowed.includes('bottom'));
    if (towardsEdge && (Math.abs(amount) >= SWIPE_THRESHOLD || velocity > 0.11)) {
      setOffsetBeforeRemove(offsetRef.current);
      toast.onDismiss?.(toast);
      setSwipeOutDirection(swipeAxis.current === 'x' ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'));
      deleteToast();
      setSwipeOut(true);
      return;
    }
    setSwipe(0, 0);
    setSwiped(false);
    setSwiping(false);
    swipeAxis.current = null;
  };

  const isExpanded = expanded || (expandByDefault && mounted);
  const icon = toast.icon === null ? null : toast.icon ?? <TypeIcon type={toast.type} />;
  const hasIcon = icon !== null && (toast.icon !== undefined || toast.type !== 'default');

  return (
    <li
      ref={ref}
      tabIndex={0}
      role="status"
      aria-live={toast.important || toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cx(styles.toast, toast.className)}
      data-mounted={mounted}
      data-removed={removed}
      data-visible={isVisible}
      data-front={isFront}
      data-expanded={isExpanded}
      data-y-position={yPosition}
      data-x-position={xPosition}
      data-type={toast.type}
      data-rich-colors={rich}
      data-dismissible={dismissible}
      data-swiping={swiping}
      data-swiped={swiped}
      data-swipe-out={swipeOut}
      data-swipe-direction={swipeOutDirection ?? undefined}
      style={{
        '--index': index,
        '--toasts-before': index,
        '--z-index': count - index,
        '--offset': `${removed ? offsetBeforeRemove : offset}px`,
        '--initial-height': expandByDefault ? 'auto' : `${initialHeight}px`,
      } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(e) => { if (e.key === 'Delete' || e.key === 'Backspace') close(); }}
    >
      {showClose && (
        <button type="button" className={styles.close} aria-label="Close notification" disabled={!dismissible} onClick={close}>
          <CloseIcon />
        </button>
      )}
      {hasIcon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <div className={styles.title}>{toast.title}</div>
        {toast.description && <div className={styles.description}>{toast.description}</div>}
      </div>
      {toast.cancel && (
        <button
          type="button"
          className={cx(styles.button, styles.cancel)}
          onClick={(e) => { toast.cancel?.onClick?.(e); if (dismissible) close(); }}
        >
          {toast.cancel.label}
        </button>
      )}
      {toast.action && (
        <button
          type="button"
          className={styles.button}
          onClick={(e) => { toast.action?.onClick(e); if (!e.defaultPrevented) deleteToast(); }}
        >
          {toast.action.label}
        </button>
      )}
    </li>
  );
}

export const Toaster: React.FC<ToasterProps> = ({
  position = 'bottom-right',
  richColors = false,
  closeButton = false,
  expand = false,
  visibleToasts = 3,
  duration = 4000,
  gap = 14,
  offset = 24,
  mobileOffset = 16,
  hotkey = ['altKey', 'KeyT'],
  containerAriaLabel = 'Notifications',
  className,
  style,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>(() => store.active());
  const [heights, setHeights] = useState<Height[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const [yPosition, xPosition] = position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];

  useEffect(() => store.subscribe((event) => {
    if (event.kind === 'upsert') {
      setToasts((ts) => (ts.some((t) => t.id === event.toast.id)
        ? ts.map((t) => (t.id === event.toast.id ? event.toast : t))
        : [event.toast, ...ts]));
    } else {
      setToasts((ts) => ts.map((t) => (event.id === undefined || t.id === event.id ? { ...t, delete: true } : t)));
    }
  }), []);

  const removeToast = useCallback((t: ToastData) => {
    store.remove(t.id);
    setToasts((ts) => ts.filter((x) => x.id !== t.id));
  }, []);

  useEffect(() => { if (toasts.length <= 1) setExpanded(false); }, [toasts.length]);

  useEffect(() => {
    const onVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const pressed = hotkey.length > 0 && hotkey.every((k) => (e as unknown as Record<string, unknown>)[k] === true || e.code === k);
      if (pressed) { setExpanded(true); listRef.current?.focus(); }
      if (e.key === 'Escape' && listRef.current && (document.activeElement === listRef.current || listRef.current.contains(document.activeElement))) {
        setExpanded(false);
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hotkey]);

  // ['altKey', 'KeyT'] -> "alt+T"
  const hotkeyLabel = hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, '');

  return (
    <section aria-label={`${containerAriaLabel} ${hotkeyLabel}`} tabIndex={-1} aria-live="polite" aria-relevant="additions text" aria-atomic="false">
      {toasts.length > 0 && (
        <ol
          ref={listRef}
          tabIndex={-1}
          className={cx(styles.toaster, className)}
          data-y-position={yPosition}
          data-x-position={xPosition}
          style={{
            '--front-toast-height': `${heights[0]?.height ?? 0}px`,
            '--width': `${TOAST_WIDTH}px`,
            '--gap': `${gap}px`,
            '--offset-top': px(offset), '--offset-right': px(offset), '--offset-bottom': px(offset), '--offset-left': px(offset),
            '--mobile-offset-top': px(mobileOffset), '--mobile-offset-right': px(mobileOffset), '--mobile-offset-bottom': px(mobileOffset), '--mobile-offset-left': px(mobileOffset),
            ...style,
          } as React.CSSProperties}
          onMouseEnter={() => setExpanded(true)}
          onMouseMove={() => setExpanded(true)}
          onMouseLeave={() => { if (!interacting) setExpanded(false); }}
          onFocus={() => setExpanded(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExpanded(false); }}
          onPointerDown={(e) => { if ((e.target as HTMLElement).dataset?.dismissible === 'false') return; setInteracting(true); }}
          onPointerUp={() => setInteracting(false)}
        >
          {toasts.map((t, index) => (
            <ToastItem
              key={t.id}
              toast={t}
              index={index}
              count={toasts.length}
              expanded={expanded}
              expandByDefault={expand}
              paused={expanded || interacting || documentHidden}
              heights={heights}
              setHeights={setHeights}
              removeToast={removeToast}
              gap={gap}
              visibleToasts={visibleToasts}
              yPosition={yPosition}
              xPosition={xPosition}
              closeButton={closeButton}
              richColors={richColors}
              duration={duration}
            />
          ))}
        </ol>
      )}
    </section>
  );
};

export default Toaster;
