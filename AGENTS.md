# Sakani UI — guide for AI agents

You are building with `@sakaniui/react`. This file is the *why* behind the system: what each
piece is for, when it is the wrong choice, and what to do when nothing fits. Props and types are
in the shipped `.d.ts` files; live examples are at https://www.sakaniui.com/docs. Read this file
first, then open a component's docs page for its props.

Full machine-readable index: https://www.sakaniui.com/llms.txt (and `/llms-full.txt`).

**The contract:** `@sakaniui/react/manifest.json` (also https://www.sakaniui.com/manifest.json) lists
every exported component and block with its import path, props, types, enum values, defaults, which
props are *required*, and every design token. It is generated from the TypeScript source on each
build, so it is always in step with the installed version. Prefer it over guessing a prop name:
```ts
import manifest from '@sakaniui/react/manifest.json';
const button = manifest.components.find((c) => c.name === 'Button'); // props[], contract.requiredProps
```
Editors can query the same data through the bundled MCP server
(`npx -y @sakaniui/mcp`): `search_components`, `get_component`, `search_icons`, `search_emoji`,
`check_code`, `check_usage`, `get_tokens`, `get_guide`, `check_compatibility`, `get_changelog`.

**Object props have a shape.** A prop such as `columns`, `items`, `options`, `plans` or `data` takes an array
of objects with exactly the fields listed under the prop's `shape` (required ones must be present, and
`keyof T` means "a field of your own data type"). `check_code` verifies the field names of inline literals.
Components with a pattern the types do not teach carry `recipes`: code that compiles.

**Start from the example, check before you answer.** Every component has `example`: its imports and the
element with each required prop filled in, type-checked against the release. Start from it instead of
writing the element from memory. Never guess an icon name: find it with `search_icons` (icons are
`IconTrash`, `IconSettings`, ... from `@sakaniui/react/icons`, passed as `icon={IconTrash}`, not
`icon={<IconTrash />}`). If the server is connected, run `check_code` on every snippet you write.

**Versions.** Every component has `since`, the first release that contained it. The project may have an
older `@sakaniui/react` installed than the one the manifest describes: if an entry is marked
`availableInInstalled: false`, or `check_compatibility` lists it under `missingInInstalled`, it does not
exist in that project, so do not use it without upgrading. The server reads the project's installed
version itself; if it cannot, run `npm ls @sakaniui/react` and pass the result as `installedVersion`.
If a prop, value or token is not in the manifest, it does not exist. If `contract.requiresAccessibleName`
is true, the required `aria-label` / alt prop is the only thing that names the control. Do not drop it.

---

## 1. Setup you must get right

```tsx
import '@sakaniui/react/tokens.css'; // design tokens (CSS variables) — once, at the app root
import '@sakaniui/react/style.css';  // component styles — once
import { Button, Card } from '@sakaniui/react';
```

- **Both CSS imports are required.** Without `tokens.css` every component renders unstyled or
  black-and-white, because every colour, space, radius and shadow is a CSS variable defined there.
- **Dark mode is a class.** Put `className="dark"` on any container; everything inside re-themes.
  Do not write per-component dark styles.
- **Surface is a second axis, independent of light/dark:** `data-surface="solid" | "glass" | "liquid"`
  on a container. Components inside adapt. See §4.

## 2. Principles (apply these when a case is not covered)

1. **Tokens, never literals.** Colours, spacing, radius, shadows come from `var(--color-…)`,
   `var(--space-…)`, `var(--radius-…)`. A hex value in your code will not follow dark mode, glass
   surfaces or future theme changes. If you need a colour that has no token, pick the nearest
   semantic token and say so; do not invent a hex.
2. **Semantic roles over raw values.** Use `--color-fg-default / -muted / -subtle`, `--color-bg-surface /
   -canvas / -subtle`, `--color-border-subtle / -default / -focus`, `--color-accent-*`. The role says
   what the colour is *for*, which is what survives a re-theme.
3. **One primary action per view.** A single filled `primary` Button marks the thing the user most
   likely wants. Two filled buttons compete and make neither primary. Put the second action in
   `secondary` or `outline`, the third in `ghost`.
