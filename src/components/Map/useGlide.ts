import React from 'react';
import type { LatLng } from './geo';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Eases a place from where it was to where it is now, in latitude and longitude, so a marker fed by
 * a live source slides instead of jumping. Interpolating the place (not the pixels) keeps it correct
 * while the map is also being panned or zoomed. Longitude takes the short way round the antimeridian.
 * `ms` of 0, or reduced motion, returns the position untouched.
 */
export function useGlide(position: LatLng, ms = 0): LatLng {
  const [lat, lng] = position;
  const [shown, setShown] = React.useState<LatLng>(position);
  const current = React.useRef<LatLng>(position);

  React.useEffect(() => {
    if (!ms || reducedMotion()) { current.current = [lat, lng]; setShown([lat, lng]); return; }
    const from = current.current;
    if (from[0] === lat && from[1] === lng) return;
    const dLng = ((lng - from[1] + 540) % 360) - 180;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms), e = 1 - (1 - t) ** 3;
      const next: LatLng = t === 1 ? [lat, lng] : [from[0] + (lat - from[0]) * e, from[1] + dLng * e];
      current.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [lat, lng, ms]);

  return ms && !reducedMotion() ? shown : position;
}
