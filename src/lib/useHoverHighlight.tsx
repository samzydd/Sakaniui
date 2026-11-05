/**
 * Flowing hover highlight: one element that glides between the items of a
 * group instead of each item fading its own background in and out.
 *
 * The container spreads `groupProps` and renders `highlight` as its first
 * child; items opt in with a `data-hover-item` attribute. Items are found by
 * event delegation, so a container doesn't need to know how its children
 * are built (Sidebar, for instance, only receives `children`).
 *
 * - An item's own border-radius is copied onto the highlight.
 * - `--hover-tone` on an item overrides the highlight color for that item
 *   (e.g. a destructive menu item).
 * - `data-hover-item="off"`, `aria-disabled="true"` or `disabled` hides it.
 * - The container must be positioned (position: relative/absolute/fixed).
 */

import React from 'react';
import styles from './HoverHighlight.module.css';

interface Box { x: number; y: number; w: number; h: number; radius: string; tone: string }

// Transitions on these properties can move or resize an item.
const LAYOUT_PROP = /height|width|grid-template|padding|margin|^(top|bottom|left|right|inset)|gap|flex/;

const isOff = (el: HTMLElement) =>
  el.getAttribute('data-hover-item') === 'off' ||
  el.getAttribute('aria-disabled') === 'true' ||
  (el as HTMLButtonElement).disabled === true;

// offsetTop/Left (not getBoundingClientRect) so a container mid scale-in
// animation, like an opening menu, doesn't skew the measurement.
function measure(item: HTMLElement, container: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let el: HTMLElement | null = item;
  while (el && el !== container) {
    x += el.offsetLeft;
    y += el.offsetTop;
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) break;
    if (parent !== container) { x += parent.clientLeft; y += parent.clientTop; }
    el = parent;
  }
  // offsetTop ignores scrolling; the highlight lives in the container's own
  // scrolled content, so only scrollers strictly in between need removing.
  for (let p = item.parentElement; p && p !== container; p = p.parentElement) {
    x -= p.scrollLeft;
    y -= p.scrollTop;
  }
  const cs = getComputedStyle(item);
  return {
    x, y, w: item.offsetWidth, h: item.offsetHeight,
    radius: cs.borderRadius,
    tone: cs.getPropertyValue('--hover-tone').trim(),
  };
}

