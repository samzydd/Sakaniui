/**
 * EmberRing
 *
 * The ring of an upload in an AI part: an arc in the ember gradient (`--ai-ember-0..6`) that turns. Decorative (aria-hidden);
 * whatever uses it says what is happening in text. Still under prefers-reduced-motion.
 */

import React from 'react';
import styles from './EmberRing.module.css';

export const EmberRing: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <span
    className={[styles.ring, className ?? ''].filter(Boolean).join(' ')}
    style={{ ['--ring-size' as string]: `${size}px` }}
    aria-hidden="true"
  />
);

export default EmberRing;
