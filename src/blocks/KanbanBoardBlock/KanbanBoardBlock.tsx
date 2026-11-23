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
 * Move to another stage (default state): each card has a small, quiet "Move to" button (⇄) at its top right, beside the flag.
 * It opens a short list of the stages, each with its colour; the card's own stage has a check and the next stage is
 * highlighted to start with. Pick one and the card slides across into that column at its own height, settles, then glides up to the
 * top while the cards around it make room: done as layout animation on its own soft path, so nothing jumps. The new
 * column's colour rings the card as it lands and both counts tick; moves are announced to screen readers. Alt + → /
 * Alt + ← on a focused card move it one stage without the menu. Nothing
 * animates under prefers-reduced-motion.
 *
 * Several at once (default state): the checkbox on each card selects it (Cmd / Ctrl / Shift-click too; once some are
 * picked a plain click adds or removes one) and a bar rises at the bottom: "3 selected", Move to, ×. Move to (or the ⇄ on
 * a selected card) sends them in a wave, each arcing across to the top of the new column a beat after the one before.
 * Dragging a selected card carries the rest: they gather under it as a fanned deck with a count, and where it is dropped
 * the deck deals out into the column card by card. Esc clears the selection.
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
import { IconX } from '../../icons/outline/x';
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
import { useKanbanDrag, type KanbanPos, type KanbanRect } from './useKanbanDrag';
import { StageMenu } from '../../components/BoardCard/StageMenu';
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
  moveSubject?: string;
}

interface SelectProps {
  checked: boolean;
  onToggle: () => void;
}

