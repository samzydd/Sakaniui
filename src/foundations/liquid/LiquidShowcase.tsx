/**
 * LiquidShowcase — the Liquid Glass material in a real composition, the way a
 * product would use it: a floating sidebar, a tab bar, a Now Playing card and
 * a toolbar, all on one photograph, plus a lens you can drag over the photo.
 *
 * Every surface is a <LiquidGlass> inside one <LiquidBackdrop>, so each lens
 * refracts the photo itself (sharp, as in Figma) with the measured Glass
 * properties: refraction and depth bend the rim, dispersion splits its color,
 * frost softens the inside, light draws the rim. Selection lenses slide with a
 * spring and stretch along the way they travel, like a droplet; slider knobs
 * turn into lenses while you drag them and magnify the track below.
 */

import React from 'react';
import { IconHome as House } from '../../icons/outline/home';
import { IconCompass as Compass } from '../../icons/outline/compass';
import { IconLibrary as Library } from '../../icons/outline/library';
import { IconHeart as Heart } from '../../icons/outline/heart';
import { IconSettings as Settings } from '../../icons/outline/settings';
import { IconSearch as Search } from '../../icons/outline/search';
import { IconShare as Share } from '../../icons/outline/share';
import { IconDots as Ellipsis } from '../../icons/outline/dots';
import { IconPlayerPlay as Play } from '../../icons/outline/player-play';
import { IconPlayerPause as Pause } from '../../icons/outline/player-pause';
import { IconPlayerSkipBack as SkipBack } from '../../icons/outline/player-skip-back';
import { IconPlayerSkipForward as SkipForward } from '../../icons/outline/player-skip-forward';
import { IconArrowsShuffle as Shuffle } from '../../icons/outline/arrows-shuffle';
import { IconRepeat as Repeat } from '../../icons/outline/repeat';
import { IconSun as Sun } from '../../icons/outline/sun';
import { IconMoon as Moon } from '../../icons/outline/moon';
import { IconVolume2 as Volume1 } from '../../icons/outline/volume-2';
import { IconVolume as Volume2 } from '../../icons/outline/volume';
import { IconArrowsMove as Move } from '../../icons/outline/arrows-move';
import { IconLayoutGrid as LayoutGrid } from '../../icons/outline/layout-grid';
import { IconRadio as Radio } from '../../icons/outline/radio';
import { IconMicrophone2 as Mic2 } from '../../icons/outline/microphone-2';
import { LiquidGlass, LiquidBackdrop } from '../../lib/LiquidGlass';
import balloons from '../../assets/marketing/blog-image-balloons.jpg';
import artwork from '../../assets/marketing/blog-featured-space-station.jpg';
import s from './LiquidShowcase.module.css';

type Box = { x: number; y: number; w: number; h: number };

/** Where a selection lens should sit (the item with data-lens-key={key}), and
 *  which way it last travelled, so it can stretch along that axis. */
function useLensTarget(containerRef: React.RefObject<HTMLElement | null>, key: string) {
  const [box, setBox] = React.useState<Box | null>(null);
  const [travel, setTravel] = React.useState<{ axis: 'x' | 'y'; n: number } | null>(null);
  const prev = React.useRef<Box | null>(null);
  React.useLayoutEffect(() => {
    const c = containerRef.current;
    const el = c?.querySelector<HTMLElement>(`[data-lens-key="${key}"]`);
    if (!c || !el) return undefined;
    const measure = () => {
      const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
      const p = prev.current;
      if (p && (p.x !== next.x || p.y !== next.y)) {
        const axis = Math.abs(next.x - p.x) >= Math.abs(next.y - p.y) ? 'x' : 'y';
        setTravel((t) => ({ axis, n: (t?.n ?? 0) + 1 }));
      }
      prev.current = next;
      setBox(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => ro.disconnect();
  }, [containerRef, key]);
  // Alternate between two identical keyframes so every move restarts the stretch.
  const stretch = travel ? s[`stretch-${travel.axis}-${travel.n % 2}`] : '';
  return { box, stretch, ready: !!prev.current };
}

/** A selection lens: clear glass that springs to its target and stretches on the
 *  way. It bends the surface it sits in (source={false}), not the photo, so it
 *  reads as a droplet of the same material. */
const SelectionLens = ({ box, stretch, radius }: { box: Box | null; stretch: string; radius: number }) =>
  box ? (
    <div className={s.selection} aria-hidden="true" style={{ width: box.w, height: box.h, transform: `translate3d(${box.x}px, ${box.y}px, 0)` }}>
      <LiquidGlass variant="clear" radius={radius} source={false} className={`${s.selectionGlass} ${stretch}`} />
    </div>
  ) : null;

/* ------------------------------------------------------------------------- */

const NAV = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'library', label: 'Library', icon: Library },
  { key: 'favorites', label: 'Favorites', icon: Heart },
];

