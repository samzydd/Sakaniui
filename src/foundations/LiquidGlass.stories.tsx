import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { IconArrowsMove as Move } from '../icons/outline/arrows-move';
import { LiquidGlass, LiquidBackdrop, type LiquidGlassTint } from '../lib/LiquidGlass';
import { LiquidShowcase } from './liquid/LiquidShowcase';
import balloons from '../assets/marketing/blog-image-balloons.jpg';

/**
 * Liquid Glass — Sakani's glass material, matched to Figma's native Glass effect
 * property by property (refraction, depth, dispersion, frost, light).
 *
 * Showcase: a sidebar, tab bar, Now Playing card and toolbar on one photo. Click
 * the nav and tabs (the selection lens springs and stretches), drag the slider
 * knobs (they turn into lenses), and drag the round lens over the balloons to see
 * the rim bend and split the color.
 *
 * Refraction renders in Chromium (Chrome, Edge, Arc); Safari and Firefox get a
 * frosted fallback with the same rim.
 */
const meta = {
  title: 'Foundations/Liquid Glass',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Showcase: Story = { render: () => <LiquidShowcase /> };
export const Dark: Story = { render: () => <LiquidShowcase dark /> };

/* ------------------------------------------------------------------------- */

type PlaygroundArgs = {
  refraction: number; depth: number; dispersion: number; frost: number;
  lightIntensity: number; lightAngle: number;
  tint: LiquidGlassTint; shape: 'card' | 'pill' | 'circle';
};

const SHAPES = { card: { w: 420, h: 260, r: 36 }, pill: { w: 360, h: 88, r: 999 }, circle: { w: 200, h: 200, r: 999 } };

const PlaygroundLens = (a: PlaygroundArgs) => {
  const [pos, setPos] = React.useState({ x: 0.36, y: 0.38 });
  const drag = React.useRef<{ dx: number; dy: number; l: number; t: number; w: number; h: number } | null>(null);
  const sh = SHAPES[a.shape];
  return (
    <div
      style={{ position: 'absolute', left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%, -50%)', cursor: 'grab', touchAction: 'none' }}
      onPointerDown={(e) => {
        const st = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
        const me = e.currentTarget.getBoundingClientRect();
        drag.current = { dx: e.clientX - (me.left + me.width / 2), dy: e.clientY - (me.top + me.height / 2), l: st.left, t: st.top, w: st.width, h: st.height };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => { const d = drag.current; if (d) setPos({ x: (e.clientX - d.dx - d.l) / d.w, y: (e.clientY - d.dy - d.t) / d.h }); }}
      onPointerUp={() => { drag.current = null; }}
    >
      <LiquidGlass
        variant="clear"
        tint={a.tint}
        radius={sh.r}
        effect={{ refraction: a.refraction, depth: a.depth, dispersion: a.dispersion, frost: a.frost, lightIntensity: a.lightIntensity, lightAngle: a.lightAngle }}
        style={{ width: `min(${sh.w}px, calc(100vw - 32px))`, height: sh.h, display: 'grid', placeItems: 'center', color: '#fff' }}
      >
        <Move size={20} strokeWidth={1.75} style={{ opacity: 0.7, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.3))' }} aria-hidden="true" />
      </LiquidGlass>
    </div>
  );
};

/** Figma's Glass properties as controls, on a lens you can drag over the photo.
 *  Defaults = the liquid/clear effect style. */
export const Playground: StoryObj<PlaygroundArgs> = {
  args: { refraction: 0.8, depth: 20, dispersion: 0.4, frost: 1, lightIntensity: 0.8, lightAngle: -45, tint: 'clear', shape: 'card' },
  argTypes: {
    refraction: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: 'Figma Glass · Refraction' },
    depth: { control: { type: 'range', min: 1, max: 60, step: 1 }, description: 'Figma Glass · Depth (px)' },
    dispersion: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: 'Figma Glass · Dispersion' },
    frost: { control: { type: 'range', min: 0, max: 20, step: 0.5 }, description: 'Figma Glass · Frost' },
    lightIntensity: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: 'Figma Glass · Light intensity' },
    lightAngle: { control: { type: 'range', min: -180, max: 180, step: 1 }, description: 'Figma Glass · Light angle (degrees clockwise from the top)' },
    tint: { control: 'inline-radio', options: ['clear', 'regular', 'subtle', 'none'] },
    shape: { control: 'inline-radio', options: ['card', 'pill', 'circle'] },
  },
  render: (a) => (
    <LiquidBackdrop src={balloons} position="center 35%" style={{ position: 'relative', width: '100%', height: '100vh', minHeight: 640, overflow: 'hidden' }}>
      <PlaygroundLens {...a} />
    </LiquidBackdrop>
  ),
};
