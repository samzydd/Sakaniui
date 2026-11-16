import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './Table';
import { Badge } from '../Badge/Badge';

interface User { name: string; email: string; role: string; status: 'active' | 'invited' | 'suspended'; }

const rows: User[] = [
  { name: 'Sam Okpere', email: 'sam@sakani.com', role: 'Owner', status: 'active' },
  { name: 'Ada Obi', email: 'ada@sakani.com', role: 'Admin', status: 'active' },
  { name: 'John Bull', email: 'john@sakani.com', role: 'Member', status: 'invited' },
  { name: 'Zara Ali', email: 'zara@sakani.com', role: 'Member', status: 'suspended' },
];

const statusColor = { active: 'success', invited: 'info', suspended: 'danger' } as const;

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status', render: (r: User) => (
    <Badge variant={statusColor[r.status]} emphasis="subtle">{r.status}</Badge>
  ) },
] as const;

const meta = {
  title: 'Composite/Table',
  component: Table,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Data table. Matches Figma "Table":
- container: bg/surface, border/subtle 1px, radius-md
- header row: bg/canvas, 44px, overline text (Geist), fg/muted, border/subtle divider
- body rows: 44px, body/sm text (Geist), border/subtle dividers
- selectable: custom checkbox — 18px, radius-sm, bg/surface, subtle border + shadow/sm
drop shadow (NOT a heavy stroke), accent/default when checked

Dark mode: all colors are semantic tokens, so .dark re-themes automatically.` } } },
  decorators: [(S) => <div style={{ width: 720 }}><S /></div>],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = { render: () => <Table columns={columns as any} rows={rows} /> };
export const Selectable: Story = { render: () => <Table columns={columns as any} rows={rows} selectable /> };

/** Dark mode — the .dark class flips the semantic token layer; no component changes needed. */
export const DarkMode: Story = {
  decorators: [(S) => <div className="dark" style={{ width: 720, padding: 24, background: 'var(--color-bg-canvas)' }}><S /></div>],
  render: () => <Table columns={columns as any} rows={rows} selectable />,
};

/** Matches Figma "Table" → Responsive=Stacked. Forced on regardless of viewport,
 * so it's reviewable at any width — each row becomes a card, each column a
 * label:value field. This is what `responsive="auto"` switches to automatically
 * below --bp-sm (640px). */
export const Stacked: Story = {
  decorators: [(S) => <div style={{ width: 360 }}><S /></div>],
  render: () => <Table columns={columns as any} rows={rows} selectable responsive="stacked" />,
};

/** Default mode is "auto" — resize this story's viewport (or the Storybook
 * canvas) across 640px to see it switch between the table and stacked layouts
 * live, with no prop change required. */
export const AutoResponsive: Story = {
  decorators: [(S) => <div style={{ width: '100%', maxWidth: 720, resize: 'horizontal', overflow: 'auto', border: '1px dashed var(--color-border-subtle)', padding: 16 }}><S /></div>],
  render: () => <Table columns={columns as any} rows={rows} selectable />,
};

/** Hover a row to reveal the grip handle at its left edge -- the affordance
 * that the row can be dragged. Drag only starts from the grip itself (not
 * anywhere in the row), so selecting a status badge or its text doesn't
 * accidentally start a drag. */
export const Reorderable: Story = {
  render: function Render() {
    function ReorderableTable() {
      const [order, setOrder] = useState(rows);
      return <Table columns={columns as any} rows={order} rowKey={(r) => r.email} reorderable onReorder={setOrder} />;
    }
    return <ReorderableTable />;
  },
};

/** A selected row stays selected when it is dragged: the ticks follow the rows, not the positions. Tick a row or two,
 * then drag one of them (or a row they pass) to a new place. */
export const ReorderableWithSelection: Story = {
  render: function Render() {
    function SelectableReorderable() {
      const [order, setOrder] = useState(rows);
      const [sel, setSel] = useState<number[]>([1]);
      return <Table columns={columns as any} rows={order} rowKey={(r) => r.email} selectable selectedRows={sel} onSelectionChange={setSel} reorderable onReorder={setOrder} />;
    }
    return <SelectableReorderable />;
  },
};