const PINNED = [
  { name: 'Golden Hour', meta: 'Playlist · 24 songs', art: 'linear-gradient(140deg, #ffb347, #ff4700 60%, #b3123f)' },
  { name: 'Cloud Walk', meta: 'Playlist · 18 songs', art: 'linear-gradient(140deg, #8fd3ff, #4a6cf7 55%, #2b1c7a)' },
  { name: 'Night Drive', meta: 'Album · Sakani Sessions', art: 'linear-gradient(140deg, #3b3355, #151223 60%, #ff4700 140%)' },
];

const SidebarCard = () => {
  const [active, setActive] = React.useState('home');
  const listRef = React.useRef<HTMLDivElement>(null);
  const lens = useLensTarget(listRef, active);
  return (
    <LiquidGlass variant="regular" radius={28} className={s.sidebar}>
      <div className={s.appHeader}>
        <span className={s.appGlyph} aria-hidden="true" />
        <div>
          <div className={s.appName}>Atlas</div>
          <div className={s.appSub}>Your library</div>
        </div>
      </div>
      <div className={s.search} role="search">
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <span>Search</span>
        <kbd className={s.kbd}>⌘K</kbd>
      </div>
      <div className={s.sectionLabel}>Browse</div>
      <div ref={listRef} className={s.navList} role="tablist" aria-orientation="vertical">
        <SelectionLens box={lens.box} stretch={lens.stretch} radius={14} />
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            data-lens-key={key}
            className={s.navItem}
            onClick={() => setActive(key)}
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className={s.sectionLabel}>Pinned</div>
      <div className={s.pinned}>
        {PINNED.map((p) => (
          <button key={p.name} type="button" className={s.pinnedItem}>
            <span className={s.pinnedArt} style={{ background: p.art }} aria-hidden="true" />
            <span className={s.pinnedText}>
              <span className={s.pinnedName}>{p.name}</span>
              <span className={s.pinnedMeta}>{p.meta}</span>
            </span>
          </button>
        ))}
      </div>
      <div className={s.sidebarFoot}>
        <button type="button" className={s.navItem}>
          <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>Settings</span>
        </button>
      </div>
    </LiquidGlass>
  );
};

/* ------------------------------------------------------------------------- */

const TABS = [
  { key: 'listen', label: 'Listen Now', icon: Play },
  { key: 'browse', label: 'Browse', icon: LayoutGrid },
  { key: 'radio', label: 'Radio', icon: Radio },
  { key: 'search', label: 'Search', icon: Search },
];

const TabBar = () => {
  const [active, setActive] = React.useState('listen');
  const barRef = React.useRef<HTMLDivElement>(null);
  const lens = useLensTarget(barRef, active);
  return (
    <LiquidGlass variant="regular" radius={999} className={s.tabBar}>
      <div ref={barRef} className={s.tabs} role="tablist">
        <SelectionLens box={lens.box} stretch={lens.stretch} radius={999} />
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={active === key} data-lens-key={key} className={s.tab} onClick={() => setActive(key)}>
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </LiquidGlass>
  );
};

/* ------------------------------------------------------------------------- */

/** A slider whose knob turns into a lens while you drag it, magnifying the track. */
const GlassSlider = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const set = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (r) onChange(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };
  return (
    <div
      ref={trackRef}
      className={`${s.slider} ${dragging ? s.sliderDragging : ''}`}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); set(e.clientX); }}
      onPointerMove={(e) => { if (dragging) set(e.clientX); }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(1, value + 0.05)); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0, value - 0.05)); }
      }}
    >
      <div className={s.sliderTrack}>
        <div className={s.sliderFill} style={{ width: `${value * 100}%` }} />
      </div>
      <div className={s.knob} style={{ left: `${value * 100}%` }} aria-hidden="true">
        <span className={s.knobSolid} />
        {/* While dragged: a clear lens over the track (it bends the UI below it,
            not the photo, so the track and its fill magnify). */}
        {dragging && <LiquidGlass variant="clear" tint="none" radius={999} source={false} className={s.knobLens} />}
      </div>
    </div>
  );
};

const time = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const NowPlaying = () => {
  const [playing, setPlaying] = React.useState(true);
  const [progress, setProgress] = React.useState(0.38);
  const [volume, setVolume] = React.useState(0.62);
  const length = 228;
  return (
    <LiquidGlass variant="regular" radius={32} className={s.player}>
      <div className={s.track}>
        <img className={s.artwork} src={artwork} alt="" />
        <div className={s.trackText}>
          <div className={s.trackTitle}>Above the Clouds</div>
          <div className={s.trackArtist}>Sakani Sessions</div>
        </div>
        <button type="button" className={s.iconButton} aria-label="Love">
          <Heart size={18} strokeWidth={1.75} />
        </button>
      </div>
      <GlassSlider value={progress} onChange={setProgress} label="Playback position" />
      <div className={s.times}>
        <span>{time(progress * length)}</span>
        <span>-{time((1 - progress) * length)}</span>
      </div>
      <div className={s.transport}>
        <button type="button" className={s.iconButton} aria-label="Shuffle"><Shuffle size={18} strokeWidth={1.75} /></button>
        <button type="button" className={s.iconButton} aria-label="Previous"><SkipBack size={22} strokeWidth={1.75} fill="currentColor" /></button>
        <LiquidGlass variant="clear" radius={999} interactive source={false} className={s.playButton}>
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={26} strokeWidth={0} fill="currentColor" /> : <Play size={26} strokeWidth={0} fill="currentColor" />}
          </button>
        </LiquidGlass>
        <button type="button" className={s.iconButton} aria-label="Next"><SkipForward size={22} strokeWidth={1.75} fill="currentColor" /></button>
        <button type="button" className={s.iconButton} aria-label="Repeat"><Repeat size={18} strokeWidth={1.75} /></button>
      </div>
      <div className={s.volume}>
        <Volume1 size={16} strokeWidth={1.75} aria-hidden="true" />
        <GlassSlider value={volume} onChange={setVolume} label="Volume" />
        <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />
      </div>
    </LiquidGlass>
  );
};