4. **Use the component, don't restyle a `<button>`.** Buttons carry hover, press, focus-visible,
   loading and (on glass) liquid behaviour. A hand-styled `<button>` silently misses every future
   improvement. (Two components shipped with raw buttons and were fixed in 0.4.6 and 0.4.7 for exactly
   this reason.)
5. **States are CSS, not props.** Hover, focus-visible and disabled are pseudo-classes. Don't try to
   force a hover state with a prop; none exists. Exceptions are documented presentational states
   (e.g. `BoardCard state="dragging"`).
6. **Accessibility is part of the API, not an extra.** Icon-only controls require a label
   (`aria-label`, or `label` on `socialLinks`). Status changes use live regions (`Alert`, `Toast`,
   `Spinner`, `EmptyState` are `role="status"`/`alert`). Never remove focus rings.
7. **Don't fake what the system doesn't do.** `Toast` is presentational — you own queueing and
   positioning (for a ready-made stack, use `Toaster` and `toast()`). `Menu` is a surface — you own anchoring (pair it with `Popover`). Dragging is a
   look, not a behaviour. Check "Behaviour you must supply" in the table below before assuming.
8. **Compose in slots, don't fork.** Components expose slots (`leading`, `trailing`, `meta`,
   `assignees`, `icon`, `actions`). Fill a slot with other system components rather than copying a
   component's markup.

## 2b. Token names — use exactly these (anything else does not exist)

A CSS variable that isn't defined silently resolves to nothing: no error, just broken spacing or
colour. Do not guess names (`--fg-muted`, `--bg-canvas`, `--spacing-4` and `--space-3` are all **wrong**).

- **Space** — `--space-N` where **N is the pixel value**: `0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64, 80, 96`. So `--space-6` is 6px (not 24px)
  and `--space-24` is 24px. There is no `--space-3` or `--space-5`.
- **Text** — `--color-fg-default`, `--color-fg-muted`, `--color-fg-subtle`, `--color-fg-on-accent`,
  `--color-fg-on-inverse`.
- **Backgrounds** — `--color-bg-canvas` (page), `--color-bg-surface` (cards, panels), `--color-bg-subtle`,
  `--color-bg-muted`, `--color-bg-inverse`.
- **Borders** — `--color-border-subtle`, `--color-border-default`, `--color-border-strong`,
  `--color-border-focus`.
- **Brand/status** — `--color-accent-{default,hover,active,subtle,fg}`; for `danger`, `success`,
  `warning`, `info`: `--color-<status>-{bg,border,fg,solid}` plus a 50–950 scale.
- **Radius** — `--radius-{none,2xs,xs,sm,md,lg,xl,2xl,3xl,full}` (`md` = 8px is the default control radius).
- **Shadow** — `--shadow-{xs,sm,md,lg,xl,2xl}`. **Font** — `--font-sans`, `--font-mono`.
  **Motion** — `--transition-{fast,base,hover,slow}`.
- Full, resolved list for light and dark: https://www.sakaniui.com/docs/tokens

## 3. When nothing fits

Work down this list and stop at the first that works:

1. **A variant or slot of an existing component** (most "missing" cases are one).
2. **Compose two or three existing components** inside a `Card` or a block layout.
3. **Compose from tokens** — your own element styled only with `var(--…)` values and system
   components inside. Match the 8px radius (`--radius-md`) and token spacing of neighbours.
4. **Say what is missing.** If the need is real and not covered, tell the user plainly
   ("the system has no X; I built Y from tokens") instead of silently approximating. Do not present a
   workaround as a system component.

Never: invent props that aren't in the `.d.ts`, import from `dist/` internals, or copy the
CSS of a component into your own file.

## 4. Glass and Liquid Glass

- **`solid`** (default): opaque, crisp. Use for dense data — tables, forms, charts. Reading speed
  beats atmosphere.
- **`glass`**: frosted translucency. Use for chrome floating over content: sidebars, bars, popovers.
- **`liquid`**: real refraction that bends what is behind it. Use sparingly, for a few large
  navigational or hero surfaces over a rich image or gradient. It needs something visually
  interesting behind it; over a flat colour it adds cost and nothing else.
