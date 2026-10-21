# Changelog

All notable changes to `@sakaniui/react` are documented here.

## 0.8.11

Found by asking Claude Code, with the published 0.8.10 MCP server, to add a delete button to a table row:
every tool call was correct and `IconButton` was used properly, but it put the button in a new `Table`
column with `key: 'actions'`, which does not compile (`key` must be a field of the row type). The
contract only said `columns: TableColumn<T>[]`.

- **Object props now have a `shape`** in `manifest.json`: the fields of `TableColumn<T>`, `BreadcrumbItem`,
  `PricingPlan`, `SelectOption`, chart data and 58 more (63 props), read from the shipped type
  definitions, generics kept as declared (`key: keyof T & string`).
- **`recipes`**: code for patterns the types do not teach, compiled on every build. First one: a `Table`
  column that is not data (a delete button, a menu). The build also checks the opposite, that a column
  key which is not on the row type really does not compile.
- **MCP `check_code` checks inline object literals** against the shape: an unknown field (`title` for
  `label`, `pct` for `percent`, with a suggestion), a missing required field (with the item index), and,
  for a `Table`, a column `key` that is not a field of the `rows` written next to it. Spreads, identifiers
  and anything it cannot read are left alone (0 errors on 685 real elements in three apps).
- `AGENTS.md` explains the generic `Table` rule and the new `shape` and `recipes`.

## 0.8.10

Readiness release: everything below was found by testing the package the way a new user, an editor
and an AI agent would, and every fix is now covered by a check that fails the build.

**Installing the library**
- **Fixed: installing `@sakaniui/react` installed Next.js.** The `geist` and `@fontsource-variable/geist`
  font packages were runtime dependencies, though the library never loads them, and `geist` requires
  Next.js as a peer, so every app (Vite included) got Next.js 16. Both are now dev-only; the only runtime
  dependency is `recharts`. Load Geist yourself if you want it (`@fontsource-variable/geist`); otherwise
  the system font is used, as before.
- **Fixed: missing type definitions.** `dist/lib/` was left out of the generated `.d.ts` files, so
  `LiquidGlass`, `LiquidBackdrop`, `HoverGroup`, `useHoverHighlight`, `useLiquidGlass`, `getContrastColor`
  and `iconStrokeWidth` had no types: `<LiquidBackdrop />` compiled without its required `src`. The build
  now fails if any relative import in a shipped `.d.ts` does not resolve.
- **Fixed docs: `style.css` is required.** The README and the website's Installation page only imported
  `tokens.css`, which leaves components unstyled. Both now import both stylesheets.

**The MCP server**
- **New package `@sakaniui/mcp`** (about 190 kB, no dependencies): `npx -y @sakaniui/mcp` starts in
  about 2 s on a first run. Through `@sakaniui/react` it took ~30 s and ~675 MB, long enough for an editor
  to give up. The copy in `@sakaniui/react` still works.
- **`check_code`: no false positives** on 685 real elements across three apps (it reported 77). Aliased
  and default imports, code inside template strings, native attributes and the non-icon exports of
  `@sakaniui/react/icons` are handled; it still catches every deliberate mistake in the test set.
- **Versions per prop and per value.** Each prop added after its component has its own `since` (for
  example `Switch.variant`, 0.8.4), and values added later are listed in `valuesSince`. `since` now means
  "first release you could import it", taken from the package's public exports at every release (the
  social icons are 0.8.6, not 0.3.0). `check_code`, `check_usage` and `get_component` flag props and
  values the project's installed version does not have.
- **Invented props are errors.** A prop that is neither the component's own nor an HTML attribute (React's
  own attribute list now ships in `manifest.json` as `nativeAttributes`) fails `check_code` and
  `check_usage`, with the real prop list and a suggestion (`leftIcon` -> "did you mean leadingIcon?").
  Real HTML attributes (`placeholder`, `href`, `name`...) pass silently; `color` gets a note that it does
  not style the component.
- **Protocol:** negotiates a supported protocol version, answers `resources/list`, `prompts/list` and
  batches, exits when the editor disconnects (flushing replies first), and survives a closed pipe.
  `get_guide` accepts `query`. Tested on Node 18, 20, 22 and 26, with the official MCP SDK client and the
  MCP Inspector, and documented for Windows (`cmd /c npx ...`).
- Removed an unresolvable `$schema` link from `manifest.json`.

## 0.8.9

Stops assistants from inventing code. Found by testing the MCP server in Claude Code: it validated a
snippet correctly, then wrote its own example as `icon={<TrashIcon />}` -- an icon that does not exist,
passed as an element instead of a component.

