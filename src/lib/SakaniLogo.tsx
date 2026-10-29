/**
 * SakaniLogo
 *
 * The SakaniUI arc mark: a disc cut by two arcs that sweep out from the
 * lower-left corner. Traced from the Figma component "Logo / SakaniUI arc
 * mark" (64x64 grid, on the Demo page) -- not exported from the package.
 * SidebarHeader's `logo` slot is intentionally brand-agnostic (any icon or
 * node), so this exists only for this library's own demos and blocks that
 * stand in for "the Sakani app" (ChatInterfaceBlock, CRMDashboardBlock),
 * matching brandLogos.tsx's pattern for LogoCloudBlock's own demo marks.
 *
 * Painted with fg/default, so it re-themes with the tokens. It carries
 * `data-sakani-logo`, which SidebarHeader uses to drop its accent tile:
 * the mark sits on the header itself, as in the Figma "In product" spec.
 * Fills its box unless `size` is given.
 */

import React from 'react';

export const SAKANI_MARK_PATHS = [
  'M1.42578 22.5264C23.2117 23.2619 40.7366 40.7874 41.4727 62.5732C38.4791 63.4997 35.298 64 32 64C31.158 64 30.3237 63.9662 29.498 63.9023C29.4455 47.6871 16.3121 34.553 0.0966797 34.501C0.0328793 33.6757 0 32.8417 0 32C0 28.7018 0.499182 25.5201 1.42578 22.5264Z',
  'M0.889648 39.5176C13.7129 39.9753 24.0232 50.2863 24.4814 63.1094C12.8474 60.3077 3.69089 51.1518 0.889648 39.5176Z',
  'M32 0C49.6731 0 64 14.3269 64 32C64 44.5026 56.8286 55.3282 46.376 60.5938C44.7132 37.6274 26.3718 19.2853 3.40527 17.623C8.6709 7.17063 19.4975 0 32 0Z',
];

export const SakaniLogo: React.FC<{ size?: number }> = ({ size }) => (
  <svg
    width={size ?? '100%'}
    height={size ?? '100%'}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    data-sakani-logo=""
  >
    {SAKANI_MARK_PATHS.map((d) => <path key={d} d={d} fill="var(--color-fg-default)" />)}
  </svg>
);

export default SakaniLogo;
