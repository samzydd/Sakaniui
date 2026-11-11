/**
 * ThinkingLoader
 *
 * The status pill of an AI that is working: a ray spinner and a label whose text shimmers, in a 1px-bordered full-radius pill.
 * Matches Figma "Thinking Loader". Change `label` as the work moves on ("Thinking", "Searching the web", "Writing response"):
 * the old text fades out, the new one fades in with a soft blur, and the pill grows or shrinks to fit (260ms).
 *
 * It is presentational: you decide the label from what your model is doing. `role="status"` announces each new label politely.
 * Reduced motion: the spinner and shimmer stop, the label changes without the fade and the pill resizes instantly.
 */

import React from 'react';
import { RayLoader } from '../../lib/RayLoader';
import styles from './ThinkingLoader.module.css';

export interface ThinkingLoaderProps {
  /** What it is doing. Default "Thinking". */
  label?: string;
  className?: string;
}

export const ThinkingLoader: React.FC<ThinkingLoaderProps> = ({ label = 'Thinking', className }) => {
  const inner = React.useRef<HTMLSpanElement>(null);
  const [width, setWidth] = React.useState<number | undefined>(undefined);
  // the pill follows the text's own width, so a longer label opens it and a shorter one closes it
  React.useLayoutEffect(() => {
    if (inner.current) setWidth(inner.current.offsetWidth);
  }, [label]);

  return (
    <div className={[styles.root, className ?? ''].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <RayLoader size={16} />
      <span className={styles.text} style={width !== undefined ? { width } : undefined}>
        <span key={label} ref={inner} className={styles.label}>{label}</span>
      </span>
    </div>
  );
};

export default ThinkingLoader;
