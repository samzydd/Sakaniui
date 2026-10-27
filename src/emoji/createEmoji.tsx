/**
 * Sakani emoji: Fluent Emoji Flat (Microsoft, MIT), full-colour vector art.
 *
 * The props mirror the icons (size, title, className), so an emoji sits next to
 * an icon without any extra styling. Emoji keep their own colours: they ignore
 * the text colour. The default size is 24, the icon grid; pass '1em' to make
 * one follow the surrounding text like a font emoji.
 */
import React from 'react';

export type EmojiTone = 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark';

export interface EmojiProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'children' | 'dangerouslySetInnerHTML'> {
  /** Rendered size: px, or any CSS length ('1em' follows the text). Default 24. */
  size?: number | string;
  /** Skin tone, for the emoji that have one (people and hands). Ignored by the others. Default: the yellow emoji. */
  tone?: EmojiTone;
  /** Accessible name. Without it the emoji is decorative (aria-hidden). */
  title?: string;
}

export type SakaniEmoji = React.ForwardRefExoticComponent<EmojiProps & React.RefAttributes<SVGSVGElement>> & {
  emojiName: string;
};

/** Some pictures define gradients by id; give each instance its own ids so two copies never share (or lose) one. */
const scopeIds = (body: string, scope: string) =>
  body
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${scope}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${scope}${id})`)
    .replace(/(xlink:)?href="#([^"]+)"/g, (_, ns = '', id) => `${ns}href="#${scope}${id}"`);

/** Builds an emoji component from its artwork (an SVG body in a 32-unit grid) and optional skin-tone variants. */
export function createEmoji(
  emojiName: string,
  body: string,
  tones?: Partial<Record<EmojiTone, string>>,
  opts: { h?: number; ids?: boolean } = {},
): SakaniEmoji {
  const viewBox = `0 0 32 ${opts.h ?? 32}`;
  const Emoji = React.forwardRef<SVGSVGElement, EmojiProps>(function Emoji(
    { size = 24, tone, title, className, ...rest },
    ref,
  ) {
    const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
    const picked = (tone && tones?.[tone]) || body;
    const html = opts.ids ? scopeIds(picked, `e${uid}-`) : picked;
    const a11y = title
      ? { role: 'img' as const, 'aria-label': title }
      : { 'aria-hidden': true as const, focusable: 'false' as const };
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        className={['sakani-emoji', `sakani-emoji-${emojiName}`, className].filter(Boolean).join(' ')}
        {...a11y}
        {...rest}
        dangerouslySetInnerHTML={{ __html: (title ? `<title>${title.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</title>` : '') + html }}
      />
    );
  }) as SakaniEmoji;
  Emoji.displayName = 'Emoji' + emojiName.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  Emoji.emojiName = emojiName;
  return Emoji;
}