- **Examples.** Every component and block in `manifest.json` has `example`: the import lines and the
  element with each required prop filled in with a value of the right shape (an array of `BreadcrumbItem`
  gets one real item). Prop types are read from the shipped `.d.ts`, and every example is type-checked
  against the built package; the build fails if one does not compile.
- **Icon index.** `@sakaniui/react/icon-index.json` lists all 5,184 icons (and their 1,054 filled
  variants) with Tabler's category and search tags. The build fails if it differs from the exports.
- **MCP: `search_icons`.** Finds real icon names by meaning ("delete" -> `IconTrash`); common UI intents
  rank the conventional icon first.
- **MCP: `check_code`.** Checks a whole snippet as text (it is never run): imports must exist and come
  from the right entry point, every SakaniUI element needs its required props, values must be allowed,
  and icon props must be real icon components passed as `icon={IconTrash}`. Errors carry line numbers
  and suggestions ("TrashIcon is not exported... Did you mean: IconTrash?").
- **MCP: `check_usage`** now validates icon props too, and `get_component` points at the example and
  at `search_icons`.
- Fixed a type error in `KanbanBoardBlock` (drag attributes when dragging is disabled) that was printed
  during every build.

## 0.8.8

Audit of the agent contract and MCP server (accuracy, security, versioning).

- **Manifest accuracy.** `FaqBlock.columns` is now `1 | 2` (numbers), not `"1" | "2"`; prop `values`
  keep their real type. All 231 design tokens are listed (the 49 `glass-*`, `surface-*` and `liquid-*`
  tokens were missing). `LiquidGlass`, `LiquidBackdrop` and `HoverGroup` are described, and hooks and
  helpers are listed under `utilities`. Defaults that are code (`createIcon(...)`, arrow functions) are
  no longer shown. The build now fails if a public component is exported but not described, so the
  manifest cannot silently fall behind.
- **Manifest content.** Design-tool (Figma) notes, source paths and a sample e-mail address are no longer
  shipped in the manifest.
- **Versioning.** Every component has `since`, the first release that contained it. `CHANGELOG.md` now
  ships in the package. The MCP server finds the project's own installed `@sakaniui/react` (working
  directory, or `--project <dir>`) and answers from that copy; when the project is older it flags
  components it does not have yet. New tools `check_compatibility` and `get_changelog`.
- **Summaries.** Component summaries were rewritten where the source notes were maintainer-only text
  (garbled or empty summaries, design-tool node ids); blocks get a name-and-group summary.
- **Verified on every build.** `npm run build:lib` now also runs `scripts/manifest/verify.mjs`, which fails
  the build (and so `npm publish`) if an entry is not a real export, a prop is not in the type
  definitions, a token disagrees with `tokens.css`, `since` is newer than the package, or anything that
  looks like a private reference (design-file link or node id, e-mail address, local path, key) or any
  write / network / exec code in the server appears.
- **Server hardening.** Every tool argument is type- and length-checked, tools are marked read-only, and
  the server reads only four fixed files from an install (package.json, manifest, AGENTS.md, CHANGELOG.md).

## 0.8.7

- **Machine-readable contract for AI agents and tooling.** The package now ships
  `@sakaniui/react/manifest.json`: every exported component and block (123 + 42) with its import
  path, summary, props, types, enum values, defaults, required props and a
  `requiresAccessibleName` flag, plus all 182 design tokens. It is generated from the TypeScript
  source on every `build:lib` (react-docgen-typescript), so it cannot drift from the code, and it only
  lists names that are really exported. AGENTS.md now points agents at it first.
- **MCP server.** `npx -y -p @sakaniui/react sakaniui-mcp` starts a local, dependency-free Model
  Context Protocol server over stdio that answers from the shipped manifest and AGENTS.md. Tools:
  `search_components`, `get_component`, `list_components`, `get_tokens`, `check_usage` (reports
  missing required props, values outside an enum and props that do not exist) and `get_guide`.
- `IconButton`'s `icon` prop description no longer says "Lucide icon component" (it takes Tabler or Lucide).

## 0.8.6

- **Social icons are now exported.** The glyphs the Figma ProfileCard and TeamCard use --
  `XIcon`, `GithubIcon` (ProfileCard) and `InstagramIcon`, `FacebookIcon`, `LinkedinIcon`
  (TeamCard) -- can be imported from `@sakaniui/react`, so an app's `socialLinks` can use the exact
  same icons as the design system instead of copying them. They draw in `currentColor`.