- **Don't put data inside liquid.** Keep tables, inputs and charts on `data-surface="solid"` inside a
  liquid layout so numbers stay legible.
- **Refraction renders in Chromium only.** Safari and Firefox get a frosted fallback with the same rim.
  Design so the fallback is acceptable, not broken. Use `refraction="off"` to preview the fallback.
- **Cost is per lens.** Each liquid surface runs an SVG filter. Dozens on one screen will lag; a
  handful is fine. Large static lenses are baked to a canvas automatically (`bake`).
- **`LiquidBackdrop` supplies what is behind the lens.** A lens needs a backdrop to refract; wrap
  the photo/gradient in `LiquidBackdrop`.

## 4c. Icons

- The icon set is Tabler Icons. Import from `@sakaniui/react/icons`: `IconHome`, `IconCalendar` ... (outline,
  5,184) and `IconHomeFilled` ... (filled, 1,054). Names follow Tabler (tabler.io/icons is the search),
  kebab-case to `Icon` + PascalCase, `Filled` suffix for filled. Each is tree-shaken on its own.
- Outline for normal UI; Filled for active/selected states (a selected nav item, a liked heart). Don't
  mix the two in one row without a reason: filled means "on".
- Props follow lucide-react: `size` (default 24), `color` (default currentColor), `strokeWidth` (default
  1.5, the Figma icon stroke), `absoluteStrokeWidth`. Add `title` when the icon carries meaning alone.
- Component props that take an icon (`icon`, `leftIcon` ...) take the component itself, typed
  `IconComponent`; Sakani, Lucide and Tabler React icons all fit.

## 4d. Emoji

- Full-colour emoji (Fluent Emoji, Flat) live in `@sakaniui/react/emoji`, one component per emoji:
  `EmojiRocket`, `EmojiPartyPopper`, `EmojiWavingHand` (1,594 emoji; names are `Emoji` + PascalCase of the
  Unicode name, so find them with `search_emoji` instead of guessing). Each is tree-shaken on its own.
- They are pictures, not icons: render them as elements (`<EmojiRocket />`), never pass them to an `icon`
  prop, and do not expect `currentColor` (they keep their own colours). Use an icon for UI chrome and an
  emoji for expression: reactions, empty states, celebration, user-chosen labels.
- 311 people and hand emoji take `tone`: `<EmojiWavingHand tone="medium-dark" />` (`light`, `medium-light`,
  `medium`, `medium-dark`, `dark`). Emoji with tones weigh more (about 16 kB) because all six tones ship in
  the module; the others are about 2 kB.
- Props: `size` (default 24; `'1em'` follows the text), `tone`, `title`. Without `title` the emoji is
  decorative (`aria-hidden`); add `title` when it carries meaning alone. `emojiCatalog` lists every emoji
  with its label, Unicode character and category, for pickers and search.

## 5. Component guide — what it's for, why it behaves that way, when not to use it

Format: **Use for** · **Why it is built this way** · **Not for / instead**.

**Looking for a component by another name?** SakaniUI uses its own names. A *dialog* or *alert dialog* is
`Modal`; a *snackbar* is `Toast` (or `Toaster` + `toast()` for a managed stack); a *dropdown menu* is `Menu`; a *navbar* or *app bar* is `TopBar`; a
*date picker* is `Calendar`; a *loader* is `Spinner`; a *toggle* is `Switch`; a *banner* is `Announcement`;
*autocomplete* is `Combobox`. There is no `Dialog`, `AlertDialog`, `Snackbar` or `Navbar`. Each component
lists its other names under `aliases` in `manifest.json`, and `search_components` understands them.

### Actions
- **Button** — Use for any action that does something. *Why:* 5 variants × 3 sizes mirror Figma 1:1;
  `loading` disables interaction so double-submits can't happen. *Not for* navigation → `Link`; icon-only →
  `IconButton`. One `primary` per view.
