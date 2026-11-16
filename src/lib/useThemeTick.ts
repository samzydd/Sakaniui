import { useEffect, useState } from 'react';
import type React from 'react';

/**
 * Chart components read color tokens once per render via getComputedStyle
 * (Recharts needs real color strings, not CSS vars). That read is frozen at
 * render time, so toggling the app's .dark class on <html> after a chart has
 * already mounted leaves it showing stale (light-mode) colors until it
 * happens to re-render for an unrelated reason. This watches <html>'s class
 * attribute and bumps a counter on change, so a chart calling this hook
 * re-renders — and re-reads its colors — right when the theme flips.
 *
 * The theme class does not always sit on <html>: a preview pane, a themed card or a
 * `<div className="dark">` scopes it to a subtree. Pass the element the colors are read from and
 * every ancestor between it and <html> is watched too (one observer per ancestor, class
 * attribute only, so it stays cheap), or the colors would stay on the old theme for that subtree.
 */
export function useThemeTick(from?: React.RefObject<Element | null>): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Bump once on mount, not only on theme changes. Under SSR there's no
    // getComputedStyle, so every chart renders its hardcoded fallback colors
    // on the server -- and React treats differing attributes on hydration as
    // "this won't be patched up", so those fallbacks stay on screen forever.
    // Nothing else re-renders a static chart, so without this first tick a
    // server-rendered chart never reads its real tokens at all: the docs site
    // was drawing polar grids in #e5e4e7 while the actual
    // --color-border-subtle is #E7E5E1. Client-only hosts (Storybook, Vite)
    // never hit this, which is why the two looked different.
    setTick((t) => t + 1);

    const observer = new MutationObserver(() => setTick((t) => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    for (let el = from?.current?.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return tick;
}
