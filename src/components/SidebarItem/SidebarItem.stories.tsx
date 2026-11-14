import type { Meta, StoryObj } from '@storybook/react';
import { IconHome as House } from '../../icons/outline/home';
import { IconChartLine as ChartLine } from '../../icons/outline/chart-line';
import { IconSettings as Settings } from '../../icons/outline/settings';
import { SidebarItem } from './SidebarItem';

const meta = {
  title: 'Composite/Sidebar/Item',
  component: SidebarItem,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: `Primary nav item. Matches Figma "Sidebar Item":
State (Default|Hover|Active - Indicator|Active - Default|Focus|Disabled) x Collapsed (No|Yes),
with Badge + Submenu-chevron toggles and a swappable Lucide icon (default: house).

Figma spec (read from the component, expanded AND collapsed):
- radius-sm (6), padding 6/10 expanded / 8 collapsed, gap 10, label/md
- LEFT ACCENT BAR: 3x20px brand/default rounded pill — present in BOTH expanded
and collapsed layouts, shown when active AND indicator-styled
- Default/Hover: icon+label fg/muted->fg/default, badge bg/muted + fg/muted text
- Active states (collapsed has the same Indicator/Default split as expanded; the
active item has no hover look, the pointer changes nothing on it):
"- Indicator": bg/surface card + the left accent bar, opt-in via
\`activeIndicator\` (default true, so existing \`active\` usages render unchanged).
shadow/xs, in BOTH collapsed and expanded.
"- Default": flat bg/subtle tint, no bar, no shadow. Used by passing
\`activeIndicator={false}\`, collapsed or expanded.
Both flavors: icon+label fg/default, badge bg accent/default + fg/on-accent
text, chevron accent-tinted.
- Disabled: fg/subtle

Dark mode: all colors are semantic tokens, so the .dark class re-themes automatically.` } } },
  args: { icon: House, label: 'Dashboard' },
  decorators: [(S) => <div style={{ width: 224, padding: 12, background: 'var(--color-bg-surface)' }}><S /></div>],
} satisfies Meta<typeof SidebarItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };
export const ActiveDefault: Story = { args: { active: true, activeIndicator: false } };
export const WithBadge: Story = { args: { badge: '12' } };
export const WithSubmenu: Story = { args: { hasSubmenu: true } };
/** Collapsible group header: `expanded` rotates the chevron down (open) vs
 * the resting right-pointing state (closed). The caller owns the toggle. */
export const CollapsibleGroupExpanded: Story = { args: { hasSubmenu: true, expanded: true, label: 'Projects' } };
export const CollapsibleGroupCollapsed: Story = { args: { hasSubmenu: true, expanded: false, label: 'Website refresh' } };
export const Disabled: Story = { args: { disabled: true } };
export const Collapsed: Story = { args: { collapsed: true }, decorators: [(S) => <div style={{ width: 64, padding: 12, background: 'var(--color-bg-surface)' }}><S /></div>] };
export const CollapsedActiveDefault: Story = { args: { collapsed: true, active: true, activeIndicator: false }, decorators: [(S) => <div style={{ width: 64, padding: 12, background: 'var(--color-bg-surface)' }}><S /></div>] };

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SidebarItem icon={House} label="Default" />
      <SidebarItem icon={ChartLine} label="Active - Indicator" active />
      <SidebarItem icon={ChartLine} label="Active - Default" active activeIndicator={false} />
      <SidebarItem icon={Settings} label="With badge" badge="3" />
      <SidebarItem icon={Settings} label="Disabled" disabled />
    </div>
  ),
};

/** Dark mode — active accent bar + accent/subtle background re-theme via .dark. */
export const DarkMode: Story = {
  decorators: [(S) => (
    <div className="dark" style={{ width: 224, padding: 12, background: 'var(--color-bg-surface)' }}><S /></div>
  )],
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SidebarItem icon={House} label="Default" />
      <SidebarItem icon={ChartLine} label="Active - Indicator" active />
      <SidebarItem icon={ChartLine} label="Active - Default" active activeIndicator={false} />
      <SidebarItem icon={Settings} label="With badge" badge="3" />
    </div>
  ),
};
