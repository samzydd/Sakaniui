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
 * Icons can be anything: a Sakani icon, an emoji (💡 for thinking, 📄 for reading) or the real logo of the
 * site searched, in its brand colour (`sourceLogo('reddit')`). Colour stays on in every state; a pending
 * step shows its logo in grey until it starts, and the spark that runs into the active step takes the
 * logo's colour.
 *
 * Done steps read muted and the active one reads in full, so the eye lands on what is
 * happening now. The tree rail (a 1px border/default line with an elbow into each icon)
 * stops at the last step by itself. While working, the label shimmers; reduced motion
 * keeps it still.
 *
 * The component is presentational: you feed it steps as your agent produces them
 * (append a ChainOfThoughtStep, flip the previous one to "done"). `status="working"` plus
 * `startedAt` makes the elapsed time tick on its own.
 *
 * Motion (the Figma "Chain of Thought · motion" table) reads as ink running down the rail.
 * A step you append opens its row while the previous rail flows down into it, turns the
 * corner into the new icon, and the icon lands; the label is written in left to right, the
 * query types itself, the count ticks up and the source chips fan out from behind each
 * other. A spark keeps running down into the active step and its icon beats as it lands.
 * Finishing sends one sweep down the whole rail, lighting each icon as it passes, and lands
 * on the check, which draws itself in. Opening the panel lets the steps rise in turn.
 * Nothing animates on first render, only what arrives afterwards, and reduced motion makes
 * all of it instant.
 */

import React from 'react';
import { IconSearch as Search } from '../../icons/outline/search';
import { IconCircleCheck as CircleCheck } from '../../icons/outline/circle-check';
import { IconChevronDown as ChevronDown } from '../../icons/outline/chevron-down';
import { IconWorld as World } from '../../icons/outline/world';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import type { IconComponent } from '../../icons/types';
import styles from './ChainOfThought.module.css';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** True once the container has painted its first frame: parts that mount after that animate in; parts there from the start do not. */
const ReadyContext = React.createContext(false);

/** Whether this part mounted after the container was ready (so it should animate in). Decided once, at mount. */
function useArrivedLate() {
  const ready = React.useContext(ReadyContext);
  const [late] = React.useState(ready);
  return late;
}

/** True for a moment after `value` changes (never on first render). `when` limits it to some new values. */
function useChanged(value: unknown, ms = 700, when: (value: unknown) => boolean = () => true) {
  const [changed, setChanged] = React.useState(false);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!when(value)) { setChanged(false); return; }
    setChanged(true);
    const t = setTimeout(() => setChanged(false), ms);
    return () => clearTimeout(t);
    // only a new value restarts it; `ms` is read at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return changed;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

/**
 * The sparkle beside "Working": the library's sparkles icon with its three stars split apart so each can move on
 * its own. The big star turns a quarter every cycle (a four-point star looks the same after 90 degrees, so it reads
 * as a continuous turn) and breathes; the two small ones twinkle in turn, filling in as they peak.
 */
const WorkingSpark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={iconStrokeWidth(16)} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    className={cx(styles.spark, className)}
  >
    <path className={styles.spark__big} d="M9 18a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" />
    <path className={styles.spark__top} d="M16 6a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
    <path className={styles.spark__bottom} d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
  </svg>
);

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
  // long enough for the finish sweep to reach it
  const changed = useChanged(status, 2400);
  return (
    <div className={cx(styles.indicator, working ? styles['indicator--working'] : styles['indicator--done'], className)} data-changed={changed || undefined} role="status">
      {working
        ? <WorkingSpark className={styles.indicator__icon} />
        : <CircleCheck className={styles.indicator__icon} size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />}
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

export const SourceStack: React.FC<SourceStackProps> = ({ sources, className }) => {
  const late = useArrivedLate();
  return (
  <ul className={cx(styles.stack, className)} aria-label={`${sources.length} source${sources.length === 1 ? '' : 's'}`}>
    {sources.map((s, i) => {
      const Icon = s.icon ?? World;
      return (
        <li key={`${s.label}-${i}`} className={styles.chip} title={s.label} data-fresh={late || undefined} style={{ ['--i' as string]: i }}>
          <Icon size={10} strokeWidth={iconStrokeWidth(10, 1)} aria-hidden="true" />
          <span className={styles.sr}>{s.label}</span>
        </li>
      );
    })}
  </ul>
  );
};
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
  /** Colour of the spark that runs into the step while it is active. Defaults to the icon's brand colour when it is a logo from `sourceLogo()`. */
  accent?: string;
  /** A row under the step, usually a <SourceStack>. */
  sources?: React.ReactNode;
  /** Text before the sources. Defaults to "Sources". */
  sourcesLabel?: string;
  /** Makes the sources row a button with a chevron, so the sources can be opened. */
  onSourcesClick?: () => void;
  className?: string;
}