export function useHoverHighlight<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T | null>(null);
  // Callback ref, so a container that mounts later (a dropdown panel, a table
  // leaving stacked mode) still gets the resize/scroll listeners below.
  const [node, setNode] = React.useState<T | null>(null);
  const setRef = React.useCallback((el: T | null) => { ref.current = el; setNode(el); }, []);
  const current = React.useRef<HTMLElement | null>(null);
  const shown = React.useRef(false);
  const el = React.useRef<HTMLSpanElement>(null);
  const arming = React.useRef(false);
  const seen = React.useRef<HTMLElement | null>(null);
  const [box, setBox] = React.useState<Box | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [glide, setGlide] = React.useState(false);

  const hide = React.useCallback(() => {
    shown.current = false;
    current.current = null;
    arming.current = false;
    setVisible(false);
  }, []);

  const show = React.useCallback((item: HTMLElement) => {
    const container = ref.current;
    if (!container) return;
    // A remounted container (a dropdown panel reopening) starts fresh rather
    // than gliding in from where the last one's highlight was.
    if (container !== seen.current) { seen.current = container; shown.current = false; }
    current.current = item;
    const next = measure(item, container);
    if (shown.current) { setBox(next); return; }
    shown.current = true;
    arming.current = true;
    setGlide(false);
    setBox(next);
    setVisible(true);
  }, []);

  // The jump into place has to reach the style system once without a
  // transition, or switching the transition on would animate that jump. A
  // forced style read does that synchronously, before paint, so gliding is
  // on from the very next move regardless of frame rate.
  React.useLayoutEffect(() => {
    if (!arming.current || glide || !visible) return;
    arming.current = false;
    if (el.current) getComputedStyle(el.current).transform;
    setGlide(true);
  }, [box, visible, glide]);

  const onMouseOver = React.useCallback((e: React.MouseEvent) => {
    const container = ref.current;
    if (!container) return;
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-hover-item]');
    // In a gap between items, or inside a nested group: leave it where it is.
    if (!item || item.closest('[data-hover-group]') !== container) return;
    if (isOff(item)) { hide(); return; }
    if (item !== current.current) show(item);
  }, [hide, show]);

  React.useEffect(() => {
    const container = node;
    if (!container) return undefined;
    const remeasure = () => {
      const item = current.current;
      if (!item || !shown.current) return;
      if (!container.contains(item)) { hide(); return; }
      setBox(measure(item, container));
    };
    const ro = new ResizeObserver(remeasure);
    ro.observe(container);
    container.addEventListener('scroll', remeasure, true);

    // While something inside the group is animating its size (a collapsible
    // opening above the current item, a row growing), the item moves every
    // frame but nothing here resizes, so a single measure goes stale and the
    // highlight is left behind. Follow the item frame by frame for as long as
    // such a transition or animation runs, with the glide switched off so it
    // sticks to the item instead of chasing it.
    let until = 0;
    let raf = 0;
    const follow = () => {
      raf = 0;
      const item = current.current;
      const hl = el.current;
      if (!item || !hl || !shown.current || !container.contains(item)) { hl?.classList.remove(styles.track); return; }
      const b = measure(item, container);
      hl.style.transform = `translate(${b.x}px, ${b.y}px)`;
      hl.style.width = `${b.w}px`;
      hl.style.height = `${b.h}px`;
      if (performance.now() < until) { raf = requestAnimationFrame(follow); return; }
      hl.classList.remove(styles.track);
      setBox(b);
    };
    const ms = (v: string) => Math.max(0, ...v.split(',').map((t) => (t.trim().endsWith('ms') ? parseFloat(t) : parseFloat(t) * 1000) || 0));
    const arm = (target: Element, time: number) => {
      if (target === el.current || !shown.current) return;
      until = Math.max(until, performance.now() + time + 60);
      if (!raf) { el.current?.classList.add(styles.track); raf = requestAnimationFrame(follow); }
    };
    const onTransition = (e: Event) => {
      const te = e as TransitionEvent;
      if (!LAYOUT_PROP.test(te.propertyName)) return;
      const cs = getComputedStyle(te.target as Element);
      arm(te.target as Element, ms(cs.transitionDuration) + ms(cs.transitionDelay));
    };
    const onAnimation = (e: Event) => {
      const cs = getComputedStyle(e.target as Element);
      if (cs.animationIterationCount.includes('infinite')) return;
      arm(e.target as Element, ms(cs.animationDuration) + ms(cs.animationDelay));
    };
    container.addEventListener('transitionrun', onTransition);
    container.addEventListener('animationstart', onAnimation);
    return () => {
      ro.disconnect();
      container.removeEventListener('scroll', remeasure, true);
      container.removeEventListener('transitionrun', onTransition);
      container.removeEventListener('animationstart', onAnimation);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [node, hide]);

  const highlight = (
    <span
      ref={el}
      aria-hidden="true"
      className={[styles.highlight, visible ? styles.visible : '', glide ? styles.glide : ''].filter(Boolean).join(' ')}
      style={box ? {
        transform: `translate(${box.x}px, ${box.y}px)`,
        width: box.w,
        height: box.h,
        borderRadius: box.radius,
        background: box.tone || undefined,
      } : undefined}
    />
  );

  // For lists where the keyboard also moves the active item (autocompletes):
  // drive the highlight directly instead of spreading groupProps.
  const showItem = React.useCallback((item: HTMLElement | null) => {
    if (item && !isOff(item)) show(item); else hide();
  }, [hide, show]);

  return {
    ref: setRef,
    groupProps: { 'data-hover-group': '', onMouseOver, onMouseLeave: hide },
    highlight,
    showItem,
  };
}

export interface HoverGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Wraps any set of `data-hover-item` children (ListItem, MenuItem, ...)
 *  in a flowing hover group, for compositions with no container of their own. */
export const HoverGroup: React.FC<HoverGroupProps> = ({ children, style, ...rest }) => {
  const { ref, groupProps, highlight } = useHoverHighlight<HTMLDivElement>();
  return (
    <div ref={ref} {...rest} {...groupProps} style={{ position: 'relative', ...style }}>
      {highlight}
      {children}
    </div>
  );
};
