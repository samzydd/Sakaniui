/**
 * LiquidDashboardBlock — Blocks / Application / Liquid Glass Dashboard
 *
 * A full dashboard on a photograph, built the way the Sakani glass docs
 * describe it:
 *   1. Background  the photo, as a <LiquidBackdrop>: every lens inside refracts
 *                  the photo itself, so glass on glass still bends real detail
 *                  (as in Figma). Its veil is Figma's 5% overlay fill (a scrim
 *                  in dark mode), seen by every lens.
 *   2. Overlay     one full-size <LiquidGlass variant="regular" radius={0}> sheet.
 *   3. Product UI  Sidebar and TopBar sit on it with no fills of their own
 *                  (data-surface="liquid"); the main panel is a second sheet
 *                  of glass at 76% tint; the cards on it stay solid so data
 *                  stays crisp.
 * The active sidebar item has its own clear-glass lens (it moves only when
 * another item is clicked); a second, softer lens follows hover.
 *
 * Matches the Figma "Dashboard • Liquid" frame (node 2409:26078).
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this folder into
 * your project and edit it directly: swap the sample data, nav and charts.
 * Refraction renders in Chromium (Chrome, Edge); Safari and Firefox get the
 * frosted fallback with the same rim.
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { IconLayoutNavbar as LayoutPanelTop } from '../../icons/outline/layout-navbar';
import { IconChartBar as ChartColumnBig } from '../../icons/outline/chart-bar';
import { IconUserCircle as CircleUser } from '../../icons/outline/user-circle';
import { IconBoxMultiple as Boxes } from '../../icons/outline/box-multiple';
import { IconSpeakerphone as Megaphone } from '../../icons/outline/speakerphone';
import { IconChartPie as ChartPie } from '../../icons/outline/chart-pie';
import { IconAdjustmentsHorizontal as Settings2 } from '../../icons/outline/adjustments-horizontal';
import { IconUsers as UsersRound } from '../../icons/outline/users';
import { IconPlugConnected as PlugZap } from '../../icons/outline/plug-connected';
import { IconSettings as Settings } from '../../icons/outline/settings';
import { IconLayoutSidebarRightCollapse as PanelRightClose } from '../../icons/outline/layout-sidebar-right-collapse';
import { IconLayoutSidebarRightExpand as PanelRightOpen } from '../../icons/outline/layout-sidebar-right-expand';
import { LiquidGlass, LiquidBackdrop, syncLiquidBackdrop } from '../../lib/LiquidGlass';
import { SakaniLogo } from '../../lib/SakaniLogo';
import { Sidebar } from '../../components/Sidebar';
import { SidebarHeader } from '../../components/SidebarHeader';
import { SidebarGroupLabel } from '../../components/SidebarGroupLabel';
import { SidebarItem } from '../../components/SidebarItem';
import { SidebarPromo } from '../../components/SidebarPromo';
import { TopBar } from '../../components/TopBar';
import { Avatar } from '../../components/Avatar';
import { RailTooltip } from './parts/RailTooltip';
import { SearchExpand } from './parts/SearchExpand';
import { DashboardContent, type DashboardContentProps } from './DashboardContent';
import styles from './LiquidDashboardBlock.module.css';

const NAV = [
  { label: 'OVERVIEW', items: [
    { icon: LayoutPanelTop, label: 'Dashboard' },
    { icon: ChartColumnBig, label: 'Sales' },
    { icon: CircleUser, label: 'Customers' },
    { icon: Boxes, label: 'Products' },
  ] },
  { label: 'GROWTH', items: [
    { icon: Megaphone, label: 'Marketing' },
    { icon: ChartPie, label: 'Analytics' },
    { icon: Settings2, label: 'Operations' },
  ] },
  { label: 'ADMINISTRATION', items: [
    { icon: UsersRound, label: 'Team' },
    { icon: PlugZap, label: 'Integrations' },
    { icon: Settings, label: 'Settings' },
  ] },
];

/** Below this width the sidebar collapses to its rail on its own. */
const AUTO_COLLAPSE_BELOW = 900;

