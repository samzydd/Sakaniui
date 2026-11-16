/**
 * Table
 *
 * Data table. Matches Figma "Table":
 *   - container: bg/surface, border/subtle 1px, radius-md
 *   - header row: bg/canvas, 44px, overline text (Geist), fg/muted, border/subtle divider
 *   - body rows: 44px, body/sm text (Geist), border/subtle dividers
 *   - selectable: custom checkbox — 18px, radius-sm, bg/surface, subtle border + shadow/sm
 *     drop shadow (NOT a heavy stroke), accent/default when checked
 *
 * Dark mode: all colors are semantic tokens, so .dark re-themes automatically.
 */

import React from 'react';
import { IconGripVertical as GripVertical } from '../../icons/outline/grip-vertical';
import styles from './Table.module.css';
import { useHoverHighlight } from '../../lib/useHoverHighlight';

export interface TableColumn<T> {
  key: keyof T & string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  selectable?: boolean;
  selectedRows?: number[];
  onSelectionChange?: (indices: number[]) => void;
  rowKey?: (row: T, index: number) => string | number;
  /** Enable drag-to-reorder on rows. Fires with the new row order. */
  reorderable?: boolean;
  onReorder?: (rows: T[]) => void;
  /** Draws the table's own container border/radius. Defaults to true; set
   * false when nesting inside a card that already has its own border
   * (Figma: some Table instances sit borderless inside a Panel). */
  bordered?: boolean;
  /** Matches Figma's "Responsive" variant (Default / Stacked).
   * - 'auto' (default): renders as a normal table, and switches to the
   *   stacked card layout automatically below --bp-sm (640px).
   * - 'default' / 'stacked': force one layout regardless of viewport —
   *   useful for Storybook, tests, or a deliberately narrow container. */
  responsive?: 'auto' | 'default' | 'stacked';
  className?: string;
}

/** matches --bp-sm in tokens.css / the Figma "Breakpoints" collection.
 *  Kept as a plain constant (not read from the CSS variable) because
 *  matchMedia needs a literal px value; the two are meant to be edited
 *  together if the breakpoint ever changes. */
const BP_SM = 640;

function useTableResponsiveMode(mode: 'auto' | 'default' | 'stacked'): 'default' | 'stacked' {
  const [isNarrow, setIsNarrow] = React.useState(false);

  React.useEffect(() => {
    if (mode !== 'auto') return;
    const mq = window.matchMedia(`(max-width: ${BP_SM}px)`);
    setIsNarrow(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  if (mode === 'default') return 'default';
  if (mode === 'stacked') return 'stacked';
  return isNarrow ? 'stacked' : 'default';
}

/** Custom checkbox matching Figma: rounded box with shadow/sm, accent fill + check when on. */
const TableCheckbox: React.FC<{
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, indeterminate, onChange, label }) => {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = Boolean(indeterminate); }, [indeterminate]);
  return (
    <label className={styles.checkbox}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className={styles.checkbox__input} aria-label={label} />
      <span className={styles.checkbox__box} aria-hidden="true">
        <svg className={styles.checkbox__check} width={12} height={12} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className={styles.checkbox__dash} />
      </span>
    </label>
  );
};

/** Where a selected row's index lands after the row at `from` is dragged to `to` (the same splice the table does to
 *  its rows): the dragged row keeps its tick, and the rows it passed shift by one. */
function moveSelection(selected: number[], from: number, to: number): number[] {
  return selected.map((s) => {
    if (s === from) return to;
    if (from < to && s > from && s <= to) return s - 1;
    if (from > to && s >= to && s < from) return s + 1;
    return s;
  });
}