- **IconButton** — Use for compact, recognisable actions (close, more, add). *Why:* square, same variant
  logic as Button, and `aria-label` is required because a glyph alone is unusable with a screen reader.
  *Not for* anything whose icon isn't universally obvious → `Button` with a label.
- **Link** — Use for navigation. *Why:* a link goes somewhere, a button does something; mixing them breaks
  keyboard and assistive-tech expectations.

### Status and feedback
- **Alert** — Use for a message that belongs to the page or a section and stays until resolved.
  *Not for* transient confirmation → `Toast`.
- **Toast** — Use for short-lived confirmation or error after an action. *Why:* presentational only;
  queueing and positioning are the app's job, so it fits any notification system. *Not for* anything the user
  must act on — a toast disappears.
- **Toaster + toast()** — Use for notifications you trigger from code: mount one `<Toaster />`, call
  `toast.success('Saved')` from anywhere. *Why:* it owns queueing, position (6), the 4s timer, the pile that
  spreads on hover and swipe-to-dismiss, so the app does not. `toast.promise` turns one toast from loading
  into success or error. *Not for* anything the user must act on — a toast disappears; a plain static card
  → `Toast`. Needs `Toaster` mounted once, and `toast()` is a function, not a component.
- **Badge** — Use for a short status, category or count. *Why:* 6 colours × subtle/solid, no sizes, no
  borders — it is a label, not a control. *Not for* clickable filters → `FilterChip`.
- **Tooltip** — Use for brief supplementary text on hover/focus. *Why:* pure CSS, so it works with
  keyboard focus. *Not for* essential information (touch users never see hover) or interactive content →
  `Popover`.
- **Spinner / Progress / Skeleton** — Spinner: an action is running, unknown length. Progress: known
  completion (give `value`) or an indeterminate page load (omit it). Skeleton: the *shape* of content that is
  about to appear. *Why:* a skeleton keeps layout stable and tells the user what is coming; a spinner only
  says "wait". Prefer Skeleton for first-load of lists/cards.
- **EmptyState** — Use when a list, table or panel has nothing to show. *Why three types:* `no-data`
  (nothing exists → action is to create), `no-results` (a filter hides things → relax the filter),
  `error` (request failed → retry). They are different situations needing different actions; one generic
  message wastes the moment. Override `title`/`description` with specifics wherever possible.

### Forms
- **Input / Textarea / Select / Combobox** — Input: free text. Select: choose one from a short fixed list
  (it is a custom listbox, not native `<select>`, so the open state matches the design). Combobox: search a
  long list or pick several (multi, with chips). *Why:* choosing the lightest control that fits keeps forms
  fast; don't use a Combobox for four options.
- **Checkbox / Radio / Switch** — Checkbox: independent yes/no, or multiple choices. Radio: exactly one of a
  few (give them a shared `name`). Switch: an immediate on/off that takes effect now; a checkbox is for
  things applied on submit.
- **SegmentedControl** — Use to switch between 2–6 views or modes of the *same* content. *Not for*
  navigation between pages → `Tabs`.
- **FileUpload / AvatarUpload** — Use for files / profile photos respectively.
- **Always give inputs a visible label** (`Input` has one built in). Placeholders are not labels.

### Navigation
- **Sidebar family** (`Sidebar`, `SidebarItem`, …) — Use for app-level navigation. Expanded 248px,
  collapsed 64px. Compose the parts; don't build a sidebar from scratch.
- **TopBar** — Use beside the sidebar for search, breadcrumb, tabs, or chat context. Slots (`left`,
  `actions`, `account`) are composed by the caller.
- **Tabs** — Switch between peer panels in one place. **Breadcrumb** — show where a deep page sits.
  **Pagination** — move through pages of a long list. **Stepper** — a fixed multi-step flow; completed /
  current / upcoming states; motion is choreographed on step change.
- **Menu** — a list of actions in a surface; *you* anchor it (pair with `Popover`). **Popover** — floating
  panel on click; closes on outside click or Escape.
- **Modal** — Use only when the task genuinely must interrupt (confirm destructive action, short focused
  form). Anything the user might want to refer back to the page for → `Popover` or inline.