/** The result count. When it arrives after the container is up it fades in and a leading number ticks up to its value ("12 threads"). */
const StepCount: React.FC<{ children: React.ReactNode; delay: number }> = ({ children, delay }) => {
  const late = useArrivedLate();
  const [ticking, setTicking] = React.useState<string | null>(null);
  React.useEffect(() => {
    const match = late && (typeof children === 'string' || typeof children === 'number') ? /^(\d+)(.*)$/s.exec(String(children)) : null;
    const target = match ? Number(match[1]) : 0;
    if (!match || target < 2 || reducedMotion()) return;
    // starts at 2 or more so a plural label never reads "1 results"
    const rest = match[2], from = Math.max(2, Math.round(target * 0.25)), start = performance.now() + delay, duration = Math.min(900, 380 + target * 30);
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setTicking(t < 1 ? `${Math.round(from + eased * (target - from))}${rest}` : null);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    setTicking(`${from}${rest}`);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // runs once, at arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <span className={styles.step__count} data-fresh={late || undefined}>{ticking ?? children}</span>;
};

/** The sources row: opens (rather than jumping in) when the sources land after the step. */
const StepSources: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ onClick, children }) => {
  const late = useArrivedLate();
  return onClick
    ? <button type="button" className={cx(styles.step__sources, styles['step__sources--button'])} data-fresh={late || undefined} onClick={onClick}>{children}</button>
    : <div className={styles.step__sources} data-fresh={late || undefined}>{children}</div>;
};

const STATUS_TEXT: Record<ChainOfThoughtStepStatus, string> = { pending: 'Pending: ', active: 'In progress: ', done: 'Done: ' };

export const ChainOfThoughtStep: React.FC<ChainOfThoughtStepProps> = ({
  status = 'done', icon, label, query, count, accent, sources, sourcesLabel = 'Sources', onSourcesClick, className,
}) => {
  const Icon = icon ?? Search;
  const spark = accent ?? (Icon as { brandColor?: string | null }).brandColor ?? undefined;
  const late = useArrivedLate();
  const [entering, setEntering] = React.useState(late);
  // results that come with the step wait for its label; results that land later show at once
  const [withResults] = React.useState(late && (count != null || sources != null));
  React.useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => setEntering(false), 2000);
    return () => clearTimeout(t);
  }, [entering]);
  const sourcesRow = (
    <>
      <span className={styles.step__sourcesLabel}>{sourcesLabel}</span>
      {sources}
      {onSourcesClick && <ChevronDown className={styles.step__sourcesChevron} size={12} strokeWidth={iconStrokeWidth(12)} aria-hidden="true" />}
    </>
  );
  return (
    <li className={cx(styles.step, styles[`step--${status}`], className)} style={spark ? { ['--cot-spark' as string]: spark } : undefined} data-entering={entering || undefined} data-with-results={(entering && withResults) || undefined} aria-current={status === 'active' ? 'step' : undefined}>
      <div className={styles.step__body}>
      <div className={styles.step__row}>
        <Icon className={styles.step__icon} size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
        <span className={styles.step__content}>
          <span className={styles.sr}>{STATUS_TEXT[status]}</span>
          <span className={styles.step__label}>{label}</span>
          {query && <code className={styles.step__query} style={{ ['--chars' as string]: Math.max(1, query.length) }}>{query}</code>}
        </span>
        {count != null && <StepCount delay={entering && withResults ? 760 : 0}>{count}</StepCount>}
      </div>
      {sources && <StepSources onClick={onSourcesClick}>{sourcesRow}</StepSources>}
      </div>
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
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const titleChanged = useChanged(typeof title === 'string' ? title : undefined, 600);
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open ?? inner;

  // each step knows its place (--step) and the root its length (--steps): the finish sweep and the
  // opening rise are staggered by them
  const stepsRef = React.useRef<HTMLOListElement>(null);
  const [stepCount, setStepCount] = React.useState(0);
  // after every render (steps come and go); it only sets state when the count changed, so it settles
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    const items = stepsRef.current ? Array.from(stepsRef.current.children) as HTMLElement[] : [];
    items.forEach((el, i) => el.style.setProperty('--step', String(i)));
    if (items.length !== stepCount) setStepCount(items.length);
  });
  const finishing = useChanged(status, 900 + stepCount * 110, (s) => s === 'done');
  const opening = useChanged(isOpen, 700 + stepCount * 45, (o) => o === true);
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };
  return (
    <div
      className={cx(styles.root, className)}
      data-open={isOpen || undefined}
      data-finishing={finishing || undefined}
      data-opening={opening || undefined}
      style={{ ['--steps' as string]: stepCount }}
    >
      <button type="button" className={styles.header} aria-expanded={isOpen} aria-controls={panelId} onClick={toggle}>
        <Icon className={styles.header__icon} size={16} strokeWidth={iconStrokeWidth(16)} aria-hidden="true" />
        <span className={styles.header__title} data-changed={titleChanged || undefined}>{title}</span>
        <ChevronDown className={styles.header__chevron} size={14} strokeWidth={iconStrokeWidth(14)} aria-hidden="true" />
      </button>
      <div id={panelId} className={styles.panel} aria-hidden={!isOpen || undefined}>
        <div className={styles.panel__inner}>
          <ReadyContext.Provider value={ready}>
            {children != null && <ol ref={stepsRef} className={styles.steps}>{children}</ol>}
          </ReadyContext.Provider>
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
