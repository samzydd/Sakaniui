/**
 * KanbanBoardBlock — Blocks / Data & Content / Kanban Board
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this file and edit
 * it: change the columns, swap the sample tasks, adjust the card content.
 * Assembled entirely from Sakani components.
 *
 * Mirrors the four states in the Figma block:
 *   default      · columns with counts, cards, and an add affordance
 *   loading      · card skeletons hold each column's shape
 *   empty-column · a column with no cards shows a dashed drop zone
 *   dragging     · a card lifts and tilts while a card-shaped slot marks where it lands
 *
 * Move to another stage (default state): hover or focus a card and a small "Move to" button (⇄) shows in its footer.
 * It opens a short list of the stages, each with its colour; the card's own stage has a check and the next stage is
 * highlighted to start with. Pick one and the card slides across into that column at its own height, settles, then glides up to the
 * top while the cards around it make room: done as layout animation on its own soft path, so nothing jumps. The new
 * column's colour rings the card as it lands and both counts tick; moves are announced to screen readers. Alt + → /
 * Alt + ← on a focused card move it one stage without the menu. On touch the button stays on every card. Nothing
 * animates under prefers-reduced-motion.
 *
 * Drag and drop (default state) is pointer-based, see useKanbanDrag.ts: the
 * card follows the pointer and swings with its movement, a slot opens where it
 * will land, the other cards slide out of the way, and on release it glides
 * into place. Mouse, pen and touch.
 *
 * The column is defined locally (below) rather than as a library component —
 * it exists to serve this block, so it lives with the block.
 */

import React from 'react';
import { IconSearch as Search } from '../../icons/outline/search';
import { IconPlus as Plus } from '../../icons/outline/plus';
import { IconDots as MoreHorizontal } from '../../icons/outline/dots';
import { IconSelector as ChevronsUpDown } from '../../icons/outline/selector';
import { IconCalendar as Calendar } from '../../icons/outline/calendar';
import { IconMessage as MessageSquare } from '../../icons/outline/message';
import { IconFlag as Flag } from '../../icons/outline/flag';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Checkbox } from '../../components/Checkbox';
import { Skeleton } from '../../components/Skeleton';
import { AvatarGroup } from '../../components/AvatarGroup';
import { BoardCard, type BoardCardStage } from '../../components/BoardCard';
import { CardMetaItem } from '../../components/CardMetaItem';
import { FilterChip } from '../../components/FilterChip';
import styles from './KanbanBoardBlock.module.css';
import { useKanbanDrag, type KanbanPos } from './useKanbanDrag';
import amaraPhoto from '../../assets/avatars/activity-amara-kalu.jpg';
import chidiPhoto from '../../assets/avatars/activity-chidi-duru.jpg';
import jadePhoto from '../../assets/avatars/activity-jade-silva.jpg';
import raviPhoto from '../../assets/avatars/activity-ravi-menon.jpg';
import emilyPhoto from '../../assets/avatars/liquid-dashboard-emily-johnson.png';
import michaelPhoto from '../../assets/avatars/liquid-dashboard-michael-evans.png';
import sarahPhoto from '../../assets/avatars/liquid-dashboard-sarah-williams.png';
import balazsPhoto from '../../assets/avatars/r1-contact-novak-balazs.jpg';
import attilaPhoto from '../../assets/avatars/r1-owner-kende-attila.jpg';
import jakabPhoto from '../../assets/avatars/r2-contact-szabo-jakab.jpg';
import boldizsarPhoto from '../../assets/avatars/r2-owner-orosz-boldizsar.jpg';
import norbertPhoto from '../../assets/avatars/r3-contact-bogdan-norbert.jpg';
import arpadPhoto from '../../assets/avatars/r3-owner-simon-arpad.jpg';
import ivettePhoto from '../../assets/avatars/r4-contact-ramai-ivette.jpg';
import gezaPhoto from '../../assets/avatars/r5-contact-csatar-geza.jpg';
import viktorPhoto from '../../assets/avatars/r6-contact-veres-viktor.jpg';
import vincePhoto from '../../assets/avatars/r6-owner-kiraly-vince.jpg';
import szilveszterPhoto from '../../assets/avatars/r7-contact-hajdu-szilveszter.jpg';
import kalmanPhoto from '../../assets/avatars/r7-owner-szigmund-kalman.jpg';
import endrePhoto from '../../assets/avatars/r9-contact-aprod-endre.jpg';
import andrasPhoto from '../../assets/avatars/r9-owner-antal-andras.jpg';

