/**
 * AiGlyph
 *
 * The AI mark: the sparkles icon drawn with the ember gradient (`--ai-ember-0..6`, bottom-left to top-right) instead of one
 * colour. Used for the assistant avatar and the greeting of the welcome screen. Decorative (aria-hidden).
 *
 * A stroke can take a gradient only through an SVG paint server, so this carries its own hidden <linearGradient> and passes
 * `url(#id)` to the icon as its colour.
 */

import React from 'react';
import { IconSparkles } from '../icons/outline/sparkles';

const STOPS = [0, 1, 2, 3, 4, 5, 6];

export const AiGlyph: React.FC<{ size?: number; strokeWidth?: number | string; className?: string }> = ({ size = 16, strokeWidth, className }) => {
  const id = `ai-glyph-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <span className={className} style={{ display: 'inline-flex', position: 'relative' }} aria-hidden="true">
      <svg width="0" height="0" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
            {STOPS.map((i) => <stop key={i} offset={i / 6} style={{ stopColor: `var(--ai-ember-${i})` }} />)}
          </linearGradient>
        </defs>
      </svg>
      <IconSparkles size={size} strokeWidth={strokeWidth} color={`url(#${id})`} />
    </span>
  );
};

export default AiGlyph;
