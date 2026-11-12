/**
 * ComposerOptions: the quiet row under the prompt box: a place or scope on the left, the model and its mode on the right. Plain
 * buttons with a chevron; wire each to your own Menu. They are the model picker the composer no longer carries.
 */

import React from 'react';
import { IconChevronDown } from '../../../icons/outline/chevron-down';
import { IconFolder } from '../../../icons/outline/folder';
import { IconSparkles } from '../../../icons/outline/sparkles';
import { iconStrokeWidth } from '../../../lib/iconStrokeWidth';
import styles from './ComposerOptions.module.css';
import type { IconComponent } from '../../../icons/types';

const Option: React.FC<{ icon?: IconComponent; accent?: boolean; label: string; extra?: string; onClick?: () => void }> = ({ icon: Icon, accent, label, extra, onClick }) => (
  <button type="button" className={styles.option} onClick={onClick} aria-haspopup="menu">
    {Icon && <Icon size={16} strokeWidth={iconStrokeWidth(16)} className={accent ? styles.accent : undefined} aria-hidden="true" />}
    <span>{label}</span>
    {extra && <span className={styles.extra}>{extra}</span>}
    <IconChevronDown size={12} strokeWidth={iconStrokeWidth(12)} aria-hidden="true" />
  </button>
);

export interface ComposerOptionsProps {
  scope?: string;
  model?: string;
  effort?: string;
  mode?: string;
}

export const ComposerOptions: React.FC<ComposerOptionsProps> = ({ scope = 'All accounts', model = 'Sakani 1', effort = 'Medium', mode = 'Auto' }) => (
  <div className={styles.row}>
    <div className={styles.group}><Option icon={IconFolder} label={scope} /></div>
    <div className={styles.group}>
      <Option icon={IconSparkles} accent label={model} extra={effort} />
      <Option label={mode} />
    </div>
  </div>
);

export default ComposerOptions;