export type KanbanBoardBlockState = 'default' | 'loading' | 'empty-column' | 'dragging';

/* ------------------------------------------------------------------ *
 * Sample data — replace with your own
 * ------------------------------------------------------------------ */
interface Task {
  id: string;
  title: string;
  description?: string;
  tags: Array<{ label: string; variant: 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' }>;
  due: string;
  comments?: number;
  assignees: Array<{ src?: string; alt?: string; initials?: string }>;
  compact?: boolean;
}

/** Sample people: photos bundled with the package (src/assets/avatars). */
const PEOPLE = {
  amara: { src: amaraPhoto, alt: 'Amara Kalu', initials: 'AK' },
  chidi: { src: chidiPhoto, alt: 'Chidi Duru', initials: 'CD' },
  jade: { src: jadePhoto, alt: 'Jade Silva', initials: 'JS' },
  ravi: { src: raviPhoto, alt: 'Ravi Menon', initials: 'RM' },
  emily: { src: emilyPhoto, alt: 'Emily Johnson', initials: 'EJ' },
  michael: { src: michaelPhoto, alt: 'Michael Evans', initials: 'ME' },
  sarah: { src: sarahPhoto, alt: 'Sarah Williams', initials: 'SW' },
  balazs: { src: balazsPhoto, alt: 'Balázs Novák', initials: 'BN' },
  attila: { src: attilaPhoto, alt: 'Attila Kende', initials: 'AK' },
  jakab: { src: jakabPhoto, alt: 'Jakab Szabó', initials: 'JS' },
  boldizsar: { src: boldizsarPhoto, alt: 'Boldizsár Orosz', initials: 'BO' },
  norbert: { src: norbertPhoto, alt: 'Norbert Bogdán', initials: 'NB' },
  arpad: { src: arpadPhoto, alt: 'Árpád Simon', initials: 'ÁS' },
  ivette: { src: ivettePhoto, alt: 'Ivette Rámai', initials: 'IR' },
  geza: { src: gezaPhoto, alt: 'Géza Csatár', initials: 'GC' },
  viktor: { src: viktorPhoto, alt: 'Viktor Veres', initials: 'VV' },
  vince: { src: vincePhoto, alt: 'Vince Király', initials: 'VK' },
  szilveszter: { src: szilveszterPhoto, alt: 'Szilveszter Hajdú', initials: 'SH' },
  kalman: { src: kalmanPhoto, alt: 'Kálmán Szigmund', initials: 'KS' },
  endre: { src: endrePhoto, alt: 'Endre Apród', initials: 'EA' },
  andras: { src: andrasPhoto, alt: 'András Antal', initials: 'AA' },
};
const p = PEOPLE;

const INITIAL_COLUMNS: Array<{ title: string; dot: string; tasks: Task[] }> = [
  {
    title: 'To-do', dot: 'var(--color-chart-1)',
    tasks: [
      { id: 'design-system', title: 'Design system update', description: 'Enhance component consistency and usability',
        tags: [{ label: 'Design', variant: 'accent' }, { label: 'Product', variant: 'neutral' }],
        due: 'Jan 25', comments: 4, assignees: [p.amara, p.chidi, p.jade, p.ravi] },
      { id: 'retention', title: 'Retention rate by 23%', description: 'Improve retention through campaigns',
        tags: [{ label: 'Marketing', variant: 'info' }],
        due: 'Jan 25', comments: 2, assignees: [p.emily, p.michael] },
      { id: 'kyc', title: 'KYC flow review', tags: [{ label: 'Product', variant: 'neutral' }],
        due: 'Jan 28', assignees: [p.sarah], compact: true },
      { id: 'pricing-page', title: 'Pricing page refresh', description: 'New tiers, annual toggle and FAQ',
        tags: [{ label: 'Marketing', variant: 'info' }, { label: 'Design', variant: 'accent' }],
        due: 'Feb 3', comments: 6, assignees: [p.balazs, p.attila, p.jakab] },
      { id: 'billing-alerts', title: 'Billing failure alerts', tags: [{ label: 'Engineering', variant: 'info' }],
        due: 'Feb 4', assignees: [p.boldizsar], compact: true },
      { id: 'user-interviews', title: 'Schedule user interviews', description: 'Eight sessions with churned accounts',
        tags: [{ label: 'Research', variant: 'warning' }],
        due: 'Feb 6', comments: 1, assignees: [p.norbert, p.arpad] },
    ],
  },
  {
    title: 'In progress', dot: 'var(--color-chart-2)',
    tasks: [
      { id: 'icon-audit', title: 'Icon library audit', description: 'Move every component to Tabler icons',
        tags: [{ label: 'Design', variant: 'accent' }],
        due: 'Jan 26', comments: 7, assignees: [p.ivette, p.geza] },
      { id: 'search-perf', title: 'Search performance', tags: [{ label: 'Engineering', variant: 'info' }],
        due: 'Jan 30', assignees: [p.viktor], compact: true },
      { id: 'mobile-nav', title: 'Mobile navigation', description: 'Bottom bar with five primary destinations',
        tags: [{ label: 'Product', variant: 'neutral' }, { label: 'Design', variant: 'accent' }],
        due: 'Feb 1', comments: 5, assignees: [p.vince, p.szilveszter, p.kalman] },
      { id: 'sso', title: 'SAML single sign-on', description: 'Okta and Azure AD for enterprise plans',
        tags: [{ label: 'Engineering', variant: 'info' }, { label: 'Security', variant: 'danger' }],
        due: 'Feb 5', comments: 3, assignees: [p.endre, p.andras] },
      { id: 'email-digest', title: 'Weekly email digest', tags: [{ label: 'Growth', variant: 'success' }],
        due: 'Feb 7', assignees: [p.jade], compact: true },
    ],
  },
  {
    title: 'In review', dot: 'var(--color-chart-4)',
    tasks: [
      { id: 'onboarding', title: 'Onboarding checklist', description: 'Three-step setup with progress tracking',
        tags: [{ label: 'Growth', variant: 'success' }],
        due: 'Feb 2', comments: 3, assignees: [p.chidi, p.emily] },
      { id: 'export-csv', title: 'CSV export for reports', tags: [{ label: 'Engineering', variant: 'info' }],
        due: 'Feb 2', comments: 2, assignees: [p.michael], compact: true },
      { id: 'empty-states', title: 'Empty states pass', description: 'Illustrations and copy for 12 screens',
        tags: [{ label: 'Design', variant: 'accent' }],
        due: 'Feb 3', comments: 9, assignees: [p.sarah, p.amara, p.balazs] },
      { id: 'audit-log', title: 'Audit log retention', description: 'Keep 365 days on the Business plan',
        tags: [{ label: 'Security', variant: 'danger' }],
        due: 'Feb 4', assignees: [p.attila, p.ravi] },
      { id: 'changelog', title: 'Publish January changelog', tags: [{ label: 'Marketing', variant: 'info' }],
        due: 'Feb 5', assignees: [p.jakab], compact: true },
    ],
  },
  {
    title: 'Done', dot: 'var(--color-success-solid)',
    tasks: [
      { id: 'dark-mode', title: 'Dark mode tokens', description: 'Semantic layer flips from a single source',
        tags: [{ label: 'Design', variant: 'accent' }],
        due: 'Jan 18', assignees: [p.boldizsar] },
      { id: 'stripe-webhooks', title: 'Stripe webhooks', tags: [{ label: 'Engineering', variant: 'info' }],
        due: 'Jan 19', comments: 4, assignees: [p.norbert, p.arpad], compact: true },
      { id: 'landing-hero', title: 'Landing page hero', description: 'New headline tested against the control',
        tags: [{ label: 'Marketing', variant: 'info' }, { label: 'Growth', variant: 'success' }],
        due: 'Jan 20', comments: 11, assignees: [p.ivette, p.geza, p.viktor, p.vince] },
      { id: 'invite-flow', title: 'Team invite flow', description: 'Invite by link or email with roles',
        tags: [{ label: 'Product', variant: 'neutral' }],
        due: 'Jan 22', comments: 2, assignees: [p.szilveszter] },
      { id: 'a11y-audit', title: 'Accessibility audit', tags: [{ label: 'Design', variant: 'accent' }],
        due: 'Jan 23', assignees: [p.kalman, p.endre], compact: true },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Column — local to this block
 * ------------------------------------------------------------------ */
interface ColumnProps {
  title: string;
  dot: string;
  count: number | string;
  variant?: 'default' | 'empty' | 'loading';
  /** When the board is stretched taller than its real content (e.g. embedded
   * in a fixed-height demo frame), stretches every column to equal height
   * and caps off its real cards with a dashed placeholder slot down to the
   * bottom instead of leaving blank canvas. No-op at the board's natural
   * height. */
  fillPlaceholders?: boolean;
  /** A dragged card is over this column. */
  isTarget?: boolean;
  /** A card just arrived or left: the count ticks. */
  pop?: boolean;
  bodyRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
}

const Column: React.FC<ColumnProps> = ({ title, dot, count, variant = 'default', fillPlaceholders, isTarget, pop, bodyRef, children }) => (
  <div className={[styles.column, fillPlaceholders ? styles['column--fill'] : '', isTarget ? styles['column--target'] : ''].filter(Boolean).join(' ')}>
    <div className={styles.column__header}>
      <span className={styles.column__dot} style={{ background: dot }} aria-hidden="true" />
      <span className={styles.column__title}>{title}</span>
      <span key={String(count)} className={pop ? styles.countPop : undefined}>
        <Badge variant="neutral" emphasis="subtle">{String(count)}</Badge>
      </span>
      <span className={styles.spacer} />
      <button type="button" className={styles.column__action} aria-label={`Add task to ${title}`}>
        <Plus size={16} />
      </button>
      <button type="button" className={styles.column__action} aria-label={`${title} options`}>
        <MoreHorizontal size={16} />
      </button>
    </div>

    <div ref={bodyRef} className={[styles.column__body, fillPlaceholders ? styles['column__body--fill'] : ''].filter(Boolean).join(' ')}>
      {variant === 'empty' ? (
        <div className={styles.dropZone}>Drop tasks here</div>
      ) : variant === 'loading' ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.cardSkeleton}>
            <Skeleton variant="text" width={180} height={12} />
            <Skeleton variant="text" width="100%" height={10} />
            {i !== 2 && <Skeleton variant="text" width={120} height={10} />}
          </div>
        ))
      ) : (
        <>
          {children}
          {fillPlaceholders && <div className={styles.columnFiller} aria-hidden="true" />}
        </>
      )}
    </div>

