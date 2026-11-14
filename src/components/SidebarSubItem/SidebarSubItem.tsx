/**
 * SidebarSubItem
 *
 * Nested nav item. Matches Figma "Sidebar Sub Item": State (Default|Hover|Active|Disabled).
 * Figma spec: radius-sm, padding 0/10, label/sm. Default/Hover fg/muted, Active fg/default.
 * Indented under a parent SidebarItem (no icon).
 */

import React from 'react';
import styles from './SidebarSubItem.module.css';

export interface SidebarSubItemProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}

export const SidebarSubItem: React.FC<SidebarSubItemProps> = ({ label, active, disabled, onClick, href }) => {
  const cls = [
    styles.subItem,
    active ? styles['subItem--active'] : '',
    disabled ? styles['subItem--disabled'] : '',
  ].filter(Boolean).join(' ');
  const common = { className: cls, 'data-hover-item': active ? 'off' : '', 'aria-current': active ? ('page' as const) : undefined };
  const content = (
    <>
      <span className={styles.subItem__dot} aria-hidden="true" />
      <span className={styles.subItem__label}>{label}</span>
    </>
  );
  if (href && !disabled) return <a href={href} {...common}>{content}</a>;
  return <button type="button" disabled={disabled} onClick={onClick} {...common}>{content}</button>;
};

export default SidebarSubItem;
