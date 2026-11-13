import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (notify: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', notify);
  return () => mq.removeEventListener('change', notify);
};

/**
 * True while the visitor has asked their system for less motion. The charts use it to skip their entrance and flow
 * animations (and the morph between data sets); the server snapshot is `false`, so a server-rendered chart is the
 * normal one until the client reads the real preference.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
