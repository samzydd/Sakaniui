/** Helpers around <SourceLogo>: the logos as `icon`-prop components, and the list of names. */
import type { IconComponent } from '../../icons/types';
import { SourceLogo } from './SourceLogo';
import { SOURCE_LOGO_DATA, type SourceLogoName } from './logoData';

/** Every logo name, in a stable order, for pickers and galleries. */
export const sourceLogoNames = Object.keys(SOURCE_LOGO_DATA) as SourceLogoName[];

/** An icon component with a brand colour, for the `icon` props. */
export type SourceLogoIcon = IconComponent & { logoName: SourceLogoName; brandColor: string | null };

const cache = new Map<SourceLogoName, SourceLogoIcon>();

/** The logo as an `icon`-prop component: `<ChainOfThoughtStep icon={sourceLogo('reddit')} ... />`. Stable between calls. */
export function sourceLogo(name: SourceLogoName): SourceLogoIcon {
  let icon = cache.get(name);
  if (!icon) {
    const Logo: IconComponent = ({ size, className, style, 'aria-hidden': ariaHidden }) => (
      <SourceLogo name={name} size={size} className={className} style={style} aria-hidden={ariaHidden} />
    );
    Logo.displayName = `SourceLogo(${name})`;
    icon = Object.assign(Logo, { logoName: name, brandColor: SOURCE_LOGO_DATA[name].color });
    cache.set(name, icon);
  }
  return icon;
}