## 0.8.5

- **Sidebar: 8px corners.** To match the Figma file (where the sidebar components now use
  `radius/md`), `SidebarItem`, `SidebarSubItem`, `SidebarSearch` (field, command and collapsed),
  `SidebarHeader` (workspace card and brand button) and the `SidebarFooter` action button go from
  6px to 8px. Small icon buttons (the header toggle and footer menu) and the keyboard-shortcut
  badge keep their size, as in Figma.

## 0.8.4

- **Switch: new `stretch` variant.** `<Switch variant="stretch" />` adds a liquid motion: on every
  toggle the thumb stretches (16 -> about 22px) as it travels -- the edge it is heading toward moves
  first, the tail follows a beat later -- then relaxes into a circle. One smooth motion with no
  overshoot, it stays inside the track, a click mid-travel reverses from where the thumb visibly is,
  and it is off with reduced motion. `variant="default"` (the default) is the plain switch,
  unchanged. Figma: Switch gains a *Type* axis (Default | Stretch).

## 0.8.3

- **SakaniUI.** The design system is now called SakaniUI, and the GitHub repository moved to
  github.com/samzydd/Sakaniui (the old URL redirects). The package name, `@sakaniui/react`, is
  unchanged; this release updates the repository, homepage and issues links shown on npm.

## 0.8.2

- **Kanban Board: calmer motion.** The dragged card's tilt and its settle on drop are now
  near-critically damped (overshoot down from about 30% to 2%), and the cards that slide out of the
  way ease in without overshooting.

## 0.8.1

- **Kanban Board: smooth drag and drop.** The block's native HTML5 drag is replaced by pointer-based
  dragging (mouse, pen and touch). While you drag, the card lifts and swings from the grab point
  with its movement; a drop slot -- the card itself at 20% with a 12/4 dashed outline -- opens
  exactly where it will land and the other cards slide out of the way; on release the card glides
  into place. Drops land at the slot's position instead of the end of the column. Touch drags start
  with a press-and-hold, the board auto-scrolls at its edges, a card dropped outside every column
  springs back, and reduced motion turns off the swing and glide.
- The sample board has photo avatars and five or six cards per column. Figma: Board Column gains a
  *Drop target* variant, and the Kanban *Dragging* state shows the new slot.

## 0.8.0

- **Removed:** Glass Icons (`@sakaniui/react/glass-icons`). The glass versions couldn't stay faithful
  to every Tabler icon, so the set is gone from the package, the docs and the Figma file (with its
  `glass-icon/*` variables and `--glass-icon-*` tokens). Use the regular icons from
  `@sakaniui/react/icons` instead (`GlassHeart` -> `IconHeart`). Glass and liquid glass *surfaces*
  are unchanged.
- `lucide-react` is gone entirely, and so is its licence notice: every icon is Tabler (MIT).

## 0.7.0

- **Tabler Icons is now the icon set.** New entry point `@sakaniui/react/icons` with all 5,184 Tabler
  outline icons (`IconHome`, `IconCalendar` ...) and 1,054 filled ones (`IconHomeFilled` ...),
  generated from `@tabler/icons` and matching the Figma *↳ Icons (Tabler)* page. One component per
  icon, tree-shaken individually (one icon is about 1 kB). Props follow lucide-react (`size`,
  `color`, `strokeWidth`, `absoluteStrokeWidth`) plus `title`; default stroke 1.5, the Figma stroke.
- **Every component now renders Tabler icons.** The 125 Lucide icons used inside components and
  blocks were swapped for their Tabler equivalents, with the same mapping as the Figma file (house
  -> home, triangle-alert -> alert-triangle, panel-left -> layout-sidebar ...). `lucide-react` is no
  longer a dependency of the package.
- Icon props are typed `IconComponent` (exported from the main entry) instead of Lucide's
  `LucideIcon`; Lucide and Tabler React icons still fit, so existing apps keep working.
- **Removed:** `@sakaniui/react/sicons` (the rounded Lucide set from 0.6.x), replaced by
  `@sakaniui/react/icons`. Swap `SiconHeart` for `IconHeart`; names follow Tabler.
- `THIRD_PARTY_NOTICES.md` now carries Tabler's MIT licence (icons) as well as Lucide's ISC licence
  (Glass Icons, still Lucide-based).

## 0.6.1

