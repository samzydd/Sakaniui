/**
 * AiGlow
 *
 * The light that sweeps once around the border of an "ai" Input, Textarea or PromptComposer, from the top-left, clockwise, in an ember
 * gradient (indigo, violet, magenta, red, brand orange, amber, pale gold: a cool tail and a hot head), as a soft line of about 2px
 * with a hazy bloom, one lap in about 1.3s. By default (`once`) it plays that one lap a moment after the box appears and then rests:
 * nothing keeps moving round a box while someone is trying to write in it, and focus does not set it off again.
 *
 * It is a string of small lights that follow the border's own path (`offset-path: inset(0 round r)`), each one colour
 * of the gradient and each starting a beat after the one before, so they stay one length behind each other and the
 * whole gradient travels at an even speed around any box, wide or square. (A rotating conic gradient cannot do that: on
 * a wide box it races along the short sides and crawls along the long ones.)
 *
 * Put it inside the frame, which needs `position: relative`, a `border-radius` and `--ai-radius` set to that radius.
 * Decorative: aria-hidden, no pointer events, hidden under reduced motion and where `offset-path: inset()` is missing.
 */

import React from 'react';
import styles from './AiGlow.module.css';

/** `once` (the default) sweeps one lap shortly after the box appears and then stays still, focused or not; `pulse` sweeps every 2.5s while
 *  idle and once each time the field takes focus; `focus` sweeps only on focus; `off` draws nothing. Only `once` is quiet enough to leave on. */
export type AiGlowMode = 'once' | 'pulse' | 'focus' | 'off';

/** Tail to head. Each light is one colour; the order is the gradient. */
const LIGHTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function Lights() {
  return (
    <>
      {LIGHTS.map((i) => (
        <span key={i} className={styles.glow__light} style={{ ['--i' as string]: i }} />
      ))}
    </>
  );
}

export const AiGlow: React.FC<{ mode: AiGlowMode }> = ({ mode }) => {
  if (mode === 'off') return null;
  return (
    <span className={`${styles.glow} ${styles[`glow--${mode}`]}`} aria-hidden="true">
      <span className={styles.glow__bloom}><span className={styles.glow__ring}><Lights /></span></span>
      <span className={styles.glow__line}><span className={styles.glow__ring}><Lights /></span></span>
    </span>
  );
};

/** The Textarea's focus border: a static 1.5px ember gradient, left to right, that replaces the plain strong border while the box has focus. */
export const AiFocusRing: React.FC = () => <span className={styles.ring} aria-hidden="true" />;
