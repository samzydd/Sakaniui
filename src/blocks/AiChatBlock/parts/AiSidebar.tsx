/**
 * AiSidebar: the app sidebar shared by AiChatBlock and AiWelcomeBlock. Built only from the Sidebar parts: SidebarHeader
 * (brand + toggle), SidebarItem (nav, flat active state), SidebarGroupLabel + SidebarSubItem (pinned and recent chats) and
 * SidebarFooter (user + menu). Copy it and change the lists.
 */

import React from 'react';
import { IconPencil } from '../../../icons/outline/pencil';
import { IconSearch } from '../../../icons/outline/search';
import { IconFolder } from '../../../icons/outline/folder';
import { IconBook } from '../../../icons/outline/book';
import { IconClock } from '../../../icons/outline/clock';
import { IconAdjustmentsHorizontal } from '../../../icons/outline/adjustments-horizontal';
import { Sidebar } from '../../../components/Sidebar';
import { SidebarHeader } from '../../../components/SidebarHeader';
import { SidebarItem } from '../../../components/SidebarItem';
import { SidebarGroupLabel } from '../../../components/SidebarGroupLabel';
import { SidebarSubItem } from '../../../components/SidebarSubItem';
import { SidebarFooter } from '../../../components/SidebarFooter';
import { SakaniLogo } from '../../../lib/SakaniLogo';
import styles from './AiSidebar.module.css';

export const AI_NAV = [
  { key: 'new', icon: IconPencil, label: 'New chat' },
  { key: 'search', icon: IconSearch, label: 'Search' },
  { key: 'projects', icon: IconFolder, label: 'Projects' },
  { key: 'library', icon: IconBook, label: 'Library' },
  { key: 'scheduled', icon: IconClock, label: 'Scheduled' },
  { key: 'customize', icon: IconAdjustmentsHorizontal, label: 'Customize' },
] as const;

export type AiNavKey = (typeof AI_NAV)[number]['key'];

export const AI_PINNED = ['Renewal playbook', 'Q4 forecast'];
export const AI_RECENTS = ['Pipeline review', 'Draft a renewal email', 'Summarize the Acme call', 'Clean duplicate contacts', 'Find stalled deals', "Prepare Monday's forecast", 'Territory planning'];

export interface AiSidebarProps {
  /** The nav row that is open. Default none. */
  activeNav?: AiNavKey;
  /** The chat that is open, by its title. */
  activeChat?: string;
  onNav?: (key: AiNavKey) => void;
  onChat?: (title: string) => void;
  user?: { name: string; plan: string; initials: string };
}

export const AiSidebar: React.FC<AiSidebarProps> = ({ activeNav, activeChat, onNav, onChat, user = { name: 'Samuel Okpere', plan: 'Pro plan', initials: 'SO' } }) => (
  <div className={styles.root}>
    <Sidebar>
      <SidebarHeader type="brand-toggle" title="Sakani AI" subtitle="AI assistant" logo={<SakaniLogo />} />
      <div className={styles.nav}>
        {AI_NAV.map(({ key, icon, label }) => (
          <SidebarItem key={key} icon={icon} label={label} active={activeNav === key} activeIndicator={false} onClick={() => onNav?.(key)} />
        ))}
      </div>
      <div className={styles.lists}>
        <div className={styles.group}>
          <SidebarGroupLabel>Pinned</SidebarGroupLabel>
          <div className={styles.items}>
            {AI_PINNED.map((t) => <SidebarSubItem key={t} label={t} active={activeChat === t} onClick={() => onChat?.(t)} />)}
          </div>
        </div>
        <div className={styles.group}>
          <SidebarGroupLabel>Recents</SidebarGroupLabel>
          <div className={styles.items}>
            {AI_RECENTS.map((t) => <SidebarSubItem key={t} label={t} active={activeChat === t} onClick={() => onChat?.(t)} />)}
          </div>
        </div>
      </div>
      <SidebarFooter type="user-menu" title={user.name} subtitle={user.plan} avatarInitials={user.initials} />
    </Sidebar>
  </div>
);

export default AiSidebar;
