/**
 * Generates dist/manifest.json: the machine-readable contract of the library,
 * for AI agents, editors and tooling (served at https://www.sakaniui.com/manifest.json).
 *
 *   node scripts/manifest/generate.mjs      (runs after the library build)
 *
 * Everything is derived from the source, so it cannot drift from the code:
 *   - props, types, literal values, defaults and required-ness come from the TypeScript
 *     types (react-docgen-typescript, the same engine Storybook uses);
 *   - only names actually exported from dist/index.mjs and dist/blocks.mjs are listed, and the
 *     build FAILS if a public component is exported but missing here, so "not in the manifest"
 *     reliably means "does not exist";
 *   - every design token is read from src/styles/tokens.css (all themes and surfaces);
 *   - `since` is the first release that contained the component (from git history, cached in
 *     scripts/manifest/since.json for builds that have no history), so an agent can tell what
 *     the installed version does not have yet.
 *
 * What it deliberately leaves out: source paths (they are not in the installed package),
 * design-tool (Figma) notes, sample e-mail addresses, and defaults that are code expressions.
 * Props declared by React itself (className, onClick, aria-*, ...) are not repeated for every
 * component: `conventions.acceptsNativeProps` covers them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withCustomConfig } from 'react-docgen-typescript';
import { buildExamples } from './examples.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/* ---- what the built package really exports ---- */
function exportedNames(file) {
  const src = fs.readFileSync(path.join(root, 'dist', file), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name && name !== 'default') names.add(name);
    }
  }
  return names;
}
const mainExports = exportedNames('index.mjs');
const blockExports = exportedNames('blocks.mjs');

/* ---- source files ---- */
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = [...walk(path.join(root, 'src/components')), ...walk(path.join(root, 'src/blocks')), ...walk(path.join(root, 'src/lib'))]
  .filter((f) => f.endsWith('.tsx') && !/\.(stories|test)\.tsx$/.test(f));

const parser = withCustomConfig(path.join(root, 'tsconfig.app.json'), {
  savePropValueAsString: true,
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
  // keep props declared in this repo; drop the hundreds React's own types add to every element
  propFilter: (p) => !p.parent || !/node_modules/.test(p.parent.fileName),
});
const docs = parser.parse(files);

/* ---- text helpers ---- */
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
// "1. First step", "e.g." and "i.e." are not the end of a sentence
const protectDots = (s) => s.replace(/(\b\d)\.(\s)/g, '$1\u2024$2').replace(/\b(e\.g|i\.e|vs|etc)\./gi, (m) => m.replace(/\./g, '\u2024'));
const restoreDots = (s) => s.replace(/\u2024/g, '.');

/**
 * The notes in the source mention the design tool a component was drawn in ("Maps to Figma BD
 * axis"). That is maintainer context, not part of the public contract, so any sentence that
 * names the design tool is dropped.
 */
