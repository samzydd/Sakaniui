import { useLayoutEffect, useState } from 'react';

/**
 * True for the first moments after a chart appears (on mount, or when `loading` ends), then false for good. The
 * rich charts key their entrance animations on it (`data-entering`), so an entrance plays once and never again:
 * Recharts re-renders and can remount a bar or a slice on hover, and an animation that is still in the stylesheet
 * would replay every time it did.
 *
 * A layout effect, so the attribute is in place before the first paint and the shapes never flash at full size.
 */
export function useChartEntrance(on: boolean, ms = 1700): boolean {
  const [entering, setEntering] = useState(on);
  useLayoutEffect(() => {
    if (!on) return undefined;
    setEntering(true);
    const t = window.setTimeout(() => setEntering(false), ms);
    return () => window.clearTimeout(t);
  }, [on, ms]);
  return on && entering;
}
