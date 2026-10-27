import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import * as Emoji from '../emoji';
import {
  emojiCatalog, emojiCategories,
  EmojiRocket, EmojiSparkles, EmojiFire, EmojiPartyPopper, EmojiRedHeart, EmojiThumbsUp, EmojiWavingHand,
  type SakaniEmoji, type EmojiTone,
} from '../emoji';

/**
 * Emoji -- the Sakani emoji set is Fluent Emoji (Flat, by Microsoft, MIT): 1,594
 * full-colour vector emoji, 311 of them with five skin tones. Import from
 * `@sakaniui/react/emoji` (`EmojiRocket`, `<EmojiWavingHand tone="medium-dark" />` ...);
 * each emoji is tree-shaken on its own.
 */
const meta = {
  title: 'Foundations/Emoji',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const page: React.CSSProperties = { padding: 32, fontFamily: 'var(--font-sans)', color: 'var(--color-fg-default)' };
const pascal = (n: string) => n.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const all = Emoji as unknown as Record<string, SakaniEmoji>;
const TONES: EmojiTone[] = ['light', 'medium-light', 'medium', 'medium-dark', 'dark'];

/** Sizes, skin tones and the `1em` size that follows the text. */
export const Overview: Story = {
  render: () => (
    <div style={{ ...page, display: 'grid', gap: 24, alignContent: 'start', background: 'var(--color-bg-canvas)', minHeight: '100vh' }}>
      {[16, 24, 32, 48, 64].map((s) => (
        <div key={s} style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ width: 40, fontSize: 12, color: 'var(--color-fg-muted)' }}>{s}px</span>
          <EmojiRocket size={s} /><EmojiSparkles size={s} /><EmojiFire size={s} /><EmojiPartyPopper size={s} /><EmojiRedHeart size={s} /><EmojiThumbsUp size={s} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <span style={{ width: 40, fontSize: 12, color: 'var(--color-fg-muted)' }}>tone</span>
        <EmojiWavingHand size={48} />
        {TONES.map((t) => <EmojiWavingHand key={t} size={48} tone={t} />)}
      </div>
      <p style={{ fontSize: 20, margin: 0 }}>
        Ship it <EmojiRocket size="1em" style={{ verticalAlign: '-0.15em' }} /> and celebrate <EmojiPartyPopper size="1em" style={{ verticalAlign: '-0.15em' }} />, sized with the text.
      </p>
    </div>
  ),
};

type GalleryArgs = { size: number; category: string; dark: boolean };

/** Every emoji. Search by name, pick a category, change the size and theme in the controls. */
export const Gallery: StoryObj<GalleryArgs> = {
  args: { size: 32, category: 'All', dark: false },
  argTypes: {
    category: { control: 'select', options: ['All', ...emojiCategories] },
    size: { control: { type: 'range', min: 16, max: 64, step: 4 } },
  },
  render: function Render({ size, category, dark }) {
    const [q, setQ] = React.useState('');
    const term = q.trim().toLowerCase();
    const shown = emojiCatalog.filter((e) => (category === 'All' || e.category === category) && (!term || e.name.includes(term.replace(/\s+/g, '-'))));
    return (
      <div className={dark ? 'dark' : undefined} style={{ ...page, background: dark ? '#13151a' : 'var(--color-bg-canvas)', minHeight: '100vh' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${emojiCatalog.length.toLocaleString()} emoji`}
          style={{ display: 'block', margin: '0 auto 24px', width: 320, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-default)', background: 'var(--color-bg-surface)', color: 'inherit' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${size + 72}px, 1fr))`, gap: 8 }}>
          {shown.slice(0, 600).map((e) => {
            const Component = all['Emoji' + pascal(e.name)];
            return (
              <div key={e.name} style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: 8 }}>
                {Component && <Component size={size} />}
                <div style={{ fontSize: 11, color: 'var(--color-fg-muted)', maxWidth: size + 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};
