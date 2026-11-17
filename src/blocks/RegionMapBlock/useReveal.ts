import React from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 0 -> 1 once, after `delay` ms, over `duration` ms with an ease-out. Drives a bar and a counting figure from the same
 * number so they stay in step. `enabled: false` (or reduced motion) returns 1 straight away.
 */
export function useReveal(delay = 0, duration = 900, enabled = true): number {
  const reduced = useReducedMotion();
  const off = reduced || !enabled;
  const [p, setP] = React.useState(off ? 1 : 0);
  React.useEffect(() => {
    if (off) {
      setP(1);
      return undefined;
    }
    let raf = 0;
    const t = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / duration);
        setP(easeOutCubic(k));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [off, delay, duration]);
  return p;
}