/* ------------------------------------------------------------------------- */

/** Figma Glass settings for the drag lens. */
const THICK_GLASS = { refraction: 1, depth: 44, dispersion: 0.7, frost: 0, lightIntensity: 0.8, lightAngle: -45 };

/** A clear lens you can drag anywhere over the photo. */
const DragLens = () => {
  // As a fraction of the stage: on the right-hand balloon. On a phone that spot is the player's controls, so the lens
  // starts on the hills to the right of the headline instead.
  const [pos, setPos] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches ? { x: 0.74, y: 0.5 } : { x: 0.36, y: 0.27 });
  const drag = React.useRef<{ dx: number; dy: number; w: number; h: number; l: number; t: number } | null>(null);
  const [held, setHeld] = React.useState(false);
  return (
    <div
      className={`${s.dragLens} ${held ? s.dragLensHeld : ''}`}
      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
      onPointerDown={(e) => {
        const stage = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
        const me = e.currentTarget.getBoundingClientRect();
        drag.current = { dx: e.clientX - (me.left + me.width / 2), dy: e.clientY - (me.top + me.height / 2), w: stage.width, h: stage.height, l: stage.left, t: stage.top };
        e.currentTarget.setPointerCapture(e.pointerId);
        setHeld(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        setPos({ x: Math.min(0.97, Math.max(0.03, (e.clientX - d.dx - d.l) / d.w)), y: Math.min(0.95, Math.max(0.05, (e.clientY - d.dy - d.t) / d.h)) });
      }}
      onPointerUp={() => { drag.current = null; setHeld(false); }}
      onPointerCancel={() => { drag.current = null; setHeld(false); }}
      role="img"
      aria-label="A lens you can drag over the photo"
    >
      {/* Thick glass: the same Figma Glass properties, pushed — a deep rim that
          bends the photo hard and splits its color, no frost, no tint. */}
      <LiquidGlass variant="clear" tint="none" radius={999} effect={THICK_GLASS} className={s.dragLensGlass}>
        <Move className={s.dragGlyph} size={18} strokeWidth={1.75} aria-hidden="true" />
      </LiquidGlass>
    </div>
  );
};

/* ------------------------------------------------------------------------- */

export interface LiquidShowcaseProps {
  /** Start in dark mode. The toolbar's sun/moon toggles it. */
  dark?: boolean;
}

export const LiquidShowcase = ({ dark: initialDark = false }: LiquidShowcaseProps) => {
  const [dark, setDark] = React.useState(initialDark);
  React.useEffect(() => setDark(initialDark), [initialDark]);
  return (
    <div className={`${s.frame} ${dark ? 'dark' : ''}`}>
      <LiquidBackdrop src={balloons} position="center 35%" veil={dark ? 'rgba(6, 8, 14, 0.42)' : 'rgba(0, 0, 0, 0)'} className={s.stage}>
        <SidebarCard />

        <header className={s.hero}>
          <div className={s.eyebrow}>Sakani · Liquid Glass</div>
          <h1 className={s.headline}>Glass that<br />bends light.</h1>
          <p className={s.lede}>Refraction, dispersion, frost and light — Figma&apos;s Glass effect, measured property by property and rebuilt for the web.</p>
        </header>

        <LiquidGlass variant="clear" radius={999} className={s.toolbar}>
          <button type="button" className={s.iconButton} aria-label="Search"><Search size={18} strokeWidth={1.75} /></button>
          <button type="button" className={s.iconButton} aria-label="Share"><Share size={18} strokeWidth={1.75} /></button>
          <button type="button" className={s.iconButton} aria-label={dark ? 'Light mode' : 'Dark mode'} onClick={() => setDark((d) => !d)}>
            {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </button>
          <button type="button" className={s.iconButton} aria-label="More"><Ellipsis size={18} strokeWidth={1.75} /></button>
        </LiquidGlass>

        <NowPlaying />

        <LiquidGlass variant="clear" radius={999} className={s.micChip}>
          <Mic2 size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Lyrics</span>
        </LiquidGlass>

        <TabBar />
        <DragLens />
      </LiquidBackdrop>
    </div>
  );
};

export default LiquidShowcase;