### Content and data
- **Card** — a container surface for a unit of content, optionally with actions. Not a layout wrapper for
  everything.
- **Table** — dense, comparable records. `Table<T>` is generic: every column's `key` must be a field of
  your row type `T` (`keyof T & string`), so a column that is not data (a delete button, a menu) still
  needs a key: give the row type an optional `never` field (`actions?: never`) and render the control in
  `render`. Inventing a key that is not on the row type does not compile (see `recipes` in
  `get_component("Table")` for code that does). **StatCard** — one headline metric with trend. **ListItem** — a
  row in a list. **Charts** — pick by question: trend over time → Line/Area; compare categories → Bar;
  part of whole → Pie/Donut (few slices only); progress to a target → Radial; compare several measures →
  Radar; drop-off → Funnel; intensity across two dimensions → Heatmap.
- **Avatar / AvatarGroup** — Avatar type is inferred: `src` → image, `initials` → initials, else icon.
  Prefer a real image when you have one; initials are the fallback, not the default.
- **BoardCard / BoardColumn** — kanban pieces. `BoardColumn state="loading"` styles the column; *you* pass
  Skeleton-filled `BoardCard`s as children. `state="dragging"` only styles; implement drag yourself.
- **ProfileCard / TeamCard** — ProfileCard: compact (row) or detailed (centred, with bio/social). TeamCard:
  portrait-led with a location bar. Both want a real photo.

### Blocks
Blocks (`CRMDashboardBlock`, `DataTableBlock`, `KanbanBoardBlock`, `LoginBlock`, …) are composed
screens, not primitives. Use one when it matches the screen you are building; otherwise compose primitives.
Many Figma-frame blocks have a fixed design width — put them in a container at least that wide or scale them.

## 6. Moments an AI product needs (compose these today)

The system has no dedicated AI components yet. Until it does, build these moments from existing parts,
and **tell the user when you are composing** rather than implying a dedicated component exists.

- **The model isn't sure.** State uncertainty in words next to the claim, not hidden in colour. Use an
  `Alert` (`color="info"` or `"warning"`) or a `Badge` ("Low confidence"). Offer the next step: verify,
  rephrase, or ask for more context.
- **Showing a source.** Attach sources to the claim they support, as `Link`s or `Tags`/`Badge`s with a
  visible domain or title. A claim without a reachable source should look different from one with it.
- **A request that will not be completed.** Say what was declined and why in plain language, then what
  *can* be done. Use `Alert` (not an error toast — the user did nothing wrong) plus an alternative action
  as a `secondary` Button.
- **A response that is only half there.** Streaming or partial: show `Skeleton` or a `Spinner` for the
  missing remainder, keep what has arrived, and make interruption possible. Never present a truncated
  answer as complete; mark it ("Response cut off") and offer retry. Use `EmptyState type="error"` only
  when nothing usable arrived.
- **Chat.** `MessageBubble`, `ConversationItem`, `ChatComposer` cover the shell. Keep the composer
  reachable while a response is streaming.

## 7. Behaviour you must supply (the system will not do these)

| Component | You own |
|---|---|
| Toast | queueing, positioning, auto-dismiss timing (or use `Toaster`) |
| Toaster | mounting it once; it handles the rest |
| Menu | anchoring/positioning (pair with Popover) |
| BoardCard `dragging` | drag-and-drop logic and drop targets |
| BoardColumn `loading` | the skeleton cards inside it |
| Blocks | data fetching and state; they are presentational |
| LiquidGlass | a backdrop worth refracting (`LiquidBackdrop`) |

## 8. Checklist before you finish

- [ ] Both CSS files imported once; no hex/px literals where a token exists.
- [ ] Exactly one `primary` Button per view; no hand-styled `<button>`.
- [ ] Every icon-only control has an accessible name.
- [ ] Every prop, value and token you used exists in `manifest.json`; every `contract.requiredProps` entry is set.
- [ ] Looks right inside `className="dark"`.
- [ ] If you used glass/liquid: acceptable in the frosted fallback; data surfaces stay `solid`.
- [ ] You said so wherever you composed something the system doesn't provide.
