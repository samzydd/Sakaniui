/**
 * SourceLogo: the real logo of a site an agent searched or read, in its brand colour.
 *
 * Sits next to the icons and emoji: the same size / title / className props, so it fits any `icon` prop
 * (a ChainOfThoughtStep's, a SourceStack chip's) through `sourceLogo('reddit')`, or on its own as
 * `<SourceLogo name="reddit" />`. A brand whose colour is black (X, GitHub, Notion, Medium, Wikipedia)
 * is drawn in currentColor, so it follows the text and stays visible in dark mode.
 *
 * Logos are trademarks of their owners and are here only to name where a result came from.
 */
import React from 'react';
import { SOURCE_LOGO_DATA, type SourceLogoName } from './logoData';

export type { SourceLogoName };

export interface SourceLogoProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'children' | 'name'> {
  /** Which site: "google", "x", "reddit", "github", "linkedin", "youtube", "hackernews", "wikipedia", "stackoverflow", "producthunt", "medium", "notion", "substack", "arxiv", "bluesky", "perplexity" or "duckduckgo". */
  name: SourceLogoName;
  /** Rendered size: px, or any CSS length. Default 16. */
  size?: number | string;
  /** Accessible name. Without it the logo is decorative (aria-hidden), which is right next to a text label. */
  title?: string;
}

export const SourceLogo = React.forwardRef<SVGSVGElement, SourceLogoProps>(function SourceLogo(
  { name, size = 16, title, className, ...rest },
  ref,
) {
  const logo = SOURCE_LOGO_DATA[name];
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const, focusable: 'false' as const };
  if (!logo) return null;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={logo.color ?? 'currentColor'}
      className={['sakani-source-logo', `sakani-source-logo-${name}`, className].filter(Boolean).join(' ')}
      {...a11y}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={logo.path} />
    </svg>
  );
});
SourceLogo.displayName = 'SourceLogo';

export default SourceLogo;