const renderTask = (
  task: Task,
  key: React.Key,
  state?: 'default' | 'dragging',
  wrapperProps?: React.HTMLAttributes<HTMLDivElement> & Partial<Record<`data-${string}`, string>>,
  mover?: MoverProps,
  select?: SelectProps,
) => (
  <div key={key} className={wrapperProps ? styles.draggable : undefined} {...(wrapperProps ?? {})}>
  <BoardCard
    type={task.compact ? 'compact' : 'default'}
    state={state === 'dragging' ? 'dragging' : select?.checked ? 'selected' : 'default'}
    leading={
      <Checkbox
        checked={select?.checked ?? false}
        onChange={() => select?.onToggle()}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${task.title}`}
        readOnly={!select}
      />
    }
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
const DropSlot = React.forwardRef<HTMLDivElement, { task: Task; height?: number; count?: number } & React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>>(
  ({ task, height, count, className, style, ...rest }, ref) => (
    <div ref={ref} className={[styles.slot, className ?? ''].filter(Boolean).join(' ')} style={{ height, ...style }} aria-hidden="true" {...rest}>
      {count && count > 1
        ? <span className={styles.slot__count}>{count} cards</span>
        : <div className={styles.slot__ghost}>{renderTask(task, 'ghost')}</div>}
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

// Several cards at once. Moved from the menu they go in a wave: each lifts, arcs across to the new column and settles at
// the top, a beat after the one before. Dragged, the others gather under the grabbed card as a deck, and where the deck is
// dropped it deals out into the column, card by card.
const WAVE = 680;          // each card's flight
const WAVE_STAGGER = 80;   // the beat between one card and the next
const WAVE_EASE = 'cubic-bezier(0.45, 0, 0.15, 1)';
const GATHER = 520;
const GATHER_STAGGER = 50;
const DEAL = 560;
const DEAL_STAGGER = 70;
const SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Where the n-th card under the top one sits in the deck: a little lower each, fanned left and right. */
const deckPose = (i: number) => {
  const d = Math.min(i + 1, 3);
  const side = i % 2 ? -1 : 1;
  return { x: side * (6 + 4 * d), y: 8 * d, r: side * (2.5 + 1.5 * d), s: 1 - 0.03 * d };
};

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
  // ---- selection: the checkboxes pick cards to move together -------------
  const [selected, setSelected] = React.useState<string[]>([]);
  const selectedRef = React.useRef(selected);
  selectedRef.current = selected;
  const toggle = (id: string) => setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  /** These ids in the order they sit on the board, column by column, top to bottom. */
  const boardOrder = (ids: string[]) => columnsRef.current.flatMap((c) => c.tasks.filter((t) => ids.includes(t.id)).map((t) => t.id));
  const [arrived, setArrived] = React.useState<{ ids: string[]; cols: number[]; delay?: Record<string, number>; ms?: number } | null>(null);
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
      setArrived({ ids: [task.id], cols: [from.col, to.col] });
      setAnnounce(`${task.title} moved to ${cols[to.col].title}, position ${endsAt + 1} of ${cols[to.col].tasks.length + 1}.`);
      onTaskMoveRef.current?.({ id: task.id, title: task.title, from: cols[from.col].title, to: cols[to.col].title });
    }
  };

  const drag = useKanbanDrag({
    enabled: state === 'default',
    // a selected card carries the rest of the selection with it
    groupOf: (id) => {
      const sel = selectedRef.current;
      return sel.includes(id) && sel.length > 1 ? boardOrder(sel.filter((x) => x !== id)) : [];
    },
    onMove: (from, to, group) => (group.length ? commitDrop(from, to, group) : commitMove(from, to)),
  });

  /** Several cards dropped together: they all land where the deck was dropped, the grabbed one first. */
  const [deal, setDeal] = React.useState<{ n: number; ids: string[]; from: KanbanRect } | null>(null);
  const dealN = React.useRef(0);
  const commitDrop = (from: KanbanPos, to: KanbanPos, group: string[]) => {
    const cols = columnsRef.current;
    const lead = cols[from.col]?.tasks[from.index];
    if (!lead) return;
    const ids = [lead.id, ...group];
    const all = cols.flatMap((c, ci) => c.tasks.map((t) => ({ t, ci })));
    const moving = ids.map((id) => all.find((x) => x.t.id === id)).filter((x): x is { t: Task; ci: number } => !!x);
    const slot = drag.boardRef.current?.querySelector<HTMLElement>('[data-kanban-slot]')?.getBoundingClientRect();
    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => !ids.includes(t.id)) }));
      next[to.col].tasks.splice(Math.min(to.index, next[to.col].tasks.length), 0, ...moving.map((m) => m.t));
      return next;
    });
    const delay: Record<string, number> = {};
    ids.forEach((id, i) => { delay[id] = i * DEAL_STAGGER + DEAL * 0.5; });
    setArrived({ ids, cols: [...new Set([...moving.map((m) => m.ci), to.col])], delay, ms: DEAL + ids.length * DEAL_STAGGER + 700 });
    if (slot) setDeal({ n: ++dealN.current, ids, from: { x: slot.left, y: slot.top, w: slot.width, h: slot.height } });
    setSelected([]);
    setAnnounce(`${ids.length} cards moved to ${cols[to.col].title}.`);
    moving.forEach(({ t, ci }) => { if (ci !== to.col) onTaskMoveRef.current?.({ id: t.id, title: t.title, from: cols[ci].title, to: cols[to.col].title }); });
  };

  // The highlight on a card that just landed, and the counts that ticked, fade after a moment.
  React.useEffect(() => {
    if (!arrived) return undefined;
    const t = window.setTimeout(() => setArrived(null), arrived.ms ?? 1100);
    return () => window.clearTimeout(t);
  }, [arrived]);
  // A card that had focus keeps it through the move, so Alt + → can be pressed again.
  React.useEffect(() => {
    if (!arrived || refocus.current !== arrived.ids[0]) return;
    refocus.current = null;
    drag.blockRef.current?.querySelector<HTMLElement>(`[data-kanban-card="${arrived.ids[0]}"] [tabindex]`)?.focus({ preventScroll: true });
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

  // ---- several cards at once, from the menu: a wave ------------------------
  const [waving, setWaving] = React.useState<{ ids: string[]; col: number } | null>(null);
  const [wave, setWave] = React.useState<{ n: number; ids: string[]; from: Record<string, KanbanRect> } | null>(null);
  const waveN = React.useRef(0);

  const moveMany = (ids: string[], toCol: number) => {
    if (moving || waving || drag.active || state !== 'default') return;
    const cols = columnsRef.current;
    const block = drag.blockRef.current;
    const board = drag.boardRef.current;
    const order = boardOrder(ids);
    if (!block || !board || !order.length || toCol < 0 || toCol >= cols.length) return;
    const all = cols.flatMap((c, ci) => c.tasks.map((t) => ({ t, ci })));
    const moving_ = order.map((id) => all.find((x) => x.t.id === id)!).filter(Boolean);
    const commit = () => setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => !order.includes(t.id)) }));
      next[toCol].tasks.unshift(...moving_.map((m) => m.t));
      return next;
    });
    const wrapUp = (motion: boolean) => {
      const delay: Record<string, number> = {};
      order.forEach((id, i) => { delay[id] = motion ? i * WAVE_STAGGER + WAVE * 0.7 : 0; });
      setArrived({ ids: order, cols: [...new Set([...moving_.map((m) => m.ci), toCol])], delay, ms: (motion ? WAVE + order.length * WAVE_STAGGER : 0) + 1000 });
      setSelected([]);
      setAnnounce(`${order.length} ${order.length === 1 ? 'card' : 'cards'} moved to ${cols[toCol].title}.`);
      moving_.forEach(({ t, ci }) => { if (ci !== toCol) onTaskMoveRef.current?.({ id: t.id, title: t.title, from: cols[ci].title, to: cols[toCol].title }); });
    };
    if (reducedMotion()) { commit(); wrapUp(false); return; }
    const bodies = board.querySelectorAll<HTMLElement>(`.${styles.column__body}`);
    const run = () => {
      const from: Record<string, KanbanRect> = {};
      for (const id of order) {
        const r = block.querySelector<HTMLElement>(`[data-kanban-card="${id}"]`)?.getBoundingClientRect();
        if (r) from[id] = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
      drag.capture();
      commit();
      setWaving({ ids: order, col: toCol });
      setWave({ n: ++waveN.current, ids: order, from });
      wrapUp(true);
      later(() => setWaving(null), WAVE + (order.length - 1) * WAVE_STAGGER + 120);
    };
    const target = bodies[toCol]?.parentElement;
    const br = board.getBoundingClientRect();
    const tr = target?.getBoundingClientRect();
    if (tr && (tr.left < br.left || tr.right > br.right)) {
      board.scrollBy({ left: tr.left < br.left ? tr.left - br.left - 16 : tr.right - br.right + 16, behavior: 'smooth' });
      later(run, 300);
    } else run();
  };

  const scaleOf = (el: HTMLElement, r: DOMRect) => (el.offsetWidth ? r.width / el.offsetWidth || 1 : 1);

  // The wave: each card lifts, arcs across to the top of the new column and settles, a beat after the one before.
  React.useLayoutEffect(() => {
    if (!wave) return;
    const block = drag.blockRef.current;
    wave.ids.forEach((id, i) => {
      const el = block?.querySelector<HTMLElement>(`[data-kanban-card="${id}"]`);
      const f = wave.from[id];
      if (!el || !f) return;
      const now = el.getBoundingClientRect();
      const k = scaleOf(el, now);
      const dx = (f.x - now.left) / k;
      const dy = (f.y - now.top) / k;
      const tilt = dx === 0 ? 0 : dx > 0 ? -2 : 2;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 26}px) rotate(${tilt}deg) scale(1.035)`, offset: 0.5 },
          { transform: 'none' },
        ],
        { duration: WAVE, delay: i * WAVE_STAGGER, easing: WAVE_EASE, fill: 'backwards' },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave]);

  // The gather: as a drag of several begins, the other selected cards fly in from where they were and stack under the
  // grabbed one, a beat apart.
  const gatherFor = drag.active && drag.active.group.length ? drag.active.id : null;
  React.useLayoutEffect(() => {
    const a = drag.active;
    const ov = drag.overlayRef.current;
    if (!a || !ov || !a.group.length) return;
    const reduce = reducedMotion();
    a.group.forEach((id, i) => {
      const el = ov.querySelector<HTMLElement>(`[data-stack-id="${id}"]`);
      const g = a.groupRects[id];
      if (!el || !g) return;
      const p = deckPose(i);
      const pose = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})`;
      const hidden = i >= 3;
      if (reduce) { el.style.transform = pose; el.style.opacity = hidden ? '0' : '1'; return; }
      el.animate(
        [
          { transform: `translate(${g.x - a.origin.x}px, ${g.y - a.origin.y}px)`, opacity: 1 },
          { transform: pose, opacity: hidden ? 0 : 1 },
        ],
        { duration: GATHER, delay: i * GATHER_STAGGER, easing: SETTLE, fill: 'both' },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatherFor]);

  // The deal: where the deck was dropped it opens up into the column, card by card, each from its place in the deck.
  React.useLayoutEffect(() => {
    if (!deal || reducedMotion()) return;
    const block = drag.blockRef.current;
    deal.ids.forEach((id, i) => {
      const el = block?.querySelector<HTMLElement>(`[data-kanban-card="${id}"]`);
      if (!el) return;
      const now = el.getBoundingClientRect();
      const k = scaleOf(el, now);
      const dx = (deal.from.x - now.left) / k;
      const dy = (deal.from.y - now.top) / k;
      const p = i === 0 ? { x: 0, y: 0, r: 0, s: 1 } : deckPose(i - 1);
      el.animate(
        [
          { transform: `translate(${dx + p.x}px, ${dy + p.y}px) rotate(${p.r}deg) scale(${p.s})`, zIndex: String(40 - i) },
          { transform: 'none', zIndex: String(40 - i) },
        ],
        { duration: DEAL, delay: i * DEAL_STAGGER, easing: SETTLE, fill: 'backwards' },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal]);

  // Esc lets go of the selection (unless a menu has already used it to close).
  React.useEffect(() => {
    if (!selected.length) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) setSelected([]); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected.length]);

  // The selection bar stays a moment after the selection empties, to leave rather than vanish.
  const [barShown, setBarShown] = React.useState(false);
  const barCount = React.useRef(0);
  if (selected.length) barCount.current = selected.length;
  React.useEffect(() => {
    if (selected.length) { setBarShown(true); return undefined; }
    const t = window.setTimeout(() => setBarShown(false), 200);
    return () => window.clearTimeout(t);
  }, [selected.length]);

  const stages: BoardCardStage[] = columns.map((c) => ({ id: c.title, label: c.title, color: c.dot }));
  const lifted = drag.active ? drag.active.from : null;
  const aim = drag.active ? drag.target : null;
  const liftedTask = lifted ? columns[lifted.col]?.tasks[lifted.index] : undefined;
  const carried = drag.active?.group ?? [];
  const carriedTasks = carried.map((id) => columns.flatMap((c) => c.tasks).find((t) => t.id === id)).filter((t): t is Task => !!t);
  // the slot for a deck is as tall as its cards will be once they open up
  const liftedHeight = drag.active
    ? drag.active.height + carried.reduce((h, id) => h + (drag.active!.groupRects[id]?.h ?? 0) + 10, 0)
    : undefined;
  const busy = !!(drag.active || moving || waving);
  const flying = new Set([...(moving ? [moving.id] : []), ...(waving?.ids ?? [])]);
  const commonStage = (() => {
    const cs = new Set(columns.filter((c) => c.tasks.some((t) => selected.includes(t.id))).map((c) => c.title));
    return cs.size === 1 ? [...cs][0] : undefined;
  })();

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
        const leaving = (lifted && lifted.col === colIndex ? 1 : 0) + col.tasks.filter((t) => carried.includes(t.id)).length;
        // a column that has been emptied (its last card moved on) shows the drop zone, unless a card is on its way in
        const emptied = state === 'default' && col.tasks.length - leaving === 0 && !incoming;
        const variant =
          state === 'loading' ? 'loading' : isEmptyCol || emptied ? 'empty' : 'default';

        return (
          <Column
            key={col.title}
            isTarget={(!!lifted && aim?.col === colIndex && (aim.col !== lifted.col || carried.length > 0)) || moving?.col === colIndex || waving?.col === colIndex}
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
                .filter(({ task, i }) => !(lifted && lifted.col === colIndex && lifted.index === i) && !carried.includes(task.id));
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
                const isSelected = selected.includes(task.id);
                const inGroup = isSelected && selected.length > 1;
                const wrapper = {
                  ...drag.cardProps({ col: colIndex, index: i }, task.id),
                  ...(arrived?.ids.includes(task.id)
                    ? { 'data-arrived': '', style: { ['--arrive' as string]: col.dot, ['--arrive-delay' as string]: `${arrived.delay?.[task.id] ?? 0}ms` } as React.CSSProperties }
                    : {}),
                  // while cards move on, they glide slowly and softly, and their neighbours make room at the same pace
                  ...(moving || waving ? { 'data-flip-duration': String(MAKE_ROOM), 'data-flip-ease': GLIDE } : {}),
                  ...(flying.has(task.id) ? { 'data-moving': '', 'data-flip-skip': '' } : {}),
                  // a click with Cmd / Ctrl / Shift picks a card; once some are picked, a plain click does too
                  onClick: (e: React.MouseEvent) => {
                    if (state !== 'default' || (e.target as HTMLElement).closest('button, input, label, a, [role="checkbox"]')) return;
                    if (e.metaKey || e.ctrlKey || e.shiftKey || selectedRef.current.length) { e.preventDefault(); toggle(task.id); }
                  },
                };
                const mover: MoverProps | undefined = state === 'default'
                  ? {
                      stages,
                      stage: col.title,
                      moveDisabled: busy,
                      moveSubject: inGroup ? `${selected.length} cards` : undefined,
                      onMoveTo: (id) => {
                        const toCol = columns.findIndex((c) => c.title === id);
                        // the button on a selected card moves the whole selection
                        if (inGroup) moveMany(selectedRef.current, toCol);
                        else startMove({ col: colIndex, index: i }, toCol);
                      },
                    }
                  : undefined;
                const select: SelectProps | undefined = state === 'default' ? { checked: isSelected, onToggle: () => toggle(task.id) } : undefined;
                return renderTask(task, task.id, 'default', wrapper, mover, select);
              });
              if (aim && aim.col === colIndex) {
                nodes.splice(aim.index, 0, (
                  liftedTask && (
                    <DropSlot
                      key="slot"
                      task={liftedTask}
                      height={liftedHeight}
                      count={carried.length + 1}
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
        {/* a drag of several: the others gather under the grabbed card as a deck (deepest first, so the nearest is on top) */}
        {carriedTasks.slice().reverse().map((t) => (
          <div key={t.id} className={styles.stackCard} data-stack-id={t.id}>{renderTask(t, `stack-${t.id}`)}</div>
        ))}
        <div className={carriedTasks.length ? styles.stackTop : undefined}>{renderTask(liftedTask, 'overlay')}</div>
        {carriedTasks.length > 0 && <span className={styles.stackCount}>{carriedTasks.length + 1}</span>}
      </div>
    )}

    {/* The selection bar: what is picked, and where to send it. */}
    {state === 'default' && barShown && (
      <div className={styles.barDock}>
        <div className={[styles.bar, selected.length ? '' : styles['bar--out']].filter(Boolean).join(' ')} role="toolbar" aria-label="Selected cards">
          <span key={barCount.current} className={styles.bar__count}>{barCount.current}</span>
          <span className={styles.bar__label}>selected</span>
          <span className={styles.bar__divider} aria-hidden />
          <StageMenu
            variant="bar"
            stages={stages}
            current={commonStage}
            subject={`${barCount.current} ${barCount.current === 1 ? 'card' : 'cards'}`}
            disabled={busy || !selected.length}
            onMove={(id) => moveMany(selectedRef.current, columns.findIndex((c) => c.title === id))}
          />
          <button type="button" className={styles.bar__clear} aria-label="Clear selection" onClick={() => setSelected([])}>
            <IconX size={16} aria-hidden />
          </button>
        </div>
      </div>
    )}
    <div className={styles.srOnly} role="status" aria-live="polite">{announce}</div>
    </div>
  );
};

export default KanbanBoardBlock;
