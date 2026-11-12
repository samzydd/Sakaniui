/**
 * AiNav: where the AI blocks keep their sidebar on a narrow screen.
 *
 * Wide (the block is over 720px): the sidebar sits beside the conversation, as in Figma.
 * Narrow: it leaves the layout and slides in from the left as a drawer over a scrim, opened from a menu button
 * (AiNavButton) in the block's top row. Escape, the scrim, or picking a destination closes it. While closed it is
 * hidden from the tab order and from assistive tech.
 *
 * The block root must be the size container: `container: aiblock / inline-size` (AiChatBlock and AiWelcomeBlock do it).
 */
import React from 'react';
import { IconButton } from '../../../components/IconButton';
import { IconMenu2 } from '../../../icons/outline/menu-2';
import styles from './AiNav.module.css';

export function useAiNav() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return { open, setOpen };
}

export const AiNav: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({ open, onClose, children }) => (
  <>
    <div className={styles.nav} data-open={open || undefined}>{children}</div>
    <div className={styles.scrim} data-open={open || undefined} onClick={onClose} aria-hidden="true" />
  </>
);

export const AiNavButton: React.FC<{ open: boolean; onOpen: () => void; className?: string }> = ({ open, onOpen, className }) => (
  <IconButton
    icon={IconMenu2}
    variant="ghost"
    size="sm"
    aria-label="Open navigation"
    aria-expanded={open}
    onClick={onOpen}
    className={[styles.menu, className ?? ''].filter(Boolean).join(' ')}
  />
);
