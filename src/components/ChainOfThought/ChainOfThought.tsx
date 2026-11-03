/**
 * ChainOfThought / ChainOfThoughtStep / SourceStack / WorkingIndicator
 *
 * An agent's visible work: the steps it took, what each found, and a live
 * "Working" line. Matches the Figma "Chain of Thought" page:
 *   Chain of Thought         Open | Closed; a header (icon, title, chevron), a
 *                            Steps slot joined by a rail, and an optional Working indicator
 *   Chain of Thought Step    Status pending | active | done; an icon, a label, an optional
 *                            monospace query and result count, and an optional Sources row
 *   Source Stack             3 to 5 overlapping site-icon chips (Source Chip, 18px)
 *   Working Indicator        Working (sparkle, "Working", elapsed) | Done ("Worked for 11s")
 *
 * Done steps read muted and the active one reads in full, so the eye lands on what is
 * happening now. The tree rail (a 1px border/default line with an elbow into each icon)
 * stops at the last step by itself. While working, the label shimmers; reduced motion
 * keeps it still.
 *
 * The component is presentational: you feed it steps as your agent produces them
 * (append a ChainOfThoughtStep, flip the previous one to "done"). `status="working"` plus
 * `startedAt` makes the elapsed time tick on its own.
 */

import React from 'react';
import { IconSearch as Search } from '../../icons/outline/search';
import { IconSparkles as Sparkles } from '../../icons/outline/sparkles';
import { IconCircleCheck as CircleCheck } from '../../icons/outline/circle-check';
import { IconChevronDown as ChevronDown } from '../../icons/outline/chevron-down';
import { IconWorld as World } from '../../icons/outline/world';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import type { IconComponent } from '../../icons/types';
import styles from './ChainOfThought.module.css';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** 6.5 -> "6.5s", 72 -> "1m 12s". */
function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

/* ------------------------------------------------------------------ */
/* WorkingIndicator                                                    */
/* ------------------------------------------------------------------ */

export interface WorkingIndicatorProps {
  /** "working" shows a sparkle and a shimmering label; "done" shows a check. Defaults to "working". */
  status?: 'working' | 'done';
  /** Replaces the default label ("Working" / "Worked for"). */
  label?: string;
  /** Elapsed seconds. Takes precedence over startedAt. */
  elapsed?: number;
  /** Epoch ms when the work started; while "working" the time ticks on its own. */
  startedAt?: number;
  className?: string;
}

export const WorkingIndicator: React.FC<WorkingIndicatorProps> = ({
  status = 'working', label, elapsed, startedAt, className,
}) => {
  const working = status === 'working';
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!working || startedAt == null || elapsed != null) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [working, startedAt, elapsed]);

  const seconds = elapsed ?? (startedAt != null ? Math.max(0, (now - startedAt) / 1000) : undefined);
  const Icon = working ? Sparkles : CircleCheck;
  return (
    <div className={cx(styles.indicator, working && styles['indicator--working'], className)} role="status">
      <Icon className={styles.indicator__icon} size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
      <span className={styles.indicator__label}>{label ?? (working ? 'Working' : 'Worked for')}</span>
      {seconds != null && (
        // the timer changes every 100ms: keep it out of the live region while working
        <span className={styles.indicator__time} aria-hidden={working || undefined}>{formatElapsed(seconds)}</span>
      )}
    </div>
  );
};
WorkingIndicator.displayName = 'WorkingIndicator';

/* ------------------------------------------------------------------ */
/* SourceStack                                                         */
/* ------------------------------------------------------------------ */

export interface SourceStackSource {
  /** The site's name, e.g. "Reddit". Read out and shown as a tooltip. */
  label: string;
  /** A brand or generic icon, drawn at 10px. Defaults to a globe. */
  icon?: IconComponent;
}

export interface SourceStackProps {
  /** The sources, in order. Three to five read best. */
  sources: SourceStackSource[];
  className?: string;
}

export const SourceStack: React.FC<SourceStackProps> = ({ sources, className }) => (
  <ul className={cx(styles.stack, className)} aria-label={`${sources.length} source${sources.length === 1 ? '' : 's'}`}>
    {sources.map((s, i) => {
      const Icon = s.icon ?? World;
      return (
        <li key={`${s.label}-${i}`} className={styles.chip} title={s.label}>
          <Icon size={10} strokeWidth={iconStrokeWidth(10, 1)} aria-hidden="true" />
          <span className={styles.sr}>{s.label}</span>
        </li>
      );
    })}
  </ul>
);
SourceStack.displayName = 'SourceStack';

/* ------------------------------------------------------------------ */
/* ChainOfThoughtStep                                                  */
/* ------------------------------------------------------------------ */

export type ChainOfThoughtStepStatus = 'pending' | 'active' | 'done';

