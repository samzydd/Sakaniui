/**
 * RayLoader
 *
 * The working spinner of the AI parts: eight short rays round a point, each one fading a beat after the one before it, so a
 * bright ray circles clockwise with a soft trail behind it (0.96s a lap, stepped like an activity indicator). Takes its colour from
 * `currentColor`. Decorative (aria-hidden); whatever uses it says what is happening in text. Under prefers-reduced-motion it
 * stops and shows the trail frozen.
 */

import React from 'react';
import styles from './RayLoader.module.css';

const RAYS = [0, 1, 2, 3, 4, 5, 6, 7];

export const RayLoader: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    className={[styles.rays, className ?? ''].filter(Boolean).join(' ')}
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    {RAYS.map((i) => (
      <line
        key={i}
        className={styles.ray}
        style={{ ['--i' as string]: i }}
        x1="8" y1="1.6" x2="8" y2={i % 2 ? '3.9' : '4.4'}
        transform={`rotate(${i * 45} 8 8)`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

export default RayLoader;
