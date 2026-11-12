/**
 * ReasoningTrace
 *
 * The thinking panel above a reply. Matches Figma "Reasoning Trace": State Streaming | Open | Closed.
 *
 *   streaming  a ray spinner turns, the "Thinking" label shimmers and the seconds count. The reasoning streams in quietly
 *              (13/20 regular, fg/muted) word by word: each new word fades up out of a soft blur, a touch brighter, then settles
 *              into the muted ink. The text sits in a short window (five lines) that grows smoothly, then glides up as new text
 *              arrives, the oldest line fading out under a soft top edge. Always open.
 *   done       the spinner becomes a brain and the label reads "Thought for 6s". Closed it shows `summary` on the same row and
 *              a chevron pointing right; open, the full reasoning folds down (320ms) and the chevron turns to point down.
 *
 * A hairline rail runs under the spinner's centre and the text lines up with the label, so the panel reads as one column.
 *
 * Pass the reasoning as children, one paragraph each (a string or a <p> of text). Append as it arrives: a whole paragraph,
 * or the same paragraph growing word by word; only the new words animate. Then switch `status` to "done" with the final
 * `elapsed`. Reduced motion: no shimmer, word reveal or glide; the window still holds the newest lines.
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
  /** The reasoning, one paragraph per child. */
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** The streaming window: five 20px lines. */
const WINDOW = 100;
/** Stagger between words that arrive together (a whole paragraph at once). */
const WORD_STAGGER = 26;

const seconds = (s: number | undefined) => (s === undefined ? '' : `${Math.max(0, Math.floor(s))}s`);

/** The plain text of a paragraph child, or null when it is richer than text (then it is rendered as given). */
const textOf = (node: React.ReactNode): string | null => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.type === 'p') {
    const parts = React.Children.toArray(node.props.children);
    if (parts.every((p) => typeof p === 'string' || typeof p === 'number')) return parts.join('');
  }
  return null;
};

/** One word. Its reveal delay is fixed when it mounts, so later renders never restart or shift it. */
const Word: React.FC<{ delay: number; children: string }> = ({ delay, children }) => {
  const [d] = React.useState(delay);
  return <span className={styles.word} style={d ? { animationDelay: `${d}ms` } : undefined}>{children}</span>;
};

/** A paragraph split into words. Words already shown keep their spans (append-only keys); new ones are staggered from 0. */
const Paragraph: React.FC<{ text: string }> = ({ text }) => {
  const shown = React.useRef(0);
  const base = shown.current;
  const parts = text.split(/(\s+)/).filter(Boolean);
  let n = 0;
  const out = parts.map((part, i) => {
    if (/^\s+$/.test(part)) return part;
    const idx = n++;
    return <Word key={i} delay={Math.max(0, idx - base) * WORD_STAGGER}>{part}</Word>;
  });
  React.useLayoutEffect(() => { shown.current = n; });
  return <p>{out}</p>;
};

export const ReasoningTrace: React.FC<ReasoningTraceProps> = ({
  status = 'done', elapsed, summary, children, open, defaultOpen = false, onOpenChange, className,
}) => {
  const [inner, setInner] = React.useState(defaultOpen);
  const streaming = status === 'streaming';
  const isOpen = streaming ? true : (open !== undefined ? open : inner);
  const toggle = () => { if (streaming) return; const next = !isOpen; if (open === undefined) setInner(next); onOpenChange?.(next); };
  const id = React.useId();

  const items = React.Children.toArray(children);
  const paragraphs = items.map((c, i) => {
    const text = textOf(c);
    return text !== null ? <Paragraph key={i} text={text} /> : c;
  });

  // measure the text so the window can grow to it and glide up once it is taller than five lines
  const linesRef = React.useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = linesRef.current;
    if (!el) return;
    const measure = () => setContentH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // the window holds while streaming and while closed, so when thinking ends it folds away as it was, without first
  // springing open to the full text; opened later, the full reasoning shows
  const windowed = streaming || !isOpen;
  const overflow = windowed ? Math.max(0, contentH - WINDOW) : 0;
  const viewportStyle: React.CSSProperties | undefined = windowed ? { height: Math.min(contentH, WINDOW) } : undefined;
  const linesStyle: React.CSSProperties | undefined = windowed ? { transform: `translateY(${-overflow}px)` } : undefined;

  return (
    <div
      className={[styles.root, streaming ? styles['root--streaming'] : '', windowed ? styles['root--windowed'] : '', className ?? ''].filter(Boolean).join(' ')}
      data-open={isOpen || undefined}
      data-empty={items.length === 0 || undefined}
    >
      <button type="button" className={styles.header} onClick={toggle} aria-expanded={isOpen} aria-controls={id} disabled={streaming}>
        <span className={styles.label}>
          <span className={styles.icon}>
            {streaming ? <RayLoader size={16} beat /> : <IconBrain size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />}
          </span>
          <span className={[styles.title, streaming ? styles['title--shimmer'] : ''].filter(Boolean).join(' ')}>
            {streaming ? 'Thinking' : `Thought${elapsed !== undefined ? ` for ${seconds(elapsed)}` : ''}`}
          </span>
          {streaming && elapsed !== undefined && <span className={styles.elapsed}>{seconds(elapsed)}</span>}
          {!streaming && !isOpen && summary && <span className={styles.summary}>{summary}</span>}
        </span>
        {!streaming && (
          <span className={styles.chevron} aria-hidden="true">
            {isOpen ? <IconChevronDown size={16} strokeWidth={iconStrokeWidth(16)} /> : <IconChevronRight size={16} strokeWidth={iconStrokeWidth(16)} />}
          </span>
        )}
      </button>
      <div id={id} className={styles.panel} role="region" aria-label="Reasoning" aria-live={streaming ? 'polite' : undefined}>
        <div className={styles.panel__inner}>
          <div className={styles.body}>
            <span className={styles.rail} aria-hidden="true" />
            <div className={styles.viewport} style={viewportStyle} data-overflow={overflow > 0 || undefined}>
              <div ref={linesRef} className={styles.lines} style={linesStyle}>{paragraphs}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReasoningTrace;