    <button type="button" className={styles.column__add}>
      <Plus size={16} aria-hidden="true" />
      Add task
    </button>
  </div>
);

/* ------------------------------------------------------------------ *
 * Card renderer
 * ------------------------------------------------------------------ */
interface MoverProps {
  stages?: BoardCardStage[];
  stage?: string;
  onMoveTo?: (stageId: string) => void;
  moveDisabled?: boolean;
}

const renderTask = (
  task: Task,
  key: React.Key,
  state?: 'default' | 'dragging',
  wrapperProps?: React.HTMLAttributes<HTMLDivElement> & Partial<Record<`data-${string}`, string>>,
  mover?: MoverProps,
) => (
  <div key={key} className={wrapperProps ? styles.draggable : undefined} {...(wrapperProps ?? {})}>
  <BoardCard
    type={task.compact ? 'compact' : 'default'}
    state={state === 'dragging' ? 'dragging' : 'default'}
    leading={<Checkbox />}
    title={task.title}
    trailing={<Flag size={14} color="var(--color-warning-fg)" />}
    description={task.description}
    tags={task.tags.map((t) => (
      <Badge key={t.label} variant={t.variant} emphasis="subtle">{t.label}</Badge>
    ))}
    meta={
      <>
        <CardMetaItem icon={<Calendar size={13} />}>{task.due}</CardMetaItem>
        {task.comments != null && (
          <CardMetaItem icon={<MessageSquare size={13} />}>{String(task.comments)}</CardMetaItem>
        )}
      </>
    }
    assignees={<AvatarGroup size="sm" max={3} avatars={task.assignees} />}
    {...(mover ?? {})}
  />
  </div>
);

