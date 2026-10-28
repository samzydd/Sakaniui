# SakaniUI

An open-source, token-driven React component library for SaaS products — **1500+ accessible components and variants**, built 1:1 from a Figma design system, across light and dark modes, with **built-in glass and Apple-style liquid glass surfaces**.

**[Live Storybook →](https://main--6a5a658b3681fcc010430db5.chromatic.com)** · **[Figma file →](https://www.figma.com/community/file/1661001585975776295)**

![npm](https://img.shields.io/npm/v/@sakaniui/react) ![License](https://img.shields.io/badge/license-MIT-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Storybook](https://img.shields.io/badge/Storybook-10-ff4785)

---

## Why SakaniUI

Most component libraries start in code and retrofit the design. SakaniUI was built the other way: every component is designed first in Figma with a strict three-layer token architecture, then implemented 1:1 in React — same variants, same states, same tokens. The Figma file has grown into a 1500+ component-and-variant system across light and dark mode; the React library mirrors it component by component, with new ones landing as they're built out.

- **Token-driven** — components bind only to semantic tokens (`bg/surface`, `fg/muted`, `accent/default`…), so the entire library re-themes from one place
- **Light & dark mode** — add the `.dark` class to any container; every component re-themes automatically, no per-component dark styles
- **Glass & liquid glass** — a third theme axis, *Surface* (Solid · Glass · Liquid): frosted glassmorphism and Apple-style liquid glass with real lens refraction, switched per area with one attribute — see [Glass & liquid glass](#glass--liquid-glass)
- **Accessible by default** — WCAG AA contrast audited, global focus-ring system, `prefers-reduced-motion` support, full ARIA semantics (combobox active-descendant, calendar date labels, live-region toasts, focus-return popovers)
- **Typed & composable** — strict TypeScript, generic `Table<T>`, slot-based composition, controlled + uncontrolled patterns
- **Geist typography**, **Tabler Icons** (5,184 outline + 1,054 filled) and **Fluent Emoji** (1,594, 311 with skin tones), matching the Figma source exactly


## Icons

The icon set is [Tabler Icons](https://tabler.io/icons): 5,184 outline icons and 1,054 filled ones,
the same as the Figma *↳ Icons (Tabler)* page. One component per icon, tree-shaken individually:

```tsx
import { IconHome, IconBell, IconHeartFilled } from '@sakaniui/react/icons';

<IconHome />                       {/* 24px, 1.5 stroke, currentColor */}
<IconBell size={20} />
<IconHeartFilled color="#e11d48" />
```

Names follow Tabler (`IconName` / `IconNameFilled`), so tabler.io/icons is the search. Props follow
lucide-react (`size`, `color`, `strokeWidth`), and every component prop that takes an icon still
accepts Lucide or Tabler React icons. See `THIRD_PARTY_NOTICES.md` for the MIT licence.

## Emoji

Full-colour emoji from [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (Flat style, MIT): 1,594
of them, the same as the Figma *↳ Emoji* page. One component per emoji, tree-shaken individually:

```tsx
import { EmojiRocket, EmojiPartyPopper, EmojiWavingHand } from '@sakaniui/react/emoji';

<EmojiRocket />                              {/* 24px */}
<EmojiPartyPopper size={32} />
<EmojiWavingHand tone="medium-dark" />       {/* 311 people and hand emoji take a skin tone */}
<EmojiRocket size="1em" />                   {/* follows the surrounding text */}
```

`emojiCatalog` lists every emoji with its label, Unicode character and category, for pickers and search.

## Install

```bash
npm install @sakaniui/react
```

Then import the two stylesheets once, at your app's entry point (both are required: `tokens.css` defines
the design tokens, `style.css` styles the components), and use any component from the package root:

```tsx
import '@sakaniui/react/tokens.css';
import '@sakaniui/react/style.css';

import { Button } from '@sakaniui/react';

export function Example() {
  return <Button variant="primary">Get started</Button>;
}
```

Requires React 19. Typography is set in **Geist**; load the font yourself if you want it (otherwise the
system font is used):

```bash
npm install @fontsource-variable/geist
```

```tsx
import '@fontsource-variable/geist';
```

Charts (`AreaChart`, `BarChart`, ...) use `recharts`, which is installed with the package.

> **Building with AI?** `AGENTS.md` (shipped in this package) explains *why* components behave as they do and what to do when nothing fits. Index for agents: https://www.sakaniui.com/llms.txt

## Quick start (contributing / browsing the source)

```bash
git clone https://github.com/samzydd/Sakaniui.git
cd Sakaniui
npm install
npm run storybook
```

Storybook opens at `http://localhost:6006` with every component, all variants, and dark-mode stories.

## Usage

Import the tokens once, then use any component from `@sakaniui/react`:

```tsx
import '@sakaniui/react/tokens.css';
import { Button, StatCard } from '@sakaniui/react';
import { IconCurrencyDollar } from '@sakaniui/react/icons';

export const Dashboard = () => (
  <>
    <StatCard
      variant="icon"
      icon={IconCurrencyDollar}
      title="Revenue"
      value="$48,120"
      delta="+12.5%"
      trend="up"
      sparkline={[12, 18, 14, 22, 19, 28]}
    />
    <Button variant="primary" size="md">Get started</Button>
  </>
);
```

### Dark mode

```tsx
<div className="dark">
  {/* everything inside re-themes automatically */}
</div>
```

## Use it with AI (agents, Cursor, Claude Code)

SakaniUI ships a machine-readable contract and an MCP server, so an AI assistant looks components
up instead of guessing prop names.

- `@sakaniui/react/manifest.json` -- every component and block with props, types, allowed values,
  defaults, required props and all design tokens, generated from the source on every build.
- `AGENTS.md` -- the "why" guide (principles, when nothing fits, glass, icons, checklist).
- **Agent skill** -- `skills/sakaniui/SKILL.md`, an open [Agent Skills](https://agentskills.io) file that Claude Code, Cursor and other
  skills-compatible agents read, tells your assistant when to use SakaniUI and where to look things up
  (the MCP server, the manifest, `AGENTS.md`). Install it with
  `mkdir -p .claude/skills && cp -r node_modules/@sakaniui/react/skills/sakaniui .claude/skills/`
  (or `~/.claude/skills/` for every project). Other tools keep skills in their own folder: copy the same `sakaniui` folder there.
- **MCP server** -- add it to your editor's MCP config (Claude Code, Cursor, Windsurf, ...):

```json
{
  "mcpServers": {
    "sakaniui": { "command": "npx", "args": ["-y", "@sakaniui/mcp"] }
  }
}
```

Claude Code: `claude mcp add sakaniui -- npx -y @sakaniui/mcp`

On Windows, launch `npx` through `cmd /c` (`"command": "cmd", "args": ["/c", "npx", "-y", "@sakaniui/mcp"]`,
or `claude mcp add sakaniui -- cmd /c npx -y @sakaniui/mcp`). Needs Node.js 18 or later.

The server is its own tiny package, [`@sakaniui/mcp`](https://www.npmjs.com/package/@sakaniui/mcp) (about 1 MB, starts in a couple of seconds; it does not install the component library). The copy bundled in `@sakaniui/react` (`npx -y -p @sakaniui/react sakaniui-mcp`) still works but downloads far more.

Tools: `search_components`, `get_component` (with a type-checked `example`), `search_icons`, `search_emoji`,
`check_code` (checks a whole snippet: imports, required props, values, icon names, and the field names of object props such as table columns), `check_usage`,
`list_components`, `get_tokens`, `get_guide`, `check_compatibility` and `get_changelog`.

- **Read-only.** It reads five fixed files from a `@sakaniui/react` install (package.json, the
  manifest, the icon index, AGENTS.md, CHANGELOG.md). Code given to `check_code` is read as text, never run. It writes nothing, runs nothing, opens no network connection and
  takes no file paths. Every tool is marked read-only.
- **Matches your version.** It finds the `@sakaniui/react` installed in your project (working directory,
  or `--project <dir>`) and flags components your version does not have yet, with the release notes for
  the versions in between (`get_changelog`).
- **Accurate by construction.** `npm run build:lib` fails if the manifest disagrees with the real build:
  an export that is not described, a prop that is not declared, an example that does not type-check, an
  icon name that does not exist, a token that is not defined, or anything that looks like a private reference.

### Troubleshooting the MCP server

Run this in a terminal first. It checks Node, the data, the tools and your project, and prints a report you can
paste when asking for help:

```bash
npx -y @sakaniui/mcp --doctor
```

| Symptom | Fix |
|---|---|
| `spawn npx ENOENT`, or the editor cannot start it | Desktop editors often start with a smaller `PATH` than your terminal (common with nvm and Homebrew). Use the full path: run `which npx` (macOS/Linux) or `where npx` (Windows) and put that in `"command"`, e.g. `"/opt/homebrew/bin/npx"`. |
| Windows | `npx` is a `.cmd` script: use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@sakaniui/mcp"]`. |
| Connects, but tool calls fail (before 0.8.13) | Node older than 16.9. Update Node (18 or later is supported), or use `@sakaniui/mcp@latest`. |
| "Node.js ... is too old" | Install Node 18 or later: https://nodejs.org (check with `node --version`). |
| Times out on the first start | The first run downloads about 200 kB. Run `npx -y @sakaniui/mcp --version` once in a terminal to warm the cache, then restart the editor. |
| Behind a company proxy or private npm registry | The machine must reach `registry.npmjs.org` (check `npm config get registry`) and `@sakaniui/*` packages must be allowed. |
| Odd `npx` errors, or an old version keeps running | Delete the `_npx` folder inside your npm cache (find it with `npm config get cache`), then restart the editor. |
| Added it but no tools appear | Restart the editor. In Claude Code run `/mcp` and look for `sakaniui` with 10 tools. |
| `Failed to connect` after typing the command by hand | Check the package name for a full-width `＠` or stray characters; copy the command from here instead. |

## Glass & liquid glass

Glass is built into the theme system, not added component by component. Next to light/dark, SakaniUI has a second axis — **Surface** — with three modes: **Solid** (the default), **Glass** (frosted translucency) and **Liquid** (Apple-style liquid glass: the backdrop *bends* at the edges like a lens, with a faint color fringe, rim light and depth). Components read a small set of `--surface-*` tokens, so switching an area from Solid to Glass or Liquid re-themes everything inside it at once — in the Figma file (variable modes and effect styles) and in code. Solid stays pixel-identical to before.

```tsx
// Frosted glass: one attribute on any ancestor (works in light and dark)
<div data-surface="glass">
  <Sidebar />
  <Card>…</Card>
</div>

// Liquid glass: a lens-refracting sheet over a photo, UI on top
import { LiquidBackdrop, LiquidGlass } from '@sakaniui/react';

<LiquidBackdrop src="photo.jpg" style={{ position: 'relative' }}>   {/* every lens refracts this photo */}
  <LiquidGlass variant="regular" tint="subtle" radius={0} style={{ position: 'absolute', inset: 0 }} />
  <div data-surface="liquid" style={{ position: 'relative' }}>
    <Sidebar />                                  {/* transparent: sits on the glass */}
    <div data-surface="solid"><Card>…</Card></div> {/* data stays solid and crisp */}
  </div>
</LiquidBackdrop>
```

The recipe is always the same three layers: **photo → one glass overlay → components**. Inside a `LiquidBackdrop`, every lens refracts the sharp photo itself (as Figma's glass does), so glass on glass still bends real detail with visible color fringing. See the full **Liquid Glass Dashboard** block (`@sakaniui/react/blocks`) for a complete example: lenses that spring between sidebar items and stretch like a droplet, a collapsible rail with tooltips, frosted menus, solid data cards on a glass panel, and a layout that reflows to its container.

### Liquid Glass in 5 minutes

**1. Install and import the styles once** (see [Install](#install)): `@sakaniui/react/tokens.css` and `@sakaniui/react/style.css`.

**2. Put your photo in a `LiquidBackdrop`.** Give it a size; the photo is cover-fitted. Pick imagery with color and detail, since glass has nothing to bend over a flat color.

**3. Add glass on top.** Anything inside the backdrop can be a lens:

```tsx
import { LiquidBackdrop, LiquidGlass, Button } from '@sakaniui/react';

export function Hero() {
  return (
    <LiquidBackdrop src="/photo.jpg" style={{ position: 'relative', height: 480 }}>
      {/* a card of glass: clear = see-through, regular = carries text */}
      <LiquidGlass variant="regular" radius={28} style={{ position: 'absolute', left: 48, top: 48, width: 340, padding: 24 }}>
        <h2>Glass that bends light</h2>
        <p>Components inside sit on the glass with no fills of their own.</p>
        <Button>Get started</Button>
      </LiquidGlass>

      {/* a floating pill that squishes when pressed */}
      <LiquidGlass variant="clear" radius={999} interactive style={{ position: 'absolute', right: 48, bottom: 48, padding: '12px 20px', color: '#fff' }}>
        Explore
      </LiquidGlass>
    </LiquidBackdrop>
  );
}
```

**4. Tune it with Figma's own properties.** The defaults are Figma's `liquid/regular` and `liquid/clear` effect styles. Change any of them for one element:

```tsx
<LiquidGlass variant="clear" effect={{ refraction: 1, depth: 40, dispersion: 0.7, frost: 0 }} radius={999} />
```

**5. Check it in dark mode and Safari.** Wrap a container in `.dark` to see the dark tint. In Safari and Firefox you'll see the frosted fallback; add `refraction="off"` to preview it in Chrome. Browse every property live in Storybook: *Foundations → Liquid Glass → Playground*.

- **Browsers** — refraction renders in Chromium (Chrome, Edge, Arc); Safari and Firefox get a frosted fallback with the same rim.
- **Fast** — big static lenses (overlays, panels) render their glass once into a canvas and stay at 60fps; small moving lenses stay live (`bake={false}` keeps a big moving lens live).
- **Accessible** — `prefers-reduced-transparency` turns glass into an opaque surface, `prefers-reduced-motion` stops the glare and glide; secondary text has its own stronger color token on glass, and the docs list measured contrast for every tint.
- **Figma's Glass properties, 1:1** — refraction, depth, dispersion, frost and light are tokens in Figma's own units (`--liquid-refraction-clear: 0.8`, `--liquid-depth-clear: 20`, …), matching the liquid/regular and liquid/clear effect styles, or per element: `<LiquidGlass effect={{ refraction: 0.8, depth: 20 }}>`. `tint="subtle"` is Figma's 5% overlay fill, and `data-on-photo` switches a subtree to light text.

Docs: **[sakaniui.com/docs/glass](https://www.sakaniui.com/docs/glass)** · Storybook: *Foundations → Liquid Glass* (Showcase, Dark, Playground with Figma's Glass properties as controls) and *Foundations → Glass*.

## Token architecture

Three layers, defined in Figma and exported to `tokens.css`:

1. **Primitives** — raw scales (`neutral/50–950`, `primary/…`, spacing, radii)
2. **Semantic** — purpose-named aliases that flip between light and dark (`bg/surface`, `fg/default`, `border/subtle`, `accent/default`, `chart/1–5`)
3. **Components** — bind *only* to semantic tokens, never to primitives

Change a semantic token and every component follows — in both the design file and the code.

## Components (1500+ components and variants)

**Core** — Button · Icon Button · Badge · Label · Divider · Link · Kbd · Spinner · Skeleton · Progress · Tooltip · Avatar · Avatar Group

**Forms** — Input · Textarea · Select · Checkbox · Radio · Switch · Slider · Combobox (single/multi, async loading) · File Upload

**Composite** — Card · Alert · Toast · Toaster (Sonner-style `toast()` stack) · Accordion · Tabs · Breadcrumb · Table (generic, selectable) · Stat Card (sparklines) · Stepper · Calendar (single + range, dropdown navigation) · Pagination · Popover · Segmented Control · List Item

**Sidebar kit** — Sidebar · Header · Search · Item · Sub Item · Group Label · Divider · Promo · Footer — nine standalone parts that compose into full navigation

**Navigation** — Top Bar · Top Bar (mobile)

**Overlays** — Menu · Menu Item

**Glass** — Liquid Glass (`LiquidGlass`, `LiquidBackdrop`, `useLiquidGlass`) · Surface modes (`data-surface="glass" | "liquid" | "solid"`)

**Data** — Empty State · Filter Chip

**Charts** — Area · Bar · Donut · Funnel · Heatmap · Line · Pie · Radar · Radial — Recharts wrappers styled entirely with the `chart/1–6` tokens

**Chat** — Chat Composer · Conversation Item · Message Bubble

**Application** — Activity Feed · Announcement · Avatar Upload · Balance · Code Snippet · Expenses · Inline Hint · Modal · Notification Item · Progress Item · Progress Stat · Rich Separator · Spending Balance · Stock Market · Tags · Ticker · Transactions

**E-commerce** — Cart Item · Checkout Steps · Color Swatch · Price Display · Product Card · Product Gallery · Quantity Selector · Size Selector · Star Rating · Stock Status · Wishlist Button

**Marketing** — Blog Blockquote · Blog Feature Text · Blog Image · Blog Listing Card · Blog Listing Featured Card · Featured Icon · First Page Heading · Job Listing · List · Location Dot · Marquee · Metric · Mobile Navigation Menu · Placeholder Logo · Profile Card · Rich Text Heading · Rich Text Paragraph · Section Heading · Sub Feature · Team Card

## Blocks (42)

Blocks are full sections assembled from SakaniUI components — **composition examples**, not fully-configurable components like the ones above. Most ship with realistic sample data and manage their own demo state internally (a `state` prop just switches between the states each one ships with — loading, empty, error, and so on). They're meant as a working starting point you customize, not a drop-in you configure entirely through props.

They live in `src/blocks`, and are also published separately from the main package at **`@sakaniui/react/blocks`** — kept out of the main entry point on purpose, so importing them is a deliberate choice:

```bash
npm install @sakaniui/react
```

```tsx
import { DataTableBlock } from '@sakaniui/react/blocks';

<DataTableBlock />
```

To actually customize one, copy its source file straight from GitHub instead and edit it directly — that's still the intended workflow for anything beyond the states it ships with:

```tsx
// src/blocks/DataTableBlock/DataTableBlock.tsx, copied into your project
import { DataTableBlock } from './DataTableBlock';

// Swap the sample data for your own, edit the columns.
<DataTableBlock />
```

**Application (14)** — Account Overview · Activity Log · App Header · CRM Dashboard · Liquid Glass Dashboard · Data Table + Toolbar · File Upload Panel · Form Modal · Inline CTA · Multistep Modal · Notification Panel · Onboarding Progress · Profile Settings · Section Footer

**Authentication (6)** — Email Verification · Forgot Password · Login · Reset Password · Sign Up · Two-Factor Authentication

**Billing (5)** — Add Card Form · Billing Address · Billing History · Current Plan · Payment Method

**E-commerce (5)** — Checkout Flow · Order Confirmation · Product Detail · Product Grid · Shopping Cart

**Marketing (10)** — Blog Listing · Careers · CTA Banner · FAQ · Feature Grid · Hero · Logo Cloud · Pricing Table · Team Section · Testimonial

**Chat (1)** — Desktop Chat Interface

**Data & Content (1)** — Kanban Board

Browse every block and state in the [live Storybook](https://main--6a5a658b3681fcc010430db5.chromatic.com) under **Blocks**.

## Accessibility

The library ships with an audited AA baseline: contrast-checked token pairs in both modes, a global token-driven focus ring on every interactive element, reduced-motion support, Escape-dismissible tooltips, screen-reader-tracked combobox options, full-date calendar labels, assertive error toasts, and focus-returning popovers. See the Storybook docs tab on each component for its ARIA contract.

## Roadmap

- [x] npm package ([`@sakaniui/react`](https://www.npmjs.com/package/@sakaniui/react))
- [ ] Figma Community publication
- [ ] Theming CLI (custom brand token generation)
- [ ] Vue port

## Support

If SakaniUI is useful to you, you can [tip the creator](https://csakani.gumroad.com/coffee). It funds the time that keeps the system maintained and growing.

## Author

**Sam Okpere** — senior UI/UX & design systems designer

[Portfolio](https://samdesignworks.framer.website) · [Dribbble](https://dribbble.com/samthedes) · [LinkedIn](https://www.linkedin.com/in/samuel-okpere) · [GitHub](https://github.com/samzydd)

## License

MIT — free for personal and commercial use. If SakaniUI saves you time, a star ⭐ helps others find it.