export function Table<T>({
  columns, rows, selectable, selectedRows, onSelectionChange, rowKey, reorderable, onReorder, bordered = true,
  responsive = 'auto', className,
}: TableProps<T>) {
  const mode = useTableResponsiveMode(responsive);
  const isControlled = selectedRows !== undefined;
  const [internal, setInternal] = React.useState<number[]>([]);
  const selected = isControlled ? selectedRows! : internal;

  const setSelected = (next: number[]) => {
    if (!isControlled) setInternal(next);
    onSelectionChange?.(next);
  };

  const allSelected = rows.length > 0 && selected.length === rows.length;
  const someSelected = selected.length > 0 && !allSelected;
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);
  const hover = useHoverHighlight<HTMLDivElement>();

  const handleDrop = () => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null); setOverIndex(null); return;
    }
    const next = [...rows];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIndex, 0, moved);
    // The selection is a list of row positions, so it has to move with the rows or it would stay on the old slots.
    if (selected.length > 0) setSelected(moveSelection(selected, dragIndex, overIndex));
    onReorder?.(next);
    setDragIndex(null); setOverIndex(null);
  };

  const toggleAll = () => setSelected(allSelected ? [] : rows.map((_, i) => i));
  const toggleRow = (i: number) =>
    setSelected(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i]);

  /**
   * Clicking anywhere in a selectable row ticks that row's checkbox, so the
   * whole row is the hit target rather than an 18px box at its left edge.
   *
   * Two things are deliberately left alone. Anything interactive a cell
   * renders -- a link, a button, a form control, and the checkbox's own
   * <label> -- keeps its own behaviour: the label already toggles the input,
   * so letting the row handle that click too would toggle twice and land back
   * where it started. And a click that finished a text selection is someone
   * copying a cell's contents, not choosing a row.
   *
   * The checkbox stays the keyboard path; this adds a pointer affordance
   * rather than replacing it, so no extra tab stop is introduced.
   */
  const handleRowClick = (i: number) => (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea, label, [role="button"], [draggable="true"]')) return;
    if (!window.getSelection()?.isCollapsed) return;
    toggleRow(i);
  };

  if (mode === 'stacked') {
    return (
      <div className={[styles.stackedList, className ?? ''].filter(Boolean).join(' ')} role="list">
        {rows.map((row, i) => {
          const isSel = selected.includes(i);
          return (
            <div
              key={rowKey ? rowKey(row, i) : i}
              role="listitem"
              onClick={selectable ? handleRowClick(i) : undefined}
              className={[
                styles.card,
                isSel ? styles['card--selected'] : '',
                selectable ? styles['card--selectable'] : '',
              ].filter(Boolean).join(' ')}
            >
              {selectable && (
                <div className={styles.card__selectRow}>
                  <TableCheckbox checked={isSel} onChange={() => toggleRow(i)} label={`Select row ${i + 1}`} />
                </div>
              )}
              {columns.map((col) => (
                <div key={col.key} className={styles.card__field}>
                  <span className={styles.card__label}>{col.header}</span>
                  <span className={styles.card__value}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={hover.ref}
      {...hover.groupProps}
      className={[styles.wrap, bordered ? styles['wrap--bordered'] : '', className ?? ''].filter(Boolean).join(' ')}
    >
      {hover.highlight}
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            {reorderable && <th className={styles.dragCell} aria-hidden="true" />}
            {selectable && (
              <th className={styles.checkCell}>
                <TableCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label="Select all rows" />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className={styles.headerCell} style={{ textAlign: col.align ?? 'left', width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isSel = selected.includes(i);
            return (
              <tr
                key={rowKey ? rowKey(row, i) : i}
                data-hover-item=""
                onClick={selectable ? handleRowClick(i) : undefined}
                onDragOver={reorderable ? (e) => { e.preventDefault(); setOverIndex(i); } : undefined}
                onDrop={reorderable ? handleDrop : undefined}
                onDragEnd={reorderable ? () => { setDragIndex(null); setOverIndex(null); } : undefined}
                className={[
                  styles.bodyRow,
                  selectable ? styles['bodyRow--selectable'] : '',
                  isSel ? styles['bodyRow--selected'] : '',
                  overIndex === i && dragIndex !== null && dragIndex !== i ? styles['bodyRow--dropTarget'] : '',
                  dragIndex === i ? styles['bodyRow--dragging'] : '',
                ].filter(Boolean).join(' ')}
              >
                {/* Grip lives to the left of everything else, hidden until the
                    row is hovered (see .dragHandle), so the row doesn't look
                    draggable until you're actually pointing at it. `draggable`
                    sits on this handle rather than the <tr> so dragging only
                    starts from the grip -- clicking a badge, a checkbox, or
                    selecting cell text no longer accidentally drags the row.
                    setDragImage still points at the whole row (closest('tr')
                    from the handle) so the drag preview is the full row, not
                    just this 14px icon. */}
                {reorderable && (
                  <td className={styles.dragCell}>
                    <span
                      className={styles.dragHandle}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setDragImage(e.currentTarget.closest('tr')!, 0, 0);
                        setDragIndex(i);
                      }}
                      aria-hidden="true"
                    >
                      <GripVertical size={14} strokeWidth={1.5} />
                    </span>
                  </td>
                )}
                {selectable && (
                  <td className={styles.checkCell}>
                    <TableCheckbox checked={isSel} onChange={() => toggleRow(i)} label={`Select row ${i + 1}`} />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={styles.bodyCell} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
