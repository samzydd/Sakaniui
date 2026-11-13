/**
 * HeroBlock — Blocks / Marketing / Hero
 *
 * A COMPOSITION EXAMPLE, not a configurable component. Copy this file into
 * your project and edit it directly: wire the two actions to your real
 * signup/repo links in place of the callbacks here.
 *
 * Matches Figma "Hero" (node 1505:27910, 2 layouts: Centered, Split).
 * `layout` stays a real, explicit prop (Figma's own axis) -- a genuine
 * layout choice, not derivable from the copy or image:
 *   'centered' -- everything stacked and center-aligned, larger display
 *     type (40px title), full-width image below the CTAs, and a caption
 *     line under the image.
 *   'split'    -- content column (badge/title/description/CTAs) beside
 *     a fixed-size image, left-aligned, smaller title (28px, the same
 *     heading/lg size SectionHeading uses) -- no caption line in this
 *     layout (Figma's own Split export has none).
 *
 * Both buttons reuse the shared Button component at size="lg" with an
 * 18px-vs-16px icon quirk already worked out for CtaBannerBlock's own
 * GitHub button (Button doesn't clone-resize icons, and Button's own
 * lg-size icon convention is actually 16px despite its doc comment
 * claiming 18px) -- same local GitHub icon, default size 16, reused
 * here rather than a shared export since blocks are copy-paste
 * composition examples.
 *
 * `image` is a required prop, not a bundled default: Figma's own hero
 * mockup uses a named "Pattern Refraction" effect (an iridescent,
 * diagonally-banded foil/glass texture) as its generic "image goes
 * here" placeholder, and this file's own Storybook demo supplies the
 * real downloaded graphic for that -- but it is NOT imported inside
 * this component file. A real Vite constraint forced that split:
 * imported assets get base64-inlined directly into the built JS in
 * `vite build --lib` mode regardless of file size or the assetFileNames
 * config (there's no HTML entry point in library output to resolve a
 * hashed relative asset URL against, unlike a normal app build) --
 * confirmed by measurement: bundling that one ~340KB image here
 * ballooned blocks.cjs from ~350KB to over 1.2MB. Keeping large demo
 * imagery confined to *.stories.tsx (excluded entirely from the
 * published build) is the same convention every other block with
 * photos already follows in this library.
 *
 * `revealImage` is an optional add-on: when set alongside `image`, the
 * image area becomes a scratch-reveal -- dragging/swiping over it
 * erases `image` to expose `revealImage` underneath, via a canvas
 * (ScratchRevealImage.tsx, colocated in this folder) using
 * destination-out compositing along the pointer's path. Omitting it
 * keeps the image a plain static `<img>`, matching Figma exactly.
 */

import React from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ScratchRevealImage } from './ScratchRevealImage';
import styles from './HeroBlock.module.css';

const GithubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      d="M12 0.296997C5.37 0.296997 0 5.667 0 12.297C0 17.6 3.438 22.097 8.205 23.682C8.805 23.795 9.025 23.424 9.025 23.105C9.025 22.82 9.015 22.065 9.01 21.065C5.672 21.789 4.968 19.455 4.968 19.455C4.422 18.07 3.633 17.7 3.633 17.7C2.546 16.956 3.717 16.971 3.717 16.971C4.922 17.055 5.555 18.207 5.555 18.207C6.625 20.042 8.364 19.512 9.05 19.205C9.158 18.429 9.467 17.9 9.81 17.6C7.145 17.3 4.344 16.268 4.344 11.67C4.344 10.36 4.809 9.29 5.579 8.45C5.444 8.147 5.039 6.927 5.684 5.274C5.684 5.274 6.689 4.952 8.984 6.504C9.944 6.237 10.964 6.105 11.984 6.099C13.004 6.105 14.024 6.237 14.984 6.504C17.264 4.952 18.269 5.274 18.269 5.274C18.914 6.927 18.509 8.147 18.389 8.45C19.154 9.29 19.619 10.36 19.619 11.67C19.619 16.28 16.814 17.295 14.144 17.59C14.564 17.95 14.954 18.686 14.954 19.81C14.954 21.416 14.939 22.706 14.939 23.096C14.939 23.411 15.149 23.786 15.764 23.666C20.565 22.092 24 17.592 24 12.297C24 5.667 18.627 0.296997 12 0.296997Z"
    />
  </svg>
);

export type HeroLayout = 'centered' | 'split';

export interface HeroAction {
  label: string;
  onClick?: () => void;
}

export interface HeroBlockProps {
  /** Small pill above the title. Omit to hide it. */
  eyebrow?: string;
  title: string;
  description: string;
  primaryAction: HeroAction;
  secondaryAction?: HeroAction;
  /** Shows the GitHub icon before the secondary action's label. */
  secondaryActionIcon?: boolean;
  image: string;
  imageAlt?: string;
  /** Presence turns the image into a scratch-reveal: swiping over `image` erases it to expose this underneath. */
  revealImage?: string;
  /** Centered layout only -- e.g. "Free and open source · MIT licensed". */
  caption?: string;
  /** Figma Layout axis. Defaults to "centered". */
  layout?: HeroLayout;
  className?: string;
}

export const HeroBlock: React.FC<HeroBlockProps> = ({
  eyebrow, title, description, primaryAction, secondaryAction, secondaryActionIcon = false,
  image, imageAlt, revealImage, caption, layout = 'centered', className,
}) => {
  const isSplit = layout === 'split';

  const ctaRow = (
    <div className={styles.ctaRow}>
      <Button variant="primary" size="lg" onClick={primaryAction.onClick}>{primaryAction.label}</Button>
      {secondaryAction && (
        <Button
          variant="outline"   // Figma's hero pairs Primary with the Outline button (the CTA banners use Secondary)
          size="lg"
          onClick={secondaryAction.onClick}
          leftIcon={secondaryActionIcon ? <GithubIcon /> : undefined}
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );

  const renderImage = (imageClassName: string) => (
    revealImage
      ? <ScratchRevealImage frontSrc={image} backSrc={revealImage} alt={imageAlt} className={imageClassName} />
      : <img src={image} alt={imageAlt ?? ''} className={imageClassName} />
  );

  if (isSplit) {
    return (
      <div className={[styles.block, className ?? ''].filter(Boolean).join(' ')}>
        <div className={styles.row}>
          <div className={styles.content}>
            {eyebrow && <Badge variant="accent" emphasis="subtle">{eyebrow}</Badge>}
            <p className={styles.titleSplit}>{title}</p>
            <p className={styles.descriptionSplit}>{description}</p>
            {ctaRow}
          </div>
          {renderImage(styles.imageSplit)}
        </div>
      </div>
    );
  }

  return (
    <div className={[styles.block, styles.blockCentered, className ?? ''].filter(Boolean).join(' ')}>
      {eyebrow && <Badge variant="accent" emphasis="subtle">{eyebrow}</Badge>}
      <p className={styles.titleCentered}>{title}</p>
      <p className={styles.descriptionCentered}>{description}</p>
      {ctaRow}
      {renderImage(styles.imageCentered)}
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
};

export default HeroBlock;