export interface ChainOfThoughtStepProps {
  /** pending (not started), active (in progress, read in full) or done (muted). Defaults to "done". */
  status?: ChainOfThoughtStepStatus;
  /** The step's icon, drawn at 16px. Defaults to a magnifier. */
  icon?: IconComponent;
  /** What happened, e.g. "Searched X for". */
  label: React.ReactNode;
  /** The query or argument, shown in monospace after the label. */
  query?: string;
  /** A result count on the right, e.g. "7 posts". */
  count?: React.ReactNode;
  /** A row under the step, usually a <SourceStack>. */
  sources?: React.ReactNode;
  /** Text before the sources. Defaults to "Sources". */
  sourcesLabel?: string;
  /** Makes the sources row a button with a chevron, so the sources can be opened. */
  onSourcesClick?: () => void;
  className?: string;
}

const STATUS_TEXT: Record<ChainOfThoughtStepStatus, string> = { pending: 'Pending: ', active: 'In progress: ', done: 'Done: ' };

export const ChainOfThoughtStep: React.FC<ChainOfThoughtStepProps> = ({
  status = 'done', icon, label, query, count, sources, sourcesLabel = 'Sources', onSourcesClick, className,
}) => {
  const Icon = icon ?? Search;
  const sourcesRow = (
    <>
      <span className={styles.step__sourcesLabel}>{sourcesLabel}</span>
      {sources}
      {onSourcesClick && <ChevronDown className={styles.step__sourcesChevron} size={12} strokeWidth={iconStrokeWidth(12)} aria-hidden="true" />}
    </>
  );
  return (
    <li className={cx(styles.step, styles[`step--${status}`], className)} aria-current={status === 'active' ? 'step' : undefined}>
      <div className={styles.step__row}>
        <Icon className={styles.step__icon} size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
        <span className={styles.step__content}>
          <span className={styles.sr}>{STATUS_TEXT[status]}</span>
          <span className={styles.step__label}>{label}</span>
          {query && <code className={styles.step__query}>{query}</code>}
        </span>
        {count != null && <span className={styles.step__count}>{count}</span>}
      </div>
      {sources && (
        onSourcesClick
          ? <button type="button" className={cx(styles.step__sources, styles['step__sources--button'])} onClick={onSourcesClick}>{sourcesRow}</button>
          : <div className={styles.step__sources}>{sourcesRow}</div>
      )}
    </li>
  );
};
ChainOfThoughtStep.displayName = 'ChainOfThoughtStep';

/* ------------------------------------------------------------------ */
/* ChainOfThought                                                      */
/* ------------------------------------------------------------------ */

export interface ChainOfThoughtProps {
  /** The header text, e.g. "Ran 3 searches" or "Thinking". */
  title: React.ReactNode;
  /** The header icon, drawn at 16px. Defaults to a magnifier. */
  icon?: IconComponent;
  /** Controlled open state. Omit it to let the component keep its own (see defaultOpen). */
  open?: boolean;
  /** Initial open state when uncontrolled. Defaults to true. */
  defaultOpen?: boolean;
  /** Called with the new state when the header is clicked. */
  onOpenChange?: (open: boolean) => void;
  /** Adds the working line under the steps: "working" (sparkle, shimmer) or "done" ("Worked for 11.2s"). */
  status?: 'working' | 'done';
  /** Elapsed seconds for the working line. */
  elapsed?: number;
  /** Epoch ms when the work started; the working line then counts up on its own. */
  startedAt?: number;
  /** ChainOfThoughtStep elements. */
  children?: React.ReactNode;
  className?: string;
}

export const ChainOfThought: React.FC<ChainOfThoughtProps> = ({
  title, icon, open, defaultOpen = true, onOpenChange, status, elapsed, startedAt, children, className,
}) => {
  const Icon = icon ?? Search;
  const panelId = React.useId();
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open ?? inner;
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };
  return (
    <div className={cx(styles.root, className)} data-open={isOpen || undefined}>
      <button type="button" className={styles.header} aria-expanded={isOpen} aria-controls={panelId} onClick={toggle}>
        <Icon className={styles.header__icon} size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
        <span className={styles.header__title}>{title}</span>
        <ChevronDown className={styles.header__chevron} size={14} strokeWidth={iconStrokeWidth(14)} aria-hidden="true" />
      </button>
      <div id={panelId} className={styles.panel} aria-hidden={!isOpen || undefined}>
        <div className={styles.panel__inner}>
          {children != null && <ol className={styles.steps}>{children}</ol>}
          {status && (
            <div className={styles.working}>
              <WorkingIndicator status={status} elapsed={elapsed} startedAt={startedAt} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
ChainOfThought.displayName = 'ChainOfThought';

export default ChainOfThought;