function publicText(text) {
  const out = protectDots(clean(text)).split(/(?<=[.!?])\s+(?=[A-Z`"'(])/).filter((sentence) => !/figma|\bnode \d+[:-]\d+|\(node |\badded \d{4}-\d{2}-\d{2}/i.test(sentence));
  return restoreDots(clean(out.join(' '))).replace(/\s+([.,;:])/g, '$1');
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]+/g;

function headerSummary(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = /^\s*(?:\/\/[^\n]*\n)*\s*\/\*\*([\s\S]*?)\*\//.exec(src);
  if (!m) return '';
  const lines = m[1].split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trimEnd());
  const paras = [];
  let cur = [];
  for (const l of lines) { if (!l.trim()) { if (cur.length) { paras.push(cur.join(' ')); cur = []; } } else cur.push(l.trim()); }
  if (cur.length) paras.push(cur.join(' '));
  // the first paragraph is usually just a title ("Button" or "Name — Blocks / Group / Name"); the sentence after it is the summary
  const isTitle = (p) => p.length < 90 && !/[.!?:]$/.test(p) && /^[A-Z][A-Za-z0-9]*(\s*\/\s*[A-Z][A-Za-z0-9]*)*(\s+(—|--|-)\s+.*)?$/.test(p);
  const body = paras.filter((p) => !isTitle(p));
  let first = clean(body[0] || paras[0] || '');
  if (isTitle(first)) first = '';
  first = publicText(first);
  // keep it to the first sentence or two: the notes that follow are for maintainers
  const sentences = protectDots(first).match(/[^.!?]+[.!?]+(?=\s|$)/g);
  if (sentences) { first = ''; for (const t of sentences) { if ((first + t).length > 220 && first) break; first += t; } first = restoreDots(first).trim(); }
  return first.length > 260 ? first.slice(0, 257).trimEnd() + '...' : first;
}

function storyCategory(file) {
  const dir = path.dirname(file);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.stories.tsx')) continue;
    const m = /title:\s*['"`]([^'"`]+)['"`]/.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (m) return m[1];
  }
  return null;
}

/** Blocks are composition examples; their file headers are boilerplate, so the summary is derived from the name and group. */
function blockSummary(name, category) {
  const words = name.replace(/Block$/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  const group = category && category.includes('/') ? category.split('/')[1] : null;
  return `${words} block${group ? ` (${group})` : ''}: a composition example. Copy it into your project and edit it.`;
}

// props whose only job is to give an otherwise unnamed control (or image) its accessible name
const accessibleNameProp = (n) => /^aria-(label|labelledby)$/.test(n) || /^(alt|[a-z]*Alt)$/.test(n);

// Hand-written, checked against the code. For files whose header is only maintainer notes, or is shared by several components.
const SUMMARY_OVERRIDE = {
  ChatComposer: 'Message input for a chat thread: attach, text input, emoji and send, with default, typing, uploading and disabled states.',
  PriceDisplay: 'A product price. Pass `compareAtPrice` for a struck-through original price with the current price in the danger colour; `showBadge` adds the sale badge.',
  LiquidGlass: 'Apple-style liquid glass material (the Liquid surface mode): bends the backdrop at the edge with refraction, dispersion, rim light and depth. Use it inside a LiquidBackdrop when the image behind the UI is known.',
  LiquidBackdrop: 'The image behind the glass, shared by every LiquidGlass inside it. Pass `src`.',
  BlogBlockquote: 'A blog pull quote: a vertical rail beside the quote text. Passing `author` switches to the attributed card style.',
  BlogFeatureText: 'A pulled-out line of blog body copy beside a brand-coloured accent rule; `align` is "left" (vertical rule) or "top".',
  BlogListingCard: 'A blog post card with image, category, read time, title, excerpt and author. `layout` is "default" (image on top) or "horizontal" (square image on the left).',
  CartItem: 'A cart row: thumbnail, name and variant, quantity stepper, price and a remove button. Passing `compareAtPrice` shows the sale treatment.',
  Checkbox: 'Checkbox with optional label and description; supports checked, indeterminate and disabled states.',
  CheckoutSteps: 'A horizontal checkout breadcrumb of numbered steps (Cart, Shipping, Payment, Confirmation by default). `currentStep` marks earlier steps completed and later ones upcoming.',
  ColorSwatch: 'A round colour choice for product variants. `selected` marks the chosen one; `available={false}` marks it out of stock.',
  FeaturedIcon: 'A rounded icon chip to headline a feature or benefit, in sm, md or lg and subtle, solid, outline or light styles.',
  JobListing: 'A job opening with title, description, department, employment type and location, plus an apply button. `layout` is "row" or "card".',
  List: 'A list of text items with a leading marker; `style` is "check", "bullet" or "arrow".',
  LocationDot: 'A status dot and location label; `status` "active" is green (a real office), "remote" is gray.',
  Marquee: 'An infinitely scrolling horizontal row of items (logos or text) with adjustable `speed` and `gap`.',
  NotificationItem: 'A notification row with icon, title and timestamp; `read` toggles the unread style, with optional description, dismiss and action buttons.',
  PlaceholderLogo: 'A square slot for a company or brand mark in sm, md or lg; pass `logo` to replace the default mark.',
  ProductCard: 'An e-commerce product card: image with wishlist button and sale badge, rating, name, price, description, colour swatches and an add button. `compareAtPrice` shows the sale treatment.',
  ProductGallery: 'A main product image with selectable thumbnails; `thumbsPosition` is "bottom" or "left". Controlled or uncontrolled via `activeIndex` / `defaultActiveIndex`.',
  QuantitySelector: 'A decrement / value / increment stepper for quantity, bounded by `min` and `max`.',
  RichTextHeading: 'A heading for rich-text content; `level` is "h2" or "h3" and sets the real HTML tag.',
  RichTextParagraph: 'A muted body paragraph for rich-text content; it can contain inline links.',
  SidebarHeader: 'The top of a sidebar: brand, workspace switcher or brand with a collapse toggle; supports a collapsed state.',
  StarRating: 'Five stars with an optional numeric rating and review count (e.g. "4.9 (2,300 reviews)"); `showLabel` hides the text and `orientation` sets the layout.',
  SubFeature: 'A feature item with icon, title and description; `layout` is "vertical" or "horizontal" and `leftBorder` adds a rail.',
  Tags: 'A wrapped row of pill tags. Passing `onRemove` makes every tag removable.',
  Transactions: 'A list of transactions; shows an empty state when `transactions` is empty.',
  WishlistButton: 'A square heart toggle for saving a product; `saved` fills the heart.',
  ActivityFeedHighlight: 'Emphasised inline text (a name, a file, a page) inside an ActivityFeed item description.',
  AccordionItem: 'One collapsible item of an Accordion; `open` / `defaultOpen` control it.',
  StepperStep: 'One step of a Stepper; `state` is "completed", "current" or "upcoming".',
  BlogImage: 'A blog article image with an optional caption (shown when `caption` is set); `size` is "large" or "small".',
  BlogListingFeaturedCard: 'A featured blog post card with image, optional badge, title, excerpt, author and a call to action; `orientation` is "vertical" or "horizontal".',
  Breadcrumb: 'A navigation trail of one to six crumbs; `variant` is "text" (inline links) or "button".',
  FirstPageHeading: 'The heading that opens a page: title and description with optional badge, call-to-action buttons and avatars; `align` is "left" or "center".',
  FunnelChart: 'A funnel chart whose stages run left to right and narrow through curved transitions, in sizes sm to xl.',
  GithubIcon: 'GitHub brand mark drawn in currentColor, for social links.',
  XIcon: 'X (Twitter) brand mark drawn in currentColor, for social links.',
  HeatmapChart: 'A heatmap: a grid of coloured cells with optional row and column labels, in sizes sm to xl.',
  Metric: 'A value with a label; passing `trend` adds a trend chip.',
  MobileNavigationMenu: 'A mobile navigation menu: a toggle that opens a list of links and an optional call-to-action. Controlled with `open` or uncontrolled with `defaultOpen`.',
  ProfileCard: 'A person card with avatar, name and role, plus an optional bio and social links (the detailed layout follows the data you pass).',
  SectionHeading: 'A section heading with an optional eyebrow badge and subtitle; `align` is "left" or "center" and `titleAs` sets the heading tag.',
  SidebarSearch: 'A sidebar search; `type` is "field" or "command" (shows a keyboard-shortcut hint), and it supports a collapsed state.',
  SidebarSubItem: 'A nested navigation item under a SidebarItem, with active and disabled states.',
  SizeSelector: 'A round size option with `selected` and `available` states.',
  StockMarket: 'A stock row or card: logo, symbol, name, price and change, with an optional chart and period label.',
  StockStatus: 'A stock availability badge (success, warning or danger) derived from `quantity` and `lowStockThreshold`.',
  TeamCard: 'A team member card with photo, name, role, location and social links; passing `bio` switches to the detailed style.',
  Ticker: 'A scrolling row of symbol and change pairs with faded edges; pauses on hover and stops under prefers-reduced-motion.',
  TopBar: 'The application top bar, placed beside the Sidebar; `type` is "search", "minimal", "breadcrumb", "tabs" or "chat", and `density` is "sm" or "md".',
  MenuDivider: 'A divider that separates groups of items inside a Menu.',
  AreaChart: 'An area chart (Recharts) styled with Sakani chart tokens; `variant` is "default", "stacked", "step" or "linear".',
  BarChart: 'A bar chart (Recharts) styled with Sakani chart tokens; `variant` is "default", "horizontal", "stacked", "active", "multiple" or "negative".',
  DonutChart: 'A donut chart (Recharts) styled with Sakani chart tokens, with an optional centre value and caption.',
  LiquidDashboardBlock: 'A composition example: a full dashboard over a photograph, with the photo as a LiquidBackdrop so every liquid-glass lens refracts it.',
  SegmentedControl: 'An iOS-style toggle group (segmented control).',
  InstagramIcon: 'Instagram glyph drawn in currentColor, for the `socialLinks` of TeamCard.',
  FacebookIcon: 'Facebook glyph drawn in currentColor, for the `socialLinks` of TeamCard.',
  LinkedinIcon: 'LinkedIn glyph drawn in currentColor, for the `socialLinks` of TeamCard.',
};

/* ---- types: keep numbers and booleans as numbers and booleans ---- */
function literalOf(raw) {
  const v = String(raw).trim();
  if (/^"(?:[^"\\]|\\.)*"$/.test(v) || /^'(?:[^'\\]|\\.)*'$/.test(v)) return { ok: true, value: v.slice(1, -1) };
  if (/^-?\d+(\.\d+)?$/.test(v)) return { ok: true, value: Number(v) };
  if (v === 'true' || v === 'false') return { ok: true, value: v === 'true' };
  return { ok: false };
}

function typeOf(v) {
  if (v.type.name === 'enum' && Array.isArray(v.type.value)) {
    const lits = v.type.value.map((x) => literalOf(x.value));
    if (lits.length && lits.every((l) => l.ok)) {
      const values = lits.map((l) => l.value);
      return { type: values.map((x) => JSON.stringify(x)).join(' | '), values };
    }
    return { type: clean(v.type.raw || v.type.value.map((x) => x.value).join(' | ')) };
  }
  return { type: clean(v.type.name) };
}

function defaultOf(v) {
  if (!v.defaultValue || v.defaultValue.value === undefined) return undefined;
  const raw = String(v.defaultValue.value).trim();
  // code (arrow functions, createIcon(...), multi-line) is implementation, not a contract
  if (/=>|createIcon\(|\n|function\s*\(/.test(raw) || raw.length > 60) return undefined;
  const lit = literalOf(raw);
  const val = lit.ok ? lit.value : raw;
  return typeof val === 'string' ? val.replace(EMAIL, '<email>') : val;
}

/* ---- release history ---- */
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const sinceCachePath = path.join(root, 'scripts/manifest/since.json');
let sinceCache = {};
try { sinceCache = JSON.parse(fs.readFileSync(sinceCachePath, 'utf8')); } catch { /* none yet */ }

function computeSince(sourceFiles) {
  let releases;
  try {
    // the commit that introduced each version number in package.json, oldest first
    const hashes = git('log', '--reverse', '--format=%H', '-G"version"', '--', 'package.json').split('\n').filter(Boolean);
    const seenVersions = new Set();
    releases = [];
    for (const h of hashes) {
      let v;
      try { v = JSON.parse(git('show', `${h}:package.json`)).version; } catch { continue; }
      if (v && !seenVersions.has(v)) { seenVersions.add(v); releases.push({ v, h }); }
    }
    if (!releases.length) return null;
  } catch { return null; }
  const result = {};
  for (const f of sourceFiles) {
    try {
      const adds = git('log', '--follow', '--diff-filter=A', '--format=%H', '--', f).split('\n').filter(Boolean);
      const add = adds[adds.length - 1];
      if (!add) continue;
      const first = releases.find((r) => { try { git('merge-base', '--is-ancestor', add, r.h); return true; } catch { return false; } });
      result[f] = first ? first.v : pkg.version; // not in any earlier release: it ships with this one
    } catch { /* leave unset */ }
  }
  return result;
}

const parsed = docs.filter((d) => d.displayName && /^[A-Z]/.test(d.displayName));
const sourceFiles = [...new Set(parsed.map((d) => rel(d.filePath)))];
const fresh = computeSince(sourceFiles);
if (fresh) {
  sinceCache = { ...sinceCache, ...fresh };
  fs.writeFileSync(sinceCachePath, JSON.stringify(Object.fromEntries(Object.entries(sinceCache).sort()), null, 2) + '\n');
}

/* ---- components and blocks ---- */
const seen = new Set();
const components = [];
for (const d of parsed) {
  const name = d.displayName;
  const source = rel(d.filePath);
  const isBlock = source.startsWith('src/blocks/');
  const exportedFrom = isBlock ? (blockExports.has(name) ? '@sakaniui/react/blocks' : null) : (mainExports.has(name) ? '@sakaniui/react' : null);
  if (!exportedFrom || seen.has(name)) continue;
  seen.add(name);
  const props = Object.entries(d.props)
    .filter(([k]) => k !== 'ref' && k !== 'key')
    .map(([k, v]) => {
      const { type, values } = typeOf(v);
      const out = { name: k, type, required: !!v.required };
      if (values) out.values = values;
      const def = defaultOf(v);
      if (def !== undefined) out.default = def;
      const desc = publicText(v.description);
      if (desc && !/^Defaults? to [^.]*\.$/i.test(desc)) out.description = desc;
      return out;
    });
  const title = storyCategory(d.filePath);
  let category = title ? title.split('/').slice(0, -1).join('/') || title : source.startsWith('src/lib/') ? 'Utilities' : null;
  if (isBlock && !(category || '').startsWith('Blocks/')) category = 'Blocks'; // a story title that is not a group name
  const entry = {
    name,
    kind: isBlock ? 'block' : 'component',
    category,
    import: exportedFrom,
    summary: SUMMARY_OVERRIDE[name] || (isBlock ? blockSummary(name, category) : headerSummary(d.filePath)),
    props,
    contract: {
      requiredProps: props.filter((p) => p.required).map((p) => p.name),
      requiresAccessibleName: props.some((p) => p.required && accessibleNameProp(p.name)),
    },
  };
  if (sinceCache[source]) entry.since = sinceCache[source];
  components.push(entry);
}
components.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'component' ? -1 : 1));

/* ---- ready-to-paste examples, type-checked against the built package ---- */
const { examples, failed: noExample } = buildExamples(root, components);
for (const c of components) if (examples.has(c.name)) c.example = examples.get(c.name);
if (noExample.length) console.warn(`manifest: no example for ${noExample.join(', ')} (it did not type-check)`);

/* ---- summary quality gate: a wrong or garbled summary is worse than none ---- */
const looksBroken = (t) => !t || t.length < 10 || !/^[A-Z`<]/.test(t) || !/[.)`">!?]$/.test(t) || (t.match(/\(/g) || []).length !== (t.match(/\)/g) || []).length || /:$/.test(t);
const needsSummary = components.filter((c) => looksBroken(c.summary));
if (needsSummary.length) {
  console.error(`manifest: ${needsSummary.length} summaries are missing or look broken. Add a hand-written one to SUMMARY_OVERRIDE in scripts/manifest/generate.mjs:`);
  for (const c of needsSummary) console.error(`  ${c.name}: ${JSON.stringify(c.summary)}`);
  process.exit(1);
}

/* ---- hooks, helpers and constants (names only; their signatures are in the type definitions) ---- */
const listed = new Set(components.map((c) => c.name));
const utilities = [...mainExports]
  .filter((n) => !listed.has(n) && !/^[A-Z][a-z]/.test(n)) // PascalCase names are components and must be described above
  .map((n) => ({ name: n, kind: /^use[A-Z]/.test(n) ? 'hook' : /^[A-Z][A-Z0-9_]+$/.test(n) ? 'constant' : 'helper', import: '@sakaniui/react' }))
  .sort((a, b) => a.name.localeCompare(b.name));

/* ---- completeness: a public component that is exported but not described is a bug here ---- */
const known = new Set([...listed, ...utilities.map((u) => u.name)]);
const undocumented = [...mainExports, ...blockExports].filter((n) => !known.has(n));
if (undocumented.length) {
  console.error(`manifest: exported but not described: ${[...new Set(undocumented)].join(', ')}`);
  console.error("Add its file to the generator's source list, or make it a hook/helper/constant.");
  process.exit(1);
}

/* ---- tokens: every custom property the stylesheet defines, in any theme or surface ---- */
const css = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = {};
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
  const group = m[1].split('-')[2];
  const bucket = (tokens[group] ||= {});
  if (!(m[1] in bucket)) bucket[m[1]] = clean(m[2]); // first definition (the light default) wins
}
const tokenCount = Object.values(tokens).reduce((a, g) => a + Object.keys(g).length, 0);

/* ---- icons: every exported icon name, with Tabler's category and search tags ---- */
const count = (d) => fs.readdirSync(path.join(root, 'src/icons', d)).filter((f) => f.endsWith('.ts')).length;
function iconExports(dir) {
  const out = new Map();
  for (const f of fs.readdirSync(path.join(root, 'src/icons', dir))) {
    if (!f.endsWith('.ts')) continue;
    const m = /export const (Icon[A-Za-z0-9]+)\b/.exec(fs.readFileSync(path.join(root, 'src/icons', dir, f), 'utf8'));
    if (m) out.set(f.replace(/\.ts$/, ''), m[1]);
  }
  return out;
}
const outline = iconExports('outline');
const filled = iconExports('filled');
let tabler = {};
try { tabler = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@tabler/icons/icons.json'), 'utf8')); } catch { /* names only */ }
const iconIndex = {
  name: pkg.name,
  version: pkg.version,
  import: '@sakaniui/react/icons',
  note: 'Pass an icon to a component prop as the component itself: icon={IconTrash}, not icon={<IconTrash />}. Filled variants end in "Filled".',
  icons: [...outline.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([slug, name]) => {
    const meta = tabler[slug] || {};
    const entry = { name };
    if (filled.has(slug)) entry.filled = filled.get(slug);
    if (meta.category) entry.category = meta.category;
    const tags = (meta.tags || []).map(String).filter((t) => t && t !== slug).slice(0, 12);
    if (tags.length) entry.tags = tags;
    return entry;
  }),
};
for (const [slug, name] of filled) if (!outline.has(slug)) iconIndex.icons.push({ name, category: (tabler[slug] || {}).category });
fs.writeFileSync(path.join(root, 'dist/icon-index.json'), JSON.stringify(iconIndex) + '\n');

const manifest = {
  $schema: 'https://www.sakaniui.com/manifest.schema.json',
  schemaVersion: 3,
  name: pkg.name,
  version: pkg.version,
  description: 'Machine-readable contract of the SakaniUI React library, generated from its TypeScript source.',
  docs: 'https://www.sakaniui.com',
  guide: 'https://www.sakaniui.com/llms-full.txt',
  setup: {
    install: `npm install ${pkg.name}`,
    imports: ["import '@sakaniui/react/tokens.css';", "import '@sakaniui/react/style.css';"],
    peerDependencies: pkg.peerDependencies,
    note: 'Import the tokens and the stylesheet once, at the app entry. Chart components also need recharts.',
  },
  entryPoints: {
    '@sakaniui/react': 'Components, hooks and helpers.',
    '@sakaniui/react/blocks': 'Full sections assembled from components (composition examples).',
    '@sakaniui/react/icons': `Tabler icons: IconName and IconNameFilled, one module each (${count('outline')} outline, ${count('filled')} filled).`,
  },
  conventions: {
    version: `This manifest describes ${pkg.name}@${pkg.version}. Each component has \`since\`, the first release that contained it: if the project has an older version installed, a component or prop that is newer than that does not exist there.`,
    acceptsNativeProps: 'Components forward native HTML attributes (className, style, aria-*, event handlers) to their root element unless a prop says otherwise; only the props that are specific to SakaniUI are listed here.',
    accessibleName: 'When `contract.requiresAccessibleName` is true, a required prop (aria-label, aria-labelledby or an alt text) is the only thing that names the control or image. Do not omit it.',
    tokens: 'Use only the token names listed under `tokens`. Colour tokens follow the theme (the `.dark` class flips them); do not hard-code colours.',
    icons: 'Icon props take the component itself (IconSettings), not an element (<IconSettings />). Only names in icon-index.json exist; search them (MCP: search_icons) instead of guessing.',
    examples: 'Each component has `example`: its imports and the element with every required prop filled in, type-checked against this build. Start from it.',
    literals: 'Prop `values` keep their real type: a number is a number (columns: 2), a string is a string ("md").',
  },
  tokens: { count: tokenCount, groups: tokens },
  counts: { components: components.filter((c) => c.kind === 'component').length, blocks: components.filter((c) => c.kind === 'block').length, utilities: utilities.length },
  components,
  utilities,
};

const out = path.join(root, 'dist/manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
const kb = (fs.statSync(out).size / 1024).toFixed(0);
const noSince = components.filter((c) => !c.since).length;
console.log(`manifest: ${manifest.counts.components} components, ${manifest.counts.blocks} blocks, ${utilities.length} utilities, ${tokenCount} tokens, ${kb} kB -> dist/manifest.json${noSince ? ` (${noSince} without a 'since')` : ''}`);