type LensBox = { x: number; y: number; w: number; h: number };

/**
 * A lens moved by a spring in JavaScript, not a CSS transition: the lens and the
 * photo it refracts (re-aligned with syncLiquidBackdrop in the same frame) move
 * together, so the photo never swims inside a gliding lens. The spring's speed
 * also stretches the lens along its path, like a droplet, and a press squishes it.
 */
const SpringLens: React.FC<{ box: LensBox; glide: boolean; pressed: boolean; className: string; children: React.ReactNode }> = ({ box, glide, pressed, className, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const st = useRef({ y: box.y, v: 0, sx: 1, vsx: 0, sy: 1, vsy: 0, raf: 0, last: 0 });
  const target = useRef({ y: box.y, sx: 1, sy: 1 });
  // The animation loop outlives renders, so it reads the latest box from a ref
  // (a closure over `box` would keep writing the old x after the lens moved).
  const boxRef = useRef(box);
  boxRef.current = box;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const write = () => {
    const el = ref.current, a = st.current;
    if (!el) return;
    // Stretch along the motion (vertical), up to +26% at full speed.
    const stretch = Math.min(0.26, Math.abs(a.v) / 3200);
    el.style.transform = `translate3d(${boxRef.current.x}px, ${a.y}px, 0) scale(${a.sx * (1 - stretch * 0.22)}, ${a.sy * (1 + stretch)})`;
    syncLiquidBackdrop();
  };

  const step = (now: number) => {
    const a = st.current, t = target.current;
    const dt = Math.min(1 / 30, (now - (a.last || now)) / 1000) || 1 / 60;
    a.last = now;
    // Slightly under-damped: a small overshoot, then it settles (~0.5s).
    const k = 380, c = 2 * Math.sqrt(k) * 0.68;
    a.v += (k * (t.y - a.y) - c * a.v) * dt; a.y += a.v * dt;
    const kp = 700, cp = 2 * Math.sqrt(kp) * 0.55;
    a.vsx += (kp * (t.sx - a.sx) - cp * a.vsx) * dt; a.sx += a.vsx * dt;
    a.vsy += (kp * (t.sy - a.sy) - cp * a.vsy) * dt; a.sy += a.vsy * dt;
    write();
    const settled = Math.abs(t.y - a.y) < 0.05 && Math.abs(a.v) < 1 && Math.abs(t.sx - a.sx) < 0.001 && Math.abs(t.sy - a.sy) < 0.001 && Math.abs(a.vsx) + Math.abs(a.vsy) < 0.01;
    if (settled) {
      a.y = t.y; a.v = 0; a.sx = t.sx; a.sy = t.sy; a.vsx = a.vsy = 0; a.raf = 0; a.last = 0;
      write();
    } else a.raf = requestAnimationFrame(step);
  };

  useLayoutEffect(() => {
    const a = st.current;
    target.current = { y: box.y, sx: pressed ? 0.975 : 1, sy: pressed ? 0.88 : 1 };
    if (!glide || reduce) {
      // Appear in place: no glide (first placement, a fresh hover, reduced motion).
      a.y = box.y; a.v = 0;
      if (reduce) { a.sx = target.current.sx; a.sy = target.current.sy; }
    }
    write();
    if (!a.raf) { a.last = 0; a.raf = requestAnimationFrame(step); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.x, box.y, box.w, box.h, glide, pressed]);

  useLayoutEffect(() => () => {
    // Clear the id too: StrictMode unmounts and remounts effects, and a stale id
    // would stop the spring from ever starting again.
    cancelAnimationFrame(st.current.raf);
    st.current.raf = 0;
    st.current.last = 0;
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={className} style={{ width: box.w, height: box.h }}>
      {children}
    </div>
  );
};
type LensState = { active: LensBox | null; hover: LensBox | null; hoverGlide: boolean };

export interface LiquidDashboardBlockProps {
  /** The photograph behind everything. Not bundled: the glass needs something
   * colorful and detailed to bend, and which photo is your call. */
  backgroundImage: string;
  /** Avatar for the account menu in the top bar. */
  accountAvatar?: string;
  /** Photos for the people in the activity feed. */
  people?: DashboardContentProps['people'];
  className?: string;
}

export const LiquidDashboardBlock: React.FC<LiquidDashboardBlockProps> = ({ backgroundImage, accountAvatar, people, className }) => {
  const [collapsed, setCollapsed] = useState(false);
  // Narrow windows collapse the sidebar to its rail by themselves, until the user
  // toggles it: after that their choice sticks.
  const rootRef = useRef<HTMLDivElement>(null);
  const userToggled = useRef(false);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const apply = () => { if (!userToggled.current) setCollapsed(el.clientWidth < AUTO_COLLAPSE_BELOW); };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Two lenses, two jobs:
  //  - the ACTIVE lens rests on the active item and only moves when another
  //    item is clicked;
  //  - the HOVER lens (same glass, smaller shadow) appears on whichever other
  //    item the pointer or keyboard focus is on, and gets out of the way when
  //    the pointer leaves. Hovering never changes what is active.
  const [active, setActive] = useState('Dashboard');
  const [hovered, setHovered] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);
  const [lens, setLens] = useState<LensState>({ active: null, hover: null, hoverGlide: false });
  const [lensReady, setLensReady] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  // The hovered item that isn't already active (the active one has its lens).
  const hoverKey = hovered && hovered !== active ? hovered : null;
  // Remembered so the hover lens fades out where it was, instead of snapping away.
  const lastHoverKey = useRef<string | null>(null);
  if (hoverKey) lastHoverKey.current = hoverKey;
  const hoverTarget = lastHoverKey.current;
  const prevHoverKey = useRef<string | null>(null);

  const box = (key: string | null): LensBox | null => {
    const el = key ? itemRefs.current.get(key) : null;
    if (!el) return null;
    // Collapsed, the item is a 32px button centered in the 64px rail: the lens
    // hugs the button, not the full-width row around it.
    const btn = collapsed ? el.querySelector<HTMLElement>('button, a, [role="button"]') : null;
    const nav = navRef.current;
    if (btn && nav) {
      // Rect math, not offsetLeft: the button's offset parent can be the tooltip wrapper.
      const r = btn.getBoundingClientRect(), n = nav.getBoundingClientRect();
      return { x: r.left - n.left - nav.clientLeft + nav.scrollLeft, y: r.top - n.top - nav.clientTop + nav.scrollTop, w: r.width, h: r.height };
    }
    return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  };
  const same = (a: LensBox | null, b: LensBox | null) =>
    a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

  const measure = useCallback(() => {
    const next = { active: box(active), hover: box(hoverTarget) };
    // The hover lens glides item to item, but appears in place on a fresh hover.
    const hoverGlide = prevHoverKey.current !== null && hoverKey !== null;
    setLens((prev) =>
      same(prev.active, next.active) && same(prev.hover, next.hover) && prev.hoverGlide === hoverGlide
        ? prev
        : { ...next, hoverGlide });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hoverTarget, hoverKey, collapsed]);

  useLayoutEffect(() => {
    measure();
    prevHoverKey.current = hoverKey;
    const nav = navRef.current;
    if (!nav) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measure, hoverKey, collapsed]);

  // First placement of the active lens jumps; every move after that glides.
  useLayoutEffect(() => {
    if (lens.active && !lensReady) {
      const id = requestAnimationFrame(() => setLensReady(true));
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [lens.active, lensReady]);

  return (
    <LiquidBackdrop ref={rootRef} src={backgroundImage} veil="var(--liquid-overlay-tint)" className={[styles.root, className ?? ''].filter(Boolean).join(' ')}>
      {/* 2 · the one glass sheet over the photo (its 5% fill is the backdrop's veil) */}
      <LiquidGlass variant="regular" tint="none" radius={0} className={styles.overlay} />

      <div className={styles.shell}>
        {/* 3 · chrome: transparent, borrows the overlay's glass */}
        {/* The rail animates its width; the lenses re-measure while it moves and once it lands. */}
        <div data-surface="liquid" className={`${styles.sidebarWrap} ${collapsed ? "" : styles.expanded}`} onTransitionEnd={measure}>
          <Sidebar collapsed={collapsed}>
            {/* The design sets the header's text to fg/on-inverse: it sits over the sky. */}
            <div data-on-photo>
              <SidebarHeader
                type="brand-toggle"
                title="csakani"
                subtitle="Workspace"
                logo={<SakaniLogo />}
                collapsed={collapsed}
                onToggle={() => { userToggled.current = true; setCollapsed((c) => !c); }}
                toggleIcon={collapsed ? PanelRightOpen : PanelRightClose}
              />
            </div>
            <div
              ref={navRef}
              className={styles.navScroll}
              onPointerLeave={() => { setHovered(null); setPressed(false); }}
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerCancel={() => setPressed(false)}
              onBlur={() => setHovered(null)}
            >
              {/* both lenses sit behind the items (first children, z-index 0) */}
              {lens.active && (
                <SpringLens box={lens.active} glide={lensReady} pressed={pressed && hoverKey === null} className={styles.lens}>
                  <LiquidGlass variant="clear" radius={6} className={styles.lensGlass} />
                </SpringLens>
              )}
              {lens.hover && (
                <SpringLens
                  box={lens.hover}
                  glide={lens.hoverGlide}
                  pressed={pressed && !!hoverKey}
                  className={[styles.lens, styles.lensHover, hoverKey ? styles.lensHoverOn : ''].filter(Boolean).join(' ')}
                >
                  <LiquidGlass variant="clear" radius={6} className={`${styles.lensGlass} ${styles.lensGlassHover}`} />
                </SpringLens>
              )}
              {NAV.map((group) => (
                <div key={group.label} className={`${styles.navGroup} ${collapsed ? styles.navGroupCollapsed : ''}`}>
                  {!collapsed && <div className={styles.groupLabel}><SidebarGroupLabel>{group.label}</SidebarGroupLabel></div>}
                  {group.items.map((item) => {
                    const el = (
                      <SidebarItem
                        icon={item.icon}
                        label={item.label}
                        active={item.label === active}
                        collapsed={collapsed}
                        nativeTooltip={!collapsed}
                        onClick={() => setActive(item.label)}
                      />
                    );
                    return (
                      <div
                        key={item.label}
                        ref={(node) => { if (node) itemRefs.current.set(item.label, node); else itemRefs.current.delete(item.label); }}
                        className={`${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`}
                        onPointerEnter={() => setHovered(item.label)}
                        onFocus={() => setHovered(item.label)}
                      >
                        {collapsed
                          ? <RailTooltip title={item.label}>{el}</RailTooltip>
                          : el}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {!collapsed && (
              <div className={styles.promoWrap} data-on-photo>
                <LiquidGlass variant="clear" tint="subtle" radius={16}>
                  <SidebarPromo
                    title="Upgrade to Pro"
                    description="Unlock unlimited projects and advanced analytics."
                    ctaLabel="Upgrade"
                  />
                </LiquidGlass>
              </div>
            )}
          </Sidebar>
        </div>

        <div className={styles.main}>
          <div data-surface="liquid" data-on-photo>
            <TopBar
              type="minimal"
              showToggle={false}
              left={
                <div className={styles.topbarLeft}>
                  <LayoutPanelTop size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span className={styles.topbarTitle}>Dashboard</span>
                </div>
              }
              rightSlot={<SearchExpand />}
              showActions
              showHelp={false}
              hasUnread
              account={<Avatar size="md" src={accountAvatar} alt="Account" />}
            />
          </div>

          {/* the main panel: its own sheet of glass, 76% tint; cards stay solid */}
          <div className={styles.panelWrap}>
            <LiquidGlass variant="regular" radius={24} className={styles.panel}>
              <div className={styles.panelScroll}>
                <DashboardContent people={people} />
              </div>
            </LiquidGlass>
          </div>
        </div>
      </div>
    </LiquidBackdrop>
  );
};

export default LiquidDashboardBlock;
