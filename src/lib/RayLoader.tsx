/**
 * RayLoader
 *
 * The working spinner of the AI parts: eight short rays round a point, each one fading a beat after the one before it, so a
 * bright ray circles clockwise with a soft trail behind it (0.96s a lap, stepped like an activity indicator). The rays are
 * drawn in the ember gradient of the AI prompt box (`--ai-ember-0..6`, indigo on the left to pale gold on the right), so the
 * colour belongs to the spinner and does not turn with the bright ray. Decorative (aria-hidden); whatever uses it says what is
 * happening in text. Under prefers-reduced-motion it stops and shows the trail frozen.
 *
 * The gradient is an SVG paint server in the spinner's own coordinate space, so each ray is drawn between explicit points
 * (not rotated): a rotated element would rotate the gradient with it.
 */

import React from 'react';
import styles from './RayLoader.module.css';

const RAYS = [0, 1, 2, 3, 4, 5, 6, 7];
const STOPS = [0, 1, 2, 3, 4, 5, 6];
/** Inner and outer radius of a ray in the 16-unit grid; the odd rays are a touch shorter. */
const ends = (i: number) => {
  const th = (i * Math.PI) / 4;
  const [r1, r2] = i % 2 ? [4.1, 6.4] : [3.6, 6.4];
  return { x1: 8 + r1 * Math.sin(th), y1: 8 - r1 * Math.cos(th), x2: 8 + r2 * Math.sin(th), y2: 8 - r2 * Math.cos(th) };
};

/** `beat` makes the whole spinner give one soft pulse every 1.6s, timed to the shimmer of a label beside it (see ThinkingLoader). */
export const RayLoader: React.FC<{ size?: number; className?: string; beat?: boolean }> = ({ size = 16, className, beat }) => {
  const id = `ray-grad-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      className={[styles.rays, beat ? styles['rays--beat'] : '', className ?? ''].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="1.6" y1="0" x2="14.4" y2="0">
          {STOPS.map((i) => <stop key={i} offset={i / 6} style={{ stopColor: `var(--ai-ember-${i})` }} />)}
        </linearGradient>
      </defs>
      {RAYS.map((i) => (
        <line
          key={i}
          className={[styles.ray, i === 0 ? styles['ray--head'] : ''].filter(Boolean).join(' ')}
          style={{ ['--i' as string]: i }}
          {...ends(i)}
          stroke={`url(#${id})`}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

export default RayLoader;
