/**
 * Generates dist/manifest.json: the machine-readable contract of the library,
 * for AI agents, editors and tooling (served at https://www.sakaniui.com/manifest.json).
 *
 *   node scripts/manifest/generate.mjs      (runs after the library build)
 *
 * Everything is derived from the source, so it cannot drift from the code:
 *   - props, types, enum values, defaults and required-ness come from the
 *     TypeScript types (react-docgen-typescript, the same engine Storybook uses);
 *   - the summary is the header comment of each component's source file;
 *   - the category is the component's Storybook title;
 *   - only names actually exported from dist/index.mjs and dist/blocks.mjs are listed,
 *     so the contract describes the public API and not internals;
 *   - tokens are read from src/styles/tokens.css.
 *
 * Props declared by React itself (className, onClick, aria-*, ...) are not repeated for
 * every component: `acceptsNativeProps` says whether the component forwards them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withCustomConfig } from 'react-docgen-typescript';

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
const files = [...walk(path.join(root, 'src/components')), ...walk(path.join(root, 'src/blocks'))]
  .filter((f) => f.endsWith('.tsx') && !/\.(stories|test)\.tsx$/.test(f));

const parser = withCustomConfig(path.join(root, 'tsconfig.app.json'), {
  savePropValueAsString: true,
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
  // keep props declared in this repo; drop the hundreds React's own types add to every element
  propFilter: (p) => !p.parent || !/node_modules/.test(p.parent.fileName),
});
const docs = parser.parse(files);

/* ---- helpers ---- */
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

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
  // keep it to the first sentence or two: the Figma-mapping notes that follow are for maintainers
  const sentences = first.match(/[^.!?]+[.!?]+(?=\s|$)/g);
  if (sentences) { first = ''; for (const t of sentences) { if ((first + t).length > 220 && first) break; first += t; } first = first.trim(); }
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

// props whose only job is to give an otherwise unnamed control (or image) its accessible name
const accessibleNameProp = (n) => /^aria-(label|labelledby)$/.test(n) || /^(alt|[a-z]*Alt)$/.test(n);

const seen = new Set();
const components = [];
for (const d of docs) {
  const name = d.displayName;
  if (!name || !/^[A-Z]/.test(name)) continue;
  const isBlock = rel(d.filePath).startsWith('src/blocks/');
  const exportedFrom = isBlock ? (blockExports.has(name) ? '@sakaniui/react/blocks' : null) : (mainExports.has(name) ? '@sakaniui/react' : null);
  if (!exportedFrom || seen.has(name)) continue;
  seen.add(name);
  const props = Object.entries(d.props)
    .filter(([k]) => k !== 'ref' && k !== 'key')
    .map(([k, v]) => {
      const values = v.type.name === 'enum' && Array.isArray(v.type.value) ? v.type.value.map((x) => String(x.value).replace(/^"|"$/g, '')) : undefined;
      const out = { name: k, type: values ? values.map((x) => JSON.stringify(x)).join(' | ') : clean(v.type.name === 'enum' ? v.type.raw || 'enum' : v.type.name), required: !!v.required };
      if (values) out.values = values;
      if (v.defaultValue && v.defaultValue.value !== undefined) out.default = String(v.defaultValue.value).replace(/^'|'$/g, '');
      const desc = clean(v.description);
      if (desc) out.description = desc;
      return out;
    });
  const category = storyCategory(d.filePath);
  components.push({
    name,
    kind: isBlock ? 'block' : 'component',
    category: category ? category.split('/').slice(0, -1).join('/') || category : null,
    import: exportedFrom,
    source: rel(d.filePath),
    summary: headerSummary(d.filePath),
    props,
    contract: {
      requiredProps: props.filter((p) => p.required).map((p) => p.name),
      requiresAccessibleName: props.some((p) => p.required && accessibleNameProp(p.name)),
    },
  });
}
components.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'component' ? -1 : 1));

/* ---- tokens (the first :root block is the light default) ---- */
const css = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
const tokens = {};
for (const m of rootBlock.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
  const group = m[1].split('-')[0];
  (tokens[group] ||= {})[`--${m[1]}`] = clean(m[2]);
}
const tokenCount = Object.values(tokens).reduce((a, g) => a + Object.keys(g).length, 0);

/* ---- icons ---- */
const count = (d) => fs.readdirSync(path.join(root, 'src/icons', d)).filter((f) => f.endsWith('.ts')).length;

const manifest = {
  $schema: 'https://www.sakaniui.com/manifest.schema.json',
  schemaVersion: 1,
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
    acceptsNativeProps: 'Components forward native HTML attributes (className, style, aria-*, event handlers) to their root element unless a prop says otherwise; only the props that are specific to SakaniUI are listed here.',
    accessibleName: 'When `contract.requiresAccessibleName` is true, a required prop (aria-label, aria-labelledby or an alt text) is the only thing that names the control or image. Do not omit it.',
    tokens: 'Use only the token names listed under `tokens`. Colour tokens follow the theme (the `.dark` class flips them); do not hard-code colours.',
    icons: 'Icon props take the component itself (IconSettings), not an element (<IconSettings />).',
  },
  tokens: { count: tokenCount, groups: tokens },
  counts: { components: components.filter((c) => c.kind === 'component').length, blocks: components.filter((c) => c.kind === 'block').length },
  components,
};

const out = path.join(root, 'dist/manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`manifest: ${manifest.counts.components} components, ${manifest.counts.blocks} blocks, ${tokenCount} tokens, ${kb} kB -> dist/manifest.json`);