/* ------------------------------------------------------------------ *
 * Drop slot -- where a dragged card will land: the card itself at 20%,
 * outlined with a 12/4 dash (an SVG rect, since CSS borders can't set the
 * dash length).
 * ------------------------------------------------------------------ */
const DropSlot = React.forwardRef<HTMLDivElement, { task: Task; height?: number } & React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>>(
  ({ task, height, className, style, ...rest }, ref) => (
    <div ref={ref} className={[styles.slot, className ?? ''].filter(Boolean).join(' ')} style={{ height, ...style }} aria-hidden="true" {...rest}>
      <div className={styles.slot__ghost}>{renderTask(task, 'ghost')}</div>
      <svg className={styles.slot__dash} aria-hidden="true">
        <rect x="0.75" y="0.75" rx="11.25" ry="11.25" />
      </svg>
    </div>
  ),
);
DropSlot.displayName = 'DropSlot';

/* ------------------------------------------------------------------ *
 * The block
 * ------------------------------------------------------------------ */
export interface KanbanBoardBlockProps {
  state?: KanbanBoardBlockState;
  className?: string;
  /** When the board is stretched taller than its real content (e.g. embedded
   * in a fixed-height demo frame), stretches every column to equal height
   * and caps off its real cards with a dashed placeholder slot down to the
   * bottom instead of leaving blank canvas. No-op at the board's natural
   * height. */
  fillPlaceholders?: boolean;
  /** A card moved to another stage, by drag or by the move buttons. Save it here. */
  onTaskMove?: (move: { id: string; title: string; from: string; to: string }) => void;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The move to the next stage, in two steps (ms): the card slides across into the next column at its own height and settles,
// then rises to the top. The card is animated on its own path (the Web Animations API) with a soft start and a soft end, so
// it never lurches; the cards around it make room with the same easing.
const ACROSS = 460;      // the slide across one column (further moves take a little longer)
const RISE = 440;        // the rise to the top
const MAKE_ROOM = 380;   // the other cards stepping aside
const GLIDE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export const KanbanBoardBlock: React.FC<KanbanBoardBlockProps> = ({
  state = 'default',
  className,
  fillPlaceholders,
  onTaskMove,
}) => {
  // ---- drag and drop -----------------------------------------------------
  const [columns, setColumns] = React.useState(INITIAL_COLUMNS);
  const columnsRef = React.useRef(columns);
  columnsRef.current = columns;
  const [arrived, setArrived] = React.useState<{ id: string; cols: number[] } | null>(null);
  const [announce, setAnnounce] = React.useState('');
  const refocus = React.useRef<string | null>(null);
  const onTaskMoveRef = React.useRef(onTaskMove);
  onTaskMoveRef.current = onTaskMove;

  /** Commit a move: the card leaves one list and enters another; the landing is marked and announced (`endsAt`: where it will finally sit, when it moves on after landing). */
  const commitMove = (from: KanbanPos, to: KanbanPos, endsAt = to.index) => {
    const cols = columnsRef.current;
    const task = cols[from.col]?.tasks[from.index];
    if (!task) return;
    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const [moved] = next[from.col].tasks.splice(from.index, 1);
      if (moved) next[to.col].tasks.splice(to.index, 0, moved);
      return next;
    });
    if (from.col !== to.col) {
      setArrived({ id: task.id, cols: [from.col, to.col] });
      setAnnounce(`${task.title} moved to ${cols[to.col].title}, position ${endsAt + 1} of ${cols[to.col].tasks.length + 1}.`);
      onTaskMoveRef.current?.({ id: task.id, title: task.title, from: cols[from.col].title, to: cols[to.col].title });
    }
  };

  const drag = useKanbanDrag({ enabled: state === 'default', onMove: commitMove });

  // The highlight on a card that just landed, and the counts that ticked, fade after a moment.
  React.useEffect(() => {
    if (!arrived) return undefined;
    const t = window.setTimeout(() => setArrived(null), 1100);
    return () => window.clearTimeout(t);
  }, [arrived]);
  // A card that had focus keeps it through the move, so Alt + → can be pressed again.
  React.useEffect(() => {
    if (!arrived || refocus.current !== arrived.id) return;
    refocus.current = null;
    drag.blockRef.current?.querySelector<HTMLElement>(`[data-kanban-card="${arrived.id}"] [tabindex]`)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived]);

  // ---- move to the next stage ---------------------------------------------
  const [moving, setMoving] = React.useState<{ id: string; col: number } | null>(null);
  const [step, setStep] = React.useState<{ n: number; id: string; from: DOMRect; ms: number } | null>(null);
  const stepN = React.useRef(0);
  const glide = React.useRef<Animation | null>(null);
  const timers = React.useRef<number[]>([]);
  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  /** Where in a column a card at this height belongs, so it can slide in sideways rather than from above. */
  const indexAtHeight = (body: HTMLElement, centreY: number) => {
    const cards = [...body.querySelectorAll<HTMLElement>(':scope > [data-kanban-card]')];
    const gap = parseFloat(getComputedStyle(body).rowGap) || 0;
    let y = body.getBoundingClientRect().top;
    for (let i = 0; i < cards.length; i++) {
      const h = cards[i].offsetHeight;
      if (centreY < y + h / 2) return i;
      y += h + gap;
    }
    return cards.length;
  };

  const startMove = (from: KanbanPos, toCol: number) => {
    if (moving || drag.active || state !== 'default') return;
    const cols = columnsRef.current;
    const task = cols[from.col]?.tasks[from.index];
    const block = drag.blockRef.current;
    const board = drag.boardRef.current;
    if (!task || !block || !board || toCol < 0 || toCol >= cols.length || toCol === from.col) return;
    const cardEl = block.querySelector<HTMLElement>(`[data-kanban-card="${task.id}"]`);
    if (!cardEl) return;
    if (cardEl.contains(document.activeElement)) refocus.current = task.id;
    if (reducedMotion()) { commitMove(from, { col: toCol, index: 0 }); return; }

    const bodies = board.querySelectorAll<HTMLElement>(`.${styles.column__body}`);
    const run = () => {
      const rect = cardEl.getBoundingClientRect();
      const into = indexAtHeight(bodies[toCol], rect.top + 20); // by its top edge: it slides in level, not from below
      const across = Math.round(Math.min(760, ACROSS + Math.max(0, Math.abs(bodies[toCol].getBoundingClientRect().left - rect.left) - 340) * 0.35));
      // 1. across: the card joins the next column at the height it is at; everything else makes room
      drag.capture();
      commitMove(from, { col: toCol, index: into }, 0);
      setMoving({ id: task.id, col: toCol });
      setStep({ n: ++stepN.current, id: task.id, from: rect, ms: across });
      // 2. up: once it has settled in, it rises to the top of the column, the cards above it stepping down
      if (into > 0) {
        later(() => {
          const el = block.querySelector<HTMLElement>(`[data-kanban-card="${task.id}"]`);
          if (!el) return;
          const here = el.getBoundingClientRect();
          drag.capture();
          setColumns((prev) => {
            const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
            const at = next[toCol].tasks.findIndex((t) => t.id === task.id);
            if (at > 0) next[toCol].tasks.unshift(...next[toCol].tasks.splice(at, 1));
            return next;
          });
          setStep({ n: ++stepN.current, id: task.id, from: here, ms: RISE });
        }, across - 30);
      }
      later(() => setMoving(null), (into > 0 ? across - 30 + RISE : across) + 80);
    };
    // The next column may sit past the edge of a narrow board: bring it into view first, then move.
    const target = bodies[toCol]?.parentElement;
    const br = board.getBoundingClientRect();
    const tr = target?.getBoundingClientRect();
    if (tr && (tr.left < br.left || tr.right > br.right)) {
      board.scrollBy({ left: tr.left < br.left ? tr.left - br.left - 16 : tr.right - br.right + 16, behavior: 'smooth' });
      later(run, 280);
    } else run();
  };

  // Flies the moving card from where it was to where it now sits, on its own soft-start, soft-end path. (The other cards
  // are animated by the drag hook's layout effect; this card is flagged data-flip-skip so the two do not fight.)
  React.useLayoutEffect(() => {
    if (!step) return undefined;
    const el = drag.blockRef.current?.querySelector<HTMLElement>(`[data-kanban-card="${step.id}"]`);
    if (!el) return undefined;
    glide.current?.cancel();
    el.style.transform = '';
    const now = el.getBoundingClientRect();
    const k = el.offsetWidth ? now.width / el.offsetWidth || 1 : 1; // a scaled preview scales the rects, not the translate
    const dx = (step.from.left - now.left) / k;
    const dy = (step.from.top - now.top) / k;
    if (!dx && !dy) return undefined;
    glide.current = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
      { duration: step.ms, easing: GLIDE, fill: 'backwards' },
    );
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  React.useEffect(() => () => glide.current?.cancel(), []);

  const stages: BoardCardStage[] = columns.map((c) => ({ id: c.title, label: c.title, color: c.dot }));
  const lifted = drag.active ? drag.active.from : null;
  const aim = drag.active ? drag.target : null;
  const liftedTask = lifted ? columns[lifted.col]?.tasks[lifted.index] : undefined;
  const liftedHeight = drag.active?.height;
  const busy = !!(drag.active || moving);

  const source = state === 'default' ? columns : INITIAL_COLUMNS;

  return (
  <div ref={drag.blockRef} className={[styles.block, className ?? ''].filter(Boolean).join(' ')}>
    {/* ---- Toolbar ---- */}
    <div className={styles.toolbar}>
      <div className={styles.toolbar__left}>
        <div className={styles.search}>
          <Input size="md" leadingIcon={<Search size={16} />} placeholder="Search tasks" />
        </div>
        <FilterChip type="default">Assignee</FilterChip>
        <FilterChip type="add">Add filter</FilterChip>
      </div>
      <span className={styles.spacer} />
      <div className={styles.toolbar__right}>
        <Button variant="secondary" size="md" leftIcon={<ChevronsUpDown size={16} />}>Sort</Button>
        <Button variant="primary" size="md" leftIcon={<Plus size={16} />}>New task</Button>
      </div>
    </div>

    {/* ---- Columns ---- */}
    <div ref={drag.boardRef} className={[styles.columns, fillPlaceholders ? styles['columns--fill'] : ''].filter(Boolean).join(' ')}>
      {source.map((col, colIndex) => {
        const isEmptyCol = state === 'empty-column' && colIndex === 2;
        const incoming = !!aim && aim.col === colIndex;
        const leaving = lifted && lifted.col === colIndex ? 1 : 0;
        // a column that has been emptied (its last card moved on) shows the drop zone, unless a card is on its way in
        const emptied = state === 'default' && col.tasks.length - leaving === 0 && !incoming;
        const variant =
          state === 'loading' ? 'loading' : isEmptyCol || emptied ? 'empty' : 'default';

        return (
          <Column
            key={col.title}
            isTarget={(!!lifted && aim?.col === colIndex && aim.col !== lifted.col) || moving?.col === colIndex}
            pop={!!arrived && arrived.cols.includes(colIndex)}
            bodyRef={drag.columnRef(colIndex)}
            title={col.title}
            dot={col.dot}
            count={state === 'loading' ? '—' : isEmptyCol ? 0 : col.tasks.length}
            variant={variant}
            fillPlaceholders={fillPlaceholders}
          >
            {(() => {
              // While dragging or moving: the card leaves its column and a slot opens at the target.
              const items = col.tasks
                .map((task, i) => ({ task, i }))
                .filter(({ i }) => !(lifted && lifted.col === colIndex && lifted.index === i));
              const nodes: React.ReactNode[] = items.map(({ task, i }) => {
                // The static dragging state: column 2's last card lifts out over its slot.
                const isDragged = state === 'dragging' && colIndex === 1 && i === col.tasks.length - 1;
                if (isDragged) {
                  return (
                    <div key={task.id} className={styles.draggedWrap}>
                      <DropSlot task={task} />
                      <div className={styles.draggedCard}>{renderTask(task, `${task.id}-drag`, 'dragging')}</div>
                    </div>
                  );
                }
                const wrapper = {
                  ...drag.cardProps({ col: colIndex, index: i }, task.id),
                  ...(arrived?.id === task.id ? { 'data-arrived': '', style: { ['--arrive' as string]: col.dot } as React.CSSProperties } : {}),
                  // while a card moves on, it glides slowly and softly, and its neighbours make room at the same pace
                  ...(moving ? { 'data-flip-duration': String(MAKE_ROOM), 'data-flip-ease': GLIDE } : {}),
                  ...(moving?.id === task.id ? { 'data-moving': '', 'data-flip-skip': '' } : {}),
                };
                const mover: MoverProps | undefined = state === 'default'
                  ? { stages, stage: col.title, moveDisabled: busy, onMoveTo: (id) => startMove({ col: colIndex, index: i }, columns.findIndex((c) => c.title === id)) }
                  : undefined;
                return renderTask(task, task.id, 'default', wrapper, mover);
              });
              if (aim && aim.col === colIndex) {
                nodes.splice(aim.index, 0, (
                  liftedTask && (
                    <DropSlot
                      key="slot"
                      task={liftedTask}
                      height={liftedHeight}
                      className={styles['slot--live']}
                      data-kanban-slot=""
                      data-flip-id={`slot-${colIndex}`}
                    />
                  )
                ));
              }
              return nodes;
            })()}
          </Column>
        );
      })}
      </div>

    {/* The card being dragged: follows the pointer above the board. */}
    {drag.active && liftedTask && (
      <div ref={drag.overlayRef} className={styles.overlay} style={{ width: drag.active.width }} aria-hidden="true">
        {renderTask(liftedTask, 'overlay')}
      </div>
    )}
    <div className={styles.srOnly} role="status" aria-live="polite">{announce}</div>
    </div>
  );
};

export default KanbanBoardBlock;