- **Sicons: crisp chevrons and checks.** Icons with short, sharp corners (chevrons, checks, small
  arrows, list ticks) now use a 1px corner radius instead of 3.7 or 4; a 4px radius blunted their
  points into curves. The rule: if a 4px radius would use more than 30% of the shorter edge at the
  icon's tightest corner, the whole icon gets 1px (274 icons); every other icon keeps 4px. The
  Figma Sicons set uses the same rule (307 icons there, where Figma joins some lines differently).

## 0.6.0

- **Sicons: Sakani's own icon set, `@sakaniui/react/sicons`.** The same 1,626 icons as the Figma
  *Icons* component set: Lucide's shapes at a 1.5 stroke with softened corners (a 4px radius, 3.7px
  on icons whose short corners can't take 4). One component per icon (`SiconHeart`,
  `SiconCalendar`, ...), each tree-shaken on its own (one icon is under 1 kB).
  - Props follow lucide-react (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`), plus `title`,
    so swapping a Lucide icon is a find-and-replace. Colour is `currentColor`.
  - Figma first: the *Icons* set itself has the same rounded corners, so every icon instance in the
    file matches.
  - Corner rounding is baked into the path data at build time (`scripts/sicons/`), with the same
    rule the Figma set was built with. A few percent of icons can get the 3.7 radius in one and the
    4 in the other where Figma joins lines differently. Where two lines meet at a shared point (an
    arrow head on its shaft) the corner is left as is, as in Figma.
  - Naming: the icon set is now called Sicons everywhere (Figma page *↳ Sicons*, component set
    *Sicons*), credited as based on Lucide. The package now ships `THIRD_PARTY_NOTICES.md` with
    Lucide's ISC licence, which covers Sicons and Glass Icons.
  - Storybook: *Foundations -> Sicons* (overview, close-up, props, searchable gallery).
  - Not changed: the built-in components still render lucide-react icons; moving them onto Sicons is
    a separate step.

## 0.5.0

- **Glass icons: all 1,626 icons in the Sakani icon set, as monochrome frosted glass.** New entry
  point `@sakaniui/react/glass-icons`, one component per icon (`GlassHeart`, `GlassCalendar`, ...),
  each tree-shaken on its own. Each icon's main shape is one charcoal glass solid (top-to-bottom
  gradient, bright rim, soft shadow), a disc tucked behind its corner glows through the glass
  blurred, and inner lines sit on the glass in white (lines off the glass stay solid). Line-only
  icons (arrows, a checkmark) become a single thick glass stroke. Props: `size` (default 24, any CSS
  length), `surface`, `title`.
  - Charcoal on purpose: brand-neutral, so any team can use them. Colours are the new
    `--glass-icon-*` tokens on `:root` and `.dark` (accent, glass-top, glass-bottom, rim, detail,
    detail-off), so light and dark follow the nearest theme scope.
  - Figma first: the file has the matching *Glass Icons* component set (page *↳ Glass Icons*, 1,626
    24x24 `type=` variants mirroring *Icons*, layers scale with the instance), coloured by the
    `glass-icon/*` variables in the Semantic collection (Light/Dark).
  - Which parts are glass and which are lines is decided at build time
    (`scripts/glass-icons/decompose.mjs`), with the same rules the Figma set was built with.
  - The set: 1,603 icons from lucide-react's shape data, 23 from the Figma file (brand logos Lucide
    removed, plus icons Lucide merged into a sibling).
  - Pure SVG on a 24x24 grid (masks, gradients, blur), no backdrop-filter: sharp at any size and the
    same in every browser.
  - `<GlassIcon icon={AnyLucideIcon} />` covers Lucide icons added later (drawn as one glass stroke).
  - Storybook: *Foundations -> Glass Icons* (overview light/dark, sizes, searchable gallery).

## 0.4.11

- **ProductCard matches Figma to the pixel.** Measured against the Figma set (320 x 536), the code
  card was 546px tall and its text column 294px instead of 296px. Fixed: the title-to-description
  gap is 8px (it was the body's 12px), the swatches are the 28px Figma uses (circle 21, check 10)
  instead of 32px, the five stars are 91px wide (2.68px apart, not 4px), and the 1px border is taken
  out of the padding and the image height so the stroke sits "inside" the frame as in Figma. The
  standalone `ColorSwatch` is unchanged: it now sizes from `--swatch-size` (default 32px), which
  the card sets to 28px.

## 0.4.10

- **CRMDashboardBlock is responsive.** It was hard-wired to the viewport (`100vw` x `100vh`) with
  media queries, so inside a frame, a split view or a phone it overflowed and clipped. It now fills
  its container (`--crm-block-height` sets the height; default `100vh`) and its breakpoints are
  container queries. Tablet (<= 880px): the filter panel steps aside and the toolbar wraps. Phone
  (<= 640px): the icon rail becomes a slide-in navigation drawer opened from the top bar's menu
  button (Escape or the scrim closes it), the toolbar stacks, tabs scroll, and padding tightens. The
  table now stacks into cards based on its own width (<= 720px) instead of the window's, so it never
  crams eight columns into a narrow frame. No prop changes.
- **TeamCard matches Figma's text width.** The card's 1px border was added on top of Figma's 12px
  padding (Figma's stroke sits inside the frame), leaving a 378px text column instead of 380px. That
  was enough to wrap the *Card details* bio onto a third line, making the card 20px taller than
  Figma's. The border is now taken out of the padding, so the column is 380px and the bio wraps
  exactly as in Figma.
- **KanbanBoardBlock works on phones.** The toolbar was one non-wrapping row, so the search field,
  filter chips and buttons overlapped below ~700px. The block is now a size container: below 760px
  the toolbar stacks (search, filters, then the actions sharing the row), and the board scrolls edge to
  edge with columns snapping into place as you swipe. Wider layouts are unchanged.

## 0.4.9

- **ProgressItem titles line up with their numbers.** In the vertical layout a title with no
  description sat at the top of the 32px circle, 6px above its centre; it is now centred on the circle.
  A title with a description stays top-aligned so the pair reads as one block. The horizontal layout
  is left-aligned on purpose (the label starts at the circle's left edge) and that is now explicit in
  the CSS.

## 0.4.8

- **AI-readable design system.** The package now ships `AGENTS.md`: the *why* behind the system for
  AI agents and new teammates — setup that must be right, eight principles, what to do when nothing
  fits, when to use (and not use) each component and why it behaves as it does, glass/liquid usage rules,
  the behaviour you must supply yourself, and recipes for AI-product moments (uncertain answers, sources,
  declined requests, partial responses). The docs site serves an index at `/llms.txt` and the full
  text at `/llms-full.txt`.

## 0.4.7

- **SidebarPromo uses the real Button.** Its CTA was a hand-styled `<button>` too. It now renders
  `<Button variant="primary" size="sm">` stretched full width, so it gets the updated hover,
  press and focus effects. Liquid surfaces keep the outlined, see-through look. No prop changes.

## 0.4.6

- **EmptyState uses the real Button.** The action was a hand-styled `<button>` that missed the
  updated Button's hover, press and focus effects. It now renders `<Button variant="outline"
  size="sm">`, so it stays in step with every Button change. No prop changes.

## 0.4.5

- **BlogListingFeaturedCard is responsive.** The horizontal card (a fixed 400px image plus
  text) squeezed its text column to a sliver whenever its container was narrower than ~640px.
  It now measures its own container: side by side when there's room, stacked (image on top,
  full width) below 640px, with the footer wrapping below 360px. Nothing changes at the
  card's designed width (874px), and `BlogListingBlock` is unchanged. New story:
  *Marketing → Blog Listing Featured Card → Responsive*.

## 0.4.4

- **Stepper: the bar animates between steps.** Going forward, the connector fills from the
  step you leave toward the next one and that circle activates when the bar arrives (its ring
  ripples once and the previous circle's check draws in). Going back plays it in reverse,
  draining the bar. Jumping several steps hands the fill from bar to bar. Horizontal and
  vertical. No animation on first render; `prefers-reduced-motion` makes every change
  instant. New stories: *Composite / Stepper → Animated* and *Animated vertical*.

## 0.4.3

- **Faster sidebar toggle in the dashboard.** Collapsing or expanding the sidebar used
  to drop frames (a 367ms frame and 200ms+ tasks on expand): the main glass panel
  rebuilt its megapixel displacement map on every animation frame and the charts
  re-rendered with it. Lens maps are now built only along the edges, big lenses settle
  before re-measuring, and the dashboard content is memoized. Worst frame: 33ms, no
  long tasks. Output is pixel-identical.
- **Collapsed rail:** hovering anywhere on the rail turns the logo into the "open
  sidebar" button (it cross-fades), not only hovering the logo itself.

## 0.4.2

**Liquid glass speaks Figma: the same Glass properties, the same values, the same result.**

- **`LiquidGlass` now takes Figma's Glass effect properties directly**, in
  Figma's units: refraction, depth, dispersion, frost, light intensity and
  light angle. The tokens are the liquid/regular and liquid/clear effect
  styles as they are in Figma:
  `--liquid-refraction-regular|clear` (0.55 | 0.8), `--liquid-depth-*`
  (16 | 20), `--liquid-dispersion-*` (0.3 | 0.4), `--liquid-frost-*` (4 | 1),
  `--liquid-light-intensity-*` (0.7 | 0.8) and `--liquid-light-angle` (-45).
  Per element: `<LiquidGlass effect={{ refraction: 0.8, depth: 20, dispersion: 0.4, frost: 1 }}>`.
- **Measured, property by property.** Each Figma property was swept on its
  own over gradient, step and flat-grey backdrops, and the code reproduces
  every probe: the bend within 0.3px on average (all refraction, depth and
  dispersion values), the frost blur within 0.3px, the light within half a
  brightness level. How each property behaves:
  - Refraction × depth sets the bend; depth also sets how far in it reaches
    (0.8 × depth px). The steep fall near the rim folds the content just
    inside into the magnified band along the edges and round the corners.
  - Dispersion splits the color: red bends more, blue less.
  - Frost blurs the backdrop before it is bent.
  - Light is added on top: a 1px rim, strongest on edges that face the
    light (none on edges side-on to it), plus a shade inside the lit edges
    and a glow inside the far ones. It is drawn in the filter now, so it adds
    light like Figma instead of laying white over the backdrop.
- **Correction to 0.4.1:** Figma's lens never samples outside the element, and
  every edge bends the same way (with the light off). The 0.4.1 note about an
  approximate clear rim no longer applies.
- **Breaking (tokens published in 0.4.1):** `--liquid-bezel-*`,
  `--liquid-shift-*`, `--liquid-profile-*` and `--liquid-saturate-*` are gone
  (Figma has no such properties); `--liquid-depth` is now Figma's Depth, and the
  old inset-shadow token is `--liquid-edge-shade` (Safari/Firefox fallback
  only). `--liquid-light-angle` is Figma's angle in degrees (-45), not a CSS
  gradient angle.
- **New: `LiquidBackdrop`.** Wrap a liquid-glass UI in
  `<LiquidBackdrop src={photo}>` and every lens inside refracts the photo itself
  (an aligned copy, kept aligned while lenses glide, scroll or squish) instead of
  whatever the browser painted below it. Like Figma, glass stacked on glass now
  bends the sharp original: real refraction and color fringing on nested lenses,
  not a blur of the lens below. `veil` lays a color over the image for every lens
  (Figma's 5% overlay fill; a scrim in dark mode). `source={false}` on a lens
  bends the UI below instead (slider knobs, selection droplets).
- **Fast at full-screen sizes.** A live SVG filter over a full-screen lens is
  re-evaluated whenever anything near it repaints (the dashboard ran at ~15fps
  while hovering the sidebar). Inside a `LiquidBackdrop`, lenses bigger than
  300×300 now run the same filter once into a canvas and re-bake only when their
  size, position, theme or properties change: 60fps, pixel-identical. Small
  lenses that move stay live; `bake={false}` keeps a big moving lens live.
- **`LiquidDashboardBlock`** sits on a `LiquidBackdrop`: the promo card and the
  sidebar lenses refract the sharp photo like the Figma frame; the active lens
  springs and stretches as it glides; item labels are fg/default as in Figma.
- **`LiquidDashboardBlock` is responsive.** It reflows to the width of its panel
  (container queries): four stat cards become 2×2, then a column; the charts go
  from three across to two, then one; Recent orders and Recent activity stack.
  Below 900px the sidebar collapses to its rail by itself (until you toggle it).
  The collapsed rail is fixed: lenses hug the 32px buttons, items are centered,
  groups are separated by a hairline, and the lens lands exactly where the
  rail's width animation ends. Search closes on Esc and shows a focus ring.
  Collapsed tooltips are portaled to the page (the rail clipped them and the main
  panel covered them), and hovering a nav item changes nothing but the glass: the
  library's own icon darkening, which fired before the lens faded in, is off.
  The opened search field is a glass pill: its icon and text were white on a white
  box (the top bar is in on-photo mode), so they vanished.
- **Storybook:** *Foundations / Liquid Glass* is now a showcase (sidebar, tab bar
  with a sliding droplet, Now Playing card whose slider knobs turn into lenses,
  a lens you can drag over the photo), a dark version, and a Playground with
  Figma's six Glass properties as controls. The calibration and measurement
  tools moved to *Foundations / Liquid Glass / Lab*.

## 0.4.1

**Liquid glass matches the Figma file.**

- **`tint` prop on `LiquidGlass`** — `"regular" | "clear" | "subtle" | "none"`.
  `subtle` is Figma's `glass/bg-subtle` (5% ink; 8% white in dark), the fill of
  a full-bleed overlay over a photo. Defaults to the variant's own tint.
- **One lens per variant.** `--liquid-refraction`, `-shift`, `-bezel`, `-profile`,
  `-dispersion`, `-frost` and `-saturate` now have `-regular` and `-clear`
  versions (Figma's two `liquid/*` effect styles), fitted against Figma's own
  render. Set the unprefixed name on one element to override just that one.
- **Directional lens, rim and depth.** The bend, the rim light and the inner
  shading follow `--liquid-light-angle` (Figma's light, -45 degrees), so the lit
  edges differ from the far edges as in Figma. New `--liquid-shift-*`
  and `--liquid-profile-*` tokens.
- **Figma's shadows** for both variants (`--liquid-shadow-regular|clear`) and
  Figma's glass tint values (`.64 / .76 / .52`).
- **New `--surface-fg-muted` token** (solid, glass and liquid), and
  `data-on-photo`: light text for any subtree that sits straight on a photo.
- Liquid scope defaults: the `Menu` is frosted, the active `SidebarItem` is flat
  and `SidebarPromo` is transparent with an outlined button, so the dashboard
  block no longer needs overrides for them.
- Known difference: Figma's clear lens samples *outside* the element at its lit
  edges. CSS `backdrop-filter` cannot read outside its own box, so the clear
  variant's rim is an approximation.

## 0.4.0

**Glass and liquid glass.**

- **New theme axis: Surface (Solid · Glass · Liquid).** Components read
  `--surface-*` tokens; `data-surface="glass" | "liquid" | "solid"` on any
  ancestor re-themes everything inside it. Solid is pixel-identical to
  before (checked story by story). Menus, modals and selects carry the
  setting through their portals. `prefers-reduced-transparency` falls back
  to opaque surfaces.
- **New: `LiquidGlass` and `useLiquidGlass`.** Apple-style liquid glass: an
  SVG displacement filter bends the backdrop at the element's edge (with a
  per-channel color fringe), plus tint, rim light, depth and a pointer-
  following glare. Chromium renders the refraction; Safari and Firefox get
  a frosted fallback with the same rim. Tunable through `--liquid-*` tokens
  (tint, refraction, bezel, dispersion, frost, saturate, overlay and panel tints).
- **New block: `LiquidDashboardBlock`** (`@sakaniui/react/blocks`, Storybook
  *Blocks / Application / Liquid Glass Dashboard*). A full dashboard on a
  photo: one glass overlay, transparent chrome, solid data cards, an active
  sidebar lens that only moves on click and a softer hover lens.
- Interaction polish: Switch spring, Slider fling bounce, chip/tag fade-out,
  ListItem hover glide, ghost Button without shadow, Menu radius 8px,
  `Switch` `description` prop, `bg/canvas` hover fill on surface components.
- Fix: the swatch checkmark could render invisible on light swatches in
  server-rendered pages.

## 0.3.5

- Replaces the Sakani mark (`PlaceholderLogo`'s default fill) with the new
  logo, brand-orange background.
- Fix: `vite.lib.config.ts` has no `publicDir` override, so Vite's default
  behaviour was copying this repo's `public/` folder into the published
  package as a side effect — `dist/favicon.svg` shipped inside every install
  of `@sakaniui/react` for no reason connected to the library itself. Still
  ships (removing it isn't this release's job), but now carries the current
  brand mark rather than a leftover unrelated asset.

## 0.3.4

0.3.3 was never actually published — a publish got stuck mid-flight on the
registry (staged but never finalized) and had to be abandoned rather than
retried, so this carries everything that would have shipped as 0.3.3:

- **Fix: `Popover` and `Modal` had no entrance/exit animation at all.** They
  appeared and vanished on a single frame, unlike `Select` and `Combobox`,
  which already ease their panels in and out. Both now animate over 180ms on
  the same curve, kept mounted past `open` so the exit has something to play
  on, and fall back to a timeout if `animationend` never fires (a
  backgrounded tab, or anything suppressing animations) — without it, a
  dismissed popover, or worse a full-screen modal backdrop, could be left
  mounted and invisible over the page while still able to take focus.
- **Fix: charts read colour tokens from `document.documentElement`, ignoring
  any `.dark`/`.force-light` scope between it and the chart.** A chart
  rendered inside a themed container painted the *outer* theme's colours on
  the *inner* theme's background. Tokens now resolve from the chart's own
  element, and the reader re-renders when any ancestor's class changes, not
  just `<html>`'s.
- **Fix: server-rendered charts never picked up real tokens at all.**
  `useThemeTick` only bumped on theme *changes*; under SSR there is no
  `getComputedStyle`, so a server-rendered chart kept its hardcoded fallback
  colours forever once hydrated (React won't patch a hydration mismatch). It
  now also bumps once on mount. Several of those fallbacks were themselves
  stale values from an older palette and are corrected.
- **Fix: `Select`'s floating listbox and `Modal`'s backdrop ignored the
  `.dark`/`.force-light` scope of whatever they were opened from.** Both
  portal to `<body>` to position with `fixed`, which moves them out from
  under any themed container; they now carry that container's theme class
  onto the portaled element.
- `Table` gained a drag handle: a grip icon at the left edge of a
  `reorderable` row, hidden until hover, and the sole drag origin (dragging
  no longer starts from clicking anywhere in the row).
- `CRMDashboardBlock`, `KanbanBoardBlock` and `DataTableBlock` gained
  `fillPlaceholders`, which extends the table to fill a taller container with
  placeholder rows instead of leaving blank canvas below it.
- `Calendar` now exports its `DateRange` type.

## 0.3.2

- **Fix: `@sakaniui/react/tokens.css` was never actually published.** The `exports` map pointed it at `./src/styles/tokens.css`, but `files: ["dist"]` only ever publishes the `dist` folder — so that path never existed in the installed package, and `import '@sakaniui/react/tokens.css'` (exactly as documented in the README) failed to resolve for every consumer. Without it, every component would have rendered completely unstyled: the CSS ships only the `var(--color-fg-default)` *references*, not the `:root { --color-fg-default: ... }` *definitions*. Fixed by copying `tokens.css` into `dist/` as part of the build and pointing the export there instead.

## 0.3.1

- Fix: `Combobox`'s `loading` prop (the panel's loading state) was declared on `ComboboxOption` instead of `ComboboxProps`, so passing it to `<Combobox loading />` as documented was a type error and the prop was unreachable in a type-checked consumer. Moved to `ComboboxProps`, where the component was already reading it from at runtime.

## 0.3.0

The library has grown substantially since the last published release —
five new categories of primitives and dozens of new blocks, all matching
their Figma source 1:1 and shipping with full light/dark support.

**New component categories:**
- **E-commerce** — Cart Item, Checkout Steps, Color Swatch, Price Display, Product Card, Product Gallery, Quantity Selector, Size Selector, Star Rating, Stock Status, Wishlist Button
- **Marketing** — Blog Blockquote, Blog Feature Text, Blog Image, Blog Listing Card, Blog Listing Featured Card, Featured Icon, First Page Heading, Job Listing, List, Location Dot, Marquee, Metric, Mobile Navigation Menu, Placeholder Logo, Profile Card, Rich Text Heading, Rich Text Paragraph, Section Heading, Sub Feature, Team Card

**New blocks:**
- **Authentication** — Email Verification, Forgot Password, Login, Reset Password, Sign Up, Two-Factor Authentication
- **Billing** — Add Card Form, Billing Address, Billing History, Current Plan, Payment Method
- **E-commerce** — Checkout Flow, Order Confirmation, Product Detail, Product Grid, Shopping Cart
- **Marketing** — Blog Listing, Careers, CTA Banner, FAQ, Feature Grid, Hero, Logo Cloud, Pricing Table, Team Section, Testimonial
- **Application** — Account Overview, Activity Log, App Header, Data Table + Toolbar, File Upload Panel, Form Modal, Inline CTA, Multistep Modal, Notification Panel, Onboarding Progress, Profile Settings, Section Footer

**Other:**
- `StarRating` gained a full `orientation` axis (horizontal / horizontal-reverse / vertical), shared between the E-commerce Product Detail block and Marketing's own Star Rating usage.
- Every component and block's Storybook Docs page now renders a real, written explanation (previously blank) — what it does, what it maps to in Figma, and key implementation notes, sourced from each component's own doc comments.
- The Storybook landing page now introduces the Sakani Design System itself instead of Storybook's generic default onboarding content.
- README's component/block inventory brought up to date with the actual library (114+ components, 41 blocks).

## 0.2.0

- Blocks are now published from a separate subpath, `@sakaniui/react/blocks`, kept out of the main `@sakaniui/react` entry point so importing them is a deliberate choice.
- Added Funnel and Heatmap charts.
- The library now auto-builds (`prepare` script) on install.

## 0.1.0

- First published release of `@sakaniui/react`.
