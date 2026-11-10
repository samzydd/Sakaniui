/**
 * MetalRing
 *
 * The working ring of the AI parts: an arc in the metal gradient (`--ai-metal-0..6`) that turns. Decorative (aria-hidden);
 * whatever uses it says what is happening in text. Still under prefers-reduced-motion.
 */

import React from 'react';
import styles from './MetalRing.module.css';

export const MetalRing: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <span
    className={[styles.ring, className ?? ''].filter(Boolean).join(' ')}
    style={{ ['--ring-size' as string]: `${size}px` }}
    aria-hidden="true"
  />
);

export default MetalRing;
