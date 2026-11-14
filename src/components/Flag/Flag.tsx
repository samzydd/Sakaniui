/**
 * Flag
 *
 * A country flag, from the Figma "Flags" set (Assets page): a 16 x 16 box with the flag drawn in a rounded rectangle
 * across its middle. Pick the country by its ISO 3166-1 alpha-2 code; the size scales the whole box (Figma uses 16
 * beside text and 32 beside a heading). A country whose artwork has not been imported yet draws a neutral placeholder
 * of the same shape, so a row of flags never shifts.
 *
 * The flag is decorative unless you give it a `label`: put the country's name in text beside it, as a flag alone is
 * not enough for people who cannot see it.
 */

import React from 'react';
import { FLAG_ART } from './flags';

export interface FlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. "GB", "JP", "IN". Case does not matter. */
  country: string;
  /** The box size in px. Figma uses 16 (beside text) and 32 (beside a heading). Defaults to 16. */
  size?: number;
  /** The country's name, when the flag is the only thing that says it. Without it the flag is hidden from assistive tech. */
  label?: string;
  className?: string;
}

export const Flag: React.FC<FlagProps> = ({ country, size = 16, label, className }) => {
  const art = FLAG_ART[country.toUpperCase()];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
      // the artwork is the library's own static markup (flags.ts), never user input
      dangerouslySetInnerHTML={{ __html: art ?? '<rect x="0" y="2.5" width="16" height="11" rx="2.5" fill="currentColor" opacity="0.15"/>' }}
    />
  );
};
Flag.displayName = 'Flag';

export default Flag;
