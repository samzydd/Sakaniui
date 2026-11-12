/**
 * ThinkingLoader
 *
 * The status pill of an AI that is working: a ray spinner and a label whose text shimmers, in a 1px-bordered full-radius pill.
 * The spinner beats once per shimmer lap, as the pale band is about to enter the label again, as if it pushed the band out.
 * Matches Figma "Thinking Loader". Change `label` as the work moves on ("Thinking", "Searching the web", "Writing response"):
 * the old text fades out, the new one fades in with a soft blur, and the pill grows or shrinks to fit (260ms).
 *
 * It is presentational: you decide the label from what your model is doing. `role="status"` announces each new label politely.
 * Reduced motion: the spinner and shimmer stop, the label changes without the fade and the pill resizes instantly.
 */

import React from 'react';
import { RayLoader } from '../../lib/RayLoader';
import styles from './ThinkingLoader.module.css';

/** One shimmer lap and one beat, in ms (the CSS animations are 1.6s). */
const LAP = 1600;

export interface ThinkingLoaderProps {
  /** What it is doing. Default "Thinking". */
  label?: string;
  className?: string;
}

export const ThinkingLoader: React.FC<ThinkingLoaderProps> = ({ label = 'Thinking', className }) => {
  const inner = React.useRef<HTMLSpanElement | null>(null);
  // The spinner's beat runs from mount and never restarts; a new label restarts its shimmer, so each new label element is given a
  // delay that rejoins the lap. It is set when the element mounts (a ref callback), never while rendering, so the server and the
  // first client render agree and there is no hydration mismatch.
  const epoch = React.useRef<number | null>(null);
  const labelRef = React.useCallback((el: HTMLSpanElement | null) => {
    inner.current = el;
    if (!el) return;
    const now = performance.now();
    if (epoch.current === null) epoch.current = now;
    el.style.animationDelay = `${-((now - epoch.current) % LAP)}ms, 0ms`;
  }, []);
  const [width, setWidth] = React.useState<number | undefined>(undefined);
  // the pill follows the text's own width, so a longer label opens it and a shorter one closes it
  React.useLayoutEffect(() => {
    if (inner.current) setWidth(inner.current.offsetWidth);
  }, [label]);

  return (
    <div className={[styles.root, className ?? ''].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <RayLoader size={16} beat />
      <span className={styles.text} style={width !== undefined ? { width } : undefined}>
        <span key={label} ref={labelRef} className={styles.label}>{label}</span>
      </span>
    </div>
  );
};

export default ThinkingLoader;
