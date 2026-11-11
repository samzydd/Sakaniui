/**
 * ChatOrb
 *
 * The AI's face: a soft white sphere with two black eyes. It is the assistant avatar in AiMessage and can stand alone as a chat
 * launcher or greeter.
 *
 *   look    the eyes turn toward the pointer anywhere on the page, travelling a little further the further away it is, and
 *           narrowing a touch as they near the edge so they seem to wrap around the ball. They ease (140ms), never snap.
 *   blink   every 3 to 6 seconds both eyes close to a dash for about 140ms.
 *
 * Decorative by default (aria-hidden): the message text beside it carries the meaning. Pass `label` to expose it as an image.
 * Reduced motion, `look={false}` and touch with no pointer: the eyes rest straight ahead. `blink={false}` turns blinking off.
 * Sized by `size` (px); everything inside scales with it.
 */

import React from 'react';
import styles from './ChatOrb.module.css';

export interface ChatOrbProps {
  /** Diameter in px. Default 28 (the AiMessage avatar). */
  size?: number;
  /** The eyes follow the pointer. Default true. */
  look?: boolean;
  /** The eyes blink now and then. Default true. */
  blink?: boolean;
  /** Accessible name. Omit for a decorative orb. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** How far (as a share of the diameter) the eyes can travel from centre, sideways and up/down. */
const REACH_X = 0.13;
const REACH_Y = 0.07;
/** Pointer distance (in orb diameters) at which the eyes are fully turned. */
const FULL_TURN = 4;

export const ChatOrb: React.FC<ChatOrbProps> = ({ size = 28, look = true, blink = true, label, className, style }) => {
  const root = React.useRef<HTMLSpanElement>(null);
  const eyes = React.useRef<HTMLSpanElement>(null);

  // eyes follow the pointer: written straight to CSS variables, so no re-render per move
  React.useEffect(() => {
    const el = root.current;
    const g = eyes.current;
    if (!look || !el || !g) return;
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last: { x: number; y: number } | null = null;
    const apply = () => {
      raf = 0;
      if (!last) return;
      const r = el.getBoundingClientRect();
      const dx = last.x - (r.left + r.width / 2);
      const dy = last.y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dist / (r.width * FULL_TURN));   // 0 right on it, 1 far away
      const ux = (dx / dist) * k;
      const uy = (dy / dist) * k;
      g.style.setProperty('--ox', `${(ux * REACH_X).toFixed(4)}`);
      g.style.setProperty('--oy', `${(uy * REACH_Y).toFixed(4)}`);
      g.style.setProperty('--squeeze', `${(1 - Math.abs(ux) * 0.1).toFixed(3)}`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      last = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => { last = null; g.style.removeProperty('--ox'); g.style.removeProperty('--oy'); g.style.removeProperty('--squeeze'); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [look]);

  // blink: close for ~140ms at a random 3 to 6s interval (a quick double blink now and then)
  const [closed, setClosed] = React.useState(false);
  React.useEffect(() => {
    if (!blink || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t: number;
    const schedule = () => {
      t = window.setTimeout(() => {
        setClosed(true);
        t = window.setTimeout(() => {
          setClosed(false);
          if (Math.random() < 0.2) { t = window.setTimeout(() => { setClosed(true); t = window.setTimeout(() => { setClosed(false); schedule(); }, 120); }, 160); }
          else schedule();
        }, 140);
      }, 3000 + Math.random() * 3000);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, [blink]);

  return (
    <span
      ref={root}
      className={[styles.orb, className ?? ''].filter(Boolean).join(' ')}
      style={{ width: size, height: size, ...style }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <span ref={eyes} className={styles.eyes} data-closed={closed || undefined}>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
    </span>
  );
};

export default ChatOrb;
