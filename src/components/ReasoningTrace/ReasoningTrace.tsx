/**
 * ReasoningTrace
 *
 * The thinking panel above a reply. Matches Figma "Reasoning Trace": State Streaming | Open | Closed.
 *
 *   streaming  a ray spinner turns, the "Thinking" label shimmers, the seconds count, and each new line clears a soft 6px blur
 *              (180ms) with a slate caret at the write frontier. Always open.
 *   done       the ring closes into a brain, the label reads "Thought for 6s". Closed it shows `summary` on the same row and
 *              a chevron pointing right; open, the lines fold down (320ms) and the chevron turns to point down (240ms).
 *
 * Pass the reasoning as children, one paragraph per line (a string, or <p>s). `open` / `defaultOpen` / `onOpenChange` control it
 * once done. It is presentational: you append lines as they arrive, then switch `status` to "done" with the final `elapsed`.
 * Reduced motion: no ring, shimmer or blur, and it folds instantly.
 */

import React from 'react';
import { IconBrain } from '../../icons/outline/brain';
import { IconChevronDown } from '../../icons/outline/chevron-down';
import { IconChevronRight } from '../../icons/outline/chevron-right';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { RayLoader } from '../../lib/RayLoader';
import styles from './ReasoningTrace.module.css';

export type ReasoningTraceStatus = 'streaming' | 'done';

export interface ReasoningTraceProps {
  status?: ReasoningTraceStatus;
  /** Seconds. Streaming: the running time; done: the final time ("Thought for 6s"). */
  elapsed?: number;
  /** One line about what it concluded, shown on the closed row. */
  summary?: string;
  /** The reasoning, one paragraph per line. */
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const fmt = (s: number | undefined, decimals: number) => (s === undefined ? '' : `${s.toFixed(decimals).replace(/\.0$/, '')}s`);

export const ReasoningTrace: React.FC<ReasoningTraceProps> = ({
  status = 'done', elapsed, summary, children, open, defaultOpen = false, onOpenChange, className,
}) => {
  const [inner, setInner] = React.useState(defaultOpen);
  const streaming = status === 'streaming';
  const isOpen = streaming ? true : (open !== undefined ? open : inner);
  const toggle = () => { if (streaming) return; const next = !isOpen; if (open === undefined) setInner(next); onOpenChange?.(next); };
  const id = React.useId();
  const lines = React.Children.toArray(children).map((c, i) => (typeof c === 'string' || typeof c === 'number' ? <p key={i}>{c}</p> : c));

  return (
    <div className={[styles.root, streaming ? styles['root--streaming'] : '', className ?? ''].filter(Boolean).join(' ')} data-open={isOpen || undefined}>
      <button type="button" className={styles.header} onClick={toggle} aria-expanded={isOpen} aria-controls={id} disabled={streaming}>
        <span className={styles.label}>
          {streaming ? <RayLoader size={16} /> : <IconBrain size={16} strokeWidth={iconStrokeWidth(16)} className={styles.brain} aria-hidden="true" />}
          <span className={[styles.title, streaming ? styles['title--shimmer'] : ''].filter(Boolean).join(' ')}>
            {streaming ? 'Thinking' : `Thought${elapsed !== undefined ? ` for ${fmt(elapsed, 0)}` : ''}`}
          </span>
          {streaming && elapsed !== undefined && <span className={styles.elapsed}>{fmt(elapsed, 1)}</span>}
          {!streaming && !isOpen && summary && <span className={styles.summary}>{summary}</span>}
        </span>
        {!streaming && (
          <span className={styles.chevron} aria-hidden="true">
            {isOpen ? <IconChevronDown size={16} strokeWidth={iconStrokeWidth(16)} /> : <IconChevronRight size={16} strokeWidth={iconStrokeWidth(16)} />}
          </span>
        )}
        {streaming && <span className={styles.chevron} aria-hidden="true"><IconChevronDown size={16} strokeWidth={iconStrokeWidth(16)} /></span>}
      </button>
      <div id={id} className={styles.panel} role="region" aria-label="Reasoning">
        <div className={styles.panel__inner}>
          <div className={styles.lines}>{lines}</div>
        </div>
      </div>
    </div>
  );
};

export default ReasoningTrace;
