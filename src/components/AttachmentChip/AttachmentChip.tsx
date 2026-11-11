/**
 * AttachmentChip
 *
 * A file or image attached to a prompt. Matches Figma "Attachment Chip": Type File | Image | Uploading | Error.
 *
 *   file       an icon tile, the name and a meta line ("PDF · 2.4 MB")
 *   image      the same with a thumbnail (`preview`) in the tile
 *   uploading  an ember ring in the tile and an ember progress line along the bottom (`progress`, 0-100)
 *   error      a danger tile, border and meta line
 *
 * It arrives scaling from 0.96 and fading in (180ms); `progress` eases between values (160ms). Pass `onRemove` for the x.
 */

import React from 'react';
import { IconFileText } from '../../icons/outline/file-text';
import { IconPhoto } from '../../icons/outline/photo';
import { IconAlertTriangle } from '../../icons/outline/alert-triangle';
import { IconX } from '../../icons/outline/x';
import { iconStrokeWidth } from '../../lib/iconStrokeWidth';
import { EmberRing } from '../../lib/EmberRing';
import styles from './AttachmentChip.module.css';

export type AttachmentChipType = 'file' | 'image' | 'uploading' | 'error';

export interface AttachmentChipProps {
  type?: AttachmentChipType;
  name: string;
  /** The second line: "PDF · 2.4 MB". Uploading and error replace it with their own text unless you pass one. */
  meta?: string;
  /** Image thumbnail URL (type="image"). */
  preview?: string;
  /** 0-100 (type="uploading"). */
  progress?: number;
  /** Shows the x. */
  onRemove?: () => void;
  className?: string;
}

export const AttachmentChip: React.FC<AttachmentChipProps> = ({ type = 'file', name, meta, preview, progress = 0, onRemove, className }) => {
  const pct = Math.min(100, Math.max(0, progress));
  const text = meta ?? (type === 'uploading' ? `Uploading ${Math.round(pct)}%` : type === 'error' ? 'Upload failed. Try again' : '');
  return (
    <div className={[styles.chip, styles[`chip--${type}`], className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.row}>
        <span className={styles.preview} aria-hidden="true" style={type === 'image' && preview ? { backgroundImage: `url(${preview})` } : undefined}>
          {type === 'uploading' ? <EmberRing size={14} />
            : type === 'error' ? <IconAlertTriangle size={16} strokeWidth={iconStrokeWidth(16)} />
            : type === 'image' ? (preview ? null : <IconPhoto size={16} strokeWidth={iconStrokeWidth(16)} />)
            : <IconFileText size={16} strokeWidth={iconStrokeWidth(16)} />}
        </span>
        <span className={styles.text}>
          <span className={styles.name}>{name}</span>
          {text && <span className={styles.meta}>{text}</span>}
        </span>
        {onRemove && (
          <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove ${name}`}>
            <IconX size={16} strokeWidth={iconStrokeWidth(16)} />
          </button>
        )}
      </div>
      {type === 'uploading' && (
        <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`Uploading ${name}`}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
};

export default AttachmentChip;
