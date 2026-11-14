/**
 * SidebarItem
 *
 * Primary nav item. Matches Figma "Sidebar Item":
 *   State (Default|Hover|Active - Indicator|Active - Default|Focus|Disabled) x Collapsed (No|Yes),
 *   with Badge + Submenu-chevron toggles and a swappable Lucide icon (default: house).
 *
 * Figma spec (read from the component, expanded AND collapsed):
 *   - radius-sm (6), padding 6/10 expanded / 8 collapsed, gap 10, label/md
 *   - LEFT ACCENT BAR: 3x20px brand/default rounded pill — present in BOTH expanded
 *     and collapsed layouts, shown when active AND indicator-styled
 *   - Default/Hover: icon+label fg/muted->fg/default, badge bg/muted + fg/muted text
 *   - Active states (Figma gives collapsed the same Indicator/Default split as expanded; neither has a hover look,
 *     the active item does not react to the pointer):
 *       "- Indicator": bg/surface card + the left accent bar, opt-in via
 *         `activeIndicator` (default true, so existing `active` usages render
 *         unchanged). shadow/xs (0 1px 1px rgba(16,15,12,.05)), the same under the pointer,
 *         in BOTH collapsed and expanded.
 *       "- Default": flat bg/subtle tint, no bar, no shadow. Used by passing
 *         `activeIndicator={false}`, collapsed or expanded. Also the same under the pointer.
 *     Both flavors: icon+label fg/default, badge bg accent/default + fg/on-accent
 *     text, chevron accent-tinted.
 *   - Disabled: fg/subtle
 *
 * Dark mode: all colors are semantic tokens, so the .dark class re-themes automatically.
 */

import React from 'react';
import { IconChevronRight as ChevronRight } from '../../icons/outline/chevron-right';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import styles from './SidebarItem.module.css';
import type { IconComponent } from '../../icons/types';

export interface SidebarItemProps {
  icon?: IconComponent;
  label: string;
  active?: boolean;
  /** Only matters when `active`. true (default) = bg/surface card + shadow +
   * left accent bar ("Active - Indicator"). false = flat bg/subtle tint, no
   * bar, no shadow ("Active - Default"). Works the same collapsed or not —
   * Figma now defines both flavors in both layouts. */
  activeIndicator?: boolean;
  disabled?: boolean;
  badge?: string;
  hasSubmenu?: boolean;
  collapsed?: boolean;
  /** Only matters when `hasSubmenu`. Rotates the chevron 90° (pointing down)
   * to show the section is open; the resting state points right, toward a
   * closed section — matches Figma's collapsible "Navigation group" /
   * "Project group" headers (node 2307:42338, e.g. 2308:18305 "Projects"
   * expanded vs 2308:18387 "Website refresh" collapsed). Not a navigation
   * disclosure like `active` — the caller owns the open/closed state and
   * toggles this alongside conditionally rendering the children. */
  expanded?: boolean;
  onClick?: () => void;
  href?: string;
  /** Native title-attribute tooltip on collapse. Defaults to true; set
   * false when the caller already wraps this in its own Tooltip component
   * to avoid the two competing on hover. */
  nativeTooltip?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon, label, active, activeIndicator = true, disabled, badge, hasSubmenu, collapsed, expanded, onClick, href, nativeTooltip = true,
}) => {
  const isActiveIndicator = active && activeIndicator;
  const isActiveDefault = active && !activeIndicator;
  const cls = [
    styles.item,
    isActiveIndicator ? styles['item--active'] : '',
    isActiveDefault ? styles['item--active-flat'] : '',
    disabled ? styles['item--disabled'] : '',
    collapsed ? styles['item--collapsed'] : '',
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {/* Left accent bar — brand/default pill, present in both layouts, visible when active */}
      <span className={styles.item__bar} aria-hidden="true" />

      {Icon && <span className={styles.item__icon} aria-hidden="true"><Icon size={18} strokeWidth={iconStrokeWidth(18)} /></span>}
      <span className={[styles.item__label, collapsed ? styles['item__label--collapsed'] : ''].filter(Boolean).join(' ')}>{label}</span>
      {!collapsed && badge && <span className={styles.item__badge}>{badge}</span>}
      {!collapsed && hasSubmenu && (
        <span className={[styles.item__chevron, expanded ? styles['item__chevron--expanded'] : ''].filter(Boolean).join(' ')} aria-hidden="true">
          <ChevronRight size={16} strokeWidth={iconStrokeWidth(16)} />
        </span>
      )}
    </>
  );

  const common = {
    className: cls,
    // the active item is where you are, so it has no hover: the shared gliding highlight skips it
    'data-hover-item': active ? 'off' : '',
    title: collapsed && nativeTooltip ? label : undefined,
    // Collapsed items have no visible text — keep an accessible name for
    // screen readers even when the native title tooltip is suppressed in
    // favor of a caller-supplied Tooltip component.
    'aria-label': collapsed ? label : undefined,
    'aria-current': active ? ('page' as const) : undefined,
    // A collapsible group header announces its open/closed state.
    'aria-expanded': hasSubmenu && expanded !== undefined ? expanded : undefined,
  };
  if (href && !disabled) return <a href={href} {...common}>{content}</a>;
  return <button type="button" disabled={disabled} onClick={onClick} {...common}>{content}</button>;
};

export default SidebarItem;
