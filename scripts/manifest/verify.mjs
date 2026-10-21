/**
 * Checks dist/manifest.json against the real build, so a wrong contract cannot be published.
 * Runs at the end of `npm run build:lib` (and therefore before `npm publish`).
 *
 *   accuracy   every entry is a real runtime export from the import path it names; every prop is
 *              declared in the shipped type definitions; every literal value appears in them;
 *              every design token is defined in tokens.css and every token is listed
 *   versioning the manifest version is the package version; `since` is never newer than it
 *   safety     nothing that looks like a private reference ships: design-tool links or node ids,
 *              e-mail addresses, absolute local paths, tokens or keys
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { typecheckExamples, typecheckFiles } from './examples.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('dist/manifest.json'));
const problems = [];
const fail = (msg) => problems.push(msg);

/* ---- versioning ---- */
if (manifest.version !== pkg.version) fail(`manifest version ${manifest.version} is not the package version ${pkg.version}`);
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
for (const c of manifest.components) if (c.since && cmp(c.since, pkg.version) > 0) fail(`${c.name}.since ${c.since} is newer than the package ${pkg.version}`);
for (const c of manifest.components) {
  if (!c.since) fail(`${c.name} has no since`);
  for (const p of c.props) {
    if (p.since && (cmp(p.since, c.since) <= 0 || cmp(p.since, pkg.version) > 0)) fail(`${c.name}.${p.name}.since ${p.since} is outside ${c.since}..${pkg.version}`);
    for (const [val, v] of Object.entries(p.valuesSince || {})) {
      if (!(p.values || []).includes(val)) fail(`${c.name}.${p.name}.valuesSince names "${val}", which is not an allowed value`);
      if (cmp(v, pkg.version) > 0) fail(`${c.name}.${p.name}.valuesSince["${val}"] ${v} is newer than the package`);
    }
  }
}
// Anchors: facts from the release notes. If the history logic regresses, these break the build.
const ANCHORS = [
  ['component', 'XIcon', '0.8.6'], ['component', 'InstagramIcon', '0.8.6'], ['component', 'LiquidBackdrop', '0.4.3'],
  ['component', 'LiquidGlass', '0.4.0'], ['prop', 'Switch.variant', '0.8.4'],
];
for (const [kind, key, want] of ANCHORS) {
  const [name, prop] = key.split('.');
  const c = manifest.components.find((x) => x.name === name);
  const got = kind === 'prop' ? c?.props.find((p) => p.name === prop)?.since : c?.since;
  if (got !== want) fail(`release history anchor: ${key} should be since ${want}, manifest says ${got}`);
}
if (!/^## /m.test(read('CHANGELOG.md')) || !new RegExp(`^## ${pkg.version.replace(/\./g, '\\.')}\\b`, 'm').test(read('CHANGELOG.md'))) fail(`CHANGELOG.md has no entry for ${pkg.version}`);

/* ---- package.json bin paths in npm's normalized form (npm otherwise rewrites them at publish and prints a
   misleading "was invalid and removed" warning), pointing at files that exist ---- */
for (const file of ['package.json', 'mcp/package.json']) {
  const p = JSON.parse(read(file));
  for (const [name, target] of Object.entries(p.bin || {})) {
    if (target.startsWith('./') || target.startsWith('/') || target.includes('..')) fail(`${file}: bin["${name}"] should be written "${target.replace(/^\.\//, '')}"`);
    if (file === 'package.json' && !fs.existsSync(path.join(root, target))) fail(`${file}: bin["${name}"] points at ${target}, which does not exist`);
  }
  if (file === 'mcp/package.json' && p.bin?.['sakaniui-mcp'] !== 'bin/sakaniui-mcp.mjs') fail('mcp/package.json must expose bin "sakaniui-mcp" -> bin/sakaniui-mcp.mjs');
}

/* ---- accuracy: runtime exports ---- */
const main = await import(pathToFileURL(path.join(root, 'dist/index.mjs')).href);
const blocks = await import(pathToFileURL(path.join(root, 'dist/blocks.mjs')).href);
for (const c of manifest.components) {
  const mod = c.import === '@sakaniui/react/blocks' ? blocks : c.import === '@sakaniui/react' ? main : null;
  if (!mod) fail(`${c.name}: unknown import path ${c.import}`);
  else if (!(c.name in mod)) fail(`${c.name} is listed but is not exported from ${c.import}`);
}
for (const u of manifest.utilities) if (!(u.name in main)) fail(`utility ${u.name} is listed but not exported`);
const described = new Set([...manifest.components.map((c) => c.name), ...manifest.utilities.map((u) => u.name)]);
for (const n of [...Object.keys(main), ...Object.keys(blocks)]) if (!described.has(n)) fail(`${n} is exported but missing from the manifest`);

/* ---- type definitions are complete: every relative import in a shipped .d.ts must resolve ---- */
{
  const missing = new Map();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.d.ts')) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/(?:from|import\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const spec = m[1].replace(/\.(?:js|mjs|cjs)$/, '');
        const base = path.resolve(path.dirname(p), spec);
        if (/\.(css|svg|png|jpe?g|webp|avif)(\?.*)?$/.test(m[1])) continue; // assets are declared globally
        if (!fs.existsSync(base + '.d.ts') && !fs.existsSync(path.join(base, 'index.d.ts')) && !fs.existsSync(base)) missing.set(`${path.relative(root, p)} -> ${m[1]}`, true);
      }
    }
  })(path.join(root, 'dist'));
  for (const k of [...missing.keys()].slice(0, 15)) fail(`type definitions are incomplete: ${k} does not exist`);
  if (missing.size > 15) fail(`...and ${missing.size - 15} more unresolved imports in the type definitions`);
}

/* ---- accuracy: props and values against the shipped .d.ts ---- */
const dtsFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.d.ts')) dtsFiles.push(fs.readFileSync(p, 'utf8'));
  }
})(path.join(root, 'dist'));
let checkedProps = 0;
const unverifiable = [];
for (const c of manifest.components) {
  // every declaration file that declares this component (several share one file, e.g. Accordion/AccordionItem)
  const decl = new RegExp(`(?:declare|export)\\s+(?:declare\\s+)?(?:const|function|class)\\s+${c.name}\\b`);
  const text = dtsFiles.filter((t) => decl.test(t)).join('\n');
  if (!text) { unverifiable.push(c.name); continue; }
  for (const p of c.props) {
    checkedProps++;
    const esc = p.name.replace(/[-]/g, '\\-');
    if (!new RegExp(`['"]?${esc}['"]?\\??\\s*:`).test(text) && !new RegExp(`['"]${esc}['"]`).test(text)) fail(`${c.name}.${p.name} is not declared in the type definitions`);
  }
}
if (unverifiable.length > 10) fail(`could not find the type definitions of ${unverifiable.length} components (${unverifiable.slice(0, 5).join(', ')}, ...)`);

/* ---- examples: every shipped example must compile against this build ---- */
const withExample = manifest.components.filter((c) => c.example);
if (withExample.length < manifest.components.length) fail(`${manifest.components.length - withExample.length} components have no example`);
const brokenExamples = typecheckExamples(root, withExample.map((c) => ({ name: c.name, example: c.example })));
for (const n of brokenExamples) fail(`the example for ${n} does not type-check`);

/* ---- shapes and recipes ---- */
{
  let shapes = 0;
  for (const c of manifest.components) for (const p of c.props) if (p.shape) {
    shapes++;
    if (!p.shape.fields.length) fail(`${c.name}.${p.name} has an empty shape`);
    if (!['array', 'object'].includes(p.shape.collection)) fail(`${c.name}.${p.name} shape has an unknown collection`);
  }
  if (shapes < 40) fail(`only ${shapes} prop shapes were extracted (expected 60+): the extraction has silently broken`);
  const col = manifest.components.find((c) => c.name === 'Table')?.props.find((p) => p.name === 'columns')?.shape;
  if (!col || !col.fields.some((f) => f.name === 'key' && /keyof T/.test(f.type))) fail('Table.columns must expose key: keyof T & string');
  const recipes = manifest.components.flatMap((c) => (c.recipes || []).map((r, i) => ({ name: `${c.name}-${i}`, code: r.code })));
  if (!recipes.length) fail('the Table recipe is missing');
  for (const [name, err] of typecheckFiles(root, recipes)) fail(`recipe ${name} does not compile: ${err}`);
  // the rule the recipe states must be real: a key that is not on the row type must NOT compile
  const wrong = typecheckFiles(root, [{ name: 'table-key-not-on-row', code: `import { Table, type TableColumn } from '@sakaniui/react';
type Row = { id: number; name: string };
const columns: TableColumn<Row>[] = [{ key: 'name', header: 'Customer' }, { key: 'actions', header: '' }];
export const Example = () => <Table columns={columns} rows={[]} />;` }]);
  if (!wrong.has('table-key-not-on-row')) fail('a Table column key that is not on the row type compiled, so the Table recipe describes a rule that no longer holds');
}

/* ---- check_code: it must accept every shipped example and reject known-bad code ---- */
{
  const bad = [
    ['an element passed as an icon', "<IconButton icon={<TrashIcon />} aria-label=\"x\" />"],
    ['an invented import', "import { Buton } from '@sakaniui/react';"],
    ['a disallowed value', "import { Button } from '@sakaniui/react';\n<Button variant=\"danger\">x</Button>"],
    ['a missing required prop', "import { IconButton } from '@sakaniui/react';\n<IconButton />"],
  ];
  const calls = [...withExample.map((c) => c.example), ...bad.map(([, code]) => code)];
  const input = calls.map((code, i) => JSON.stringify({ jsonrpc: '2.0', id: i + 1, method: 'tools/call', params: { name: 'check_code', arguments: { code } } })).join('\n') + '\n';
  const run = spawnSync('node', [path.join(root, 'bin/sakaniui-mcp.mjs')], { input, cwd: root, encoding: 'utf8', timeout: 60000 });
  const answers = new Map(run.stdout.trim().split('\n').filter(Boolean).map((l) => { const m = JSON.parse(l); return [m.id, JSON.parse(m.result.content[0].text)]; }));
  withExample.forEach((c, i) => { const r = answers.get(i + 1); if (!r || !r.ok) fail(`check_code rejects the shipped example for ${c.name}: ${JSON.stringify(r && r.errors).slice(0, 160)}`); });
  bad.forEach(([what], i) => { const r = answers.get(withExample.length + i + 1); if (!r || r.ok) fail(`check_code accepted bad code (${what})`); });
}

/* ---- icons: the index is exactly the set of exported icons ---- */
const iconIndex = JSON.parse(read('dist/icon-index.json'));
const iconMod = await import(pathToFileURL(path.join(root, 'dist/icons.mjs')).href);
const exportedIcons = new Set(Object.keys(iconMod).filter((n) => /^Icon[A-Z0-9]/.test(n)));
const indexed = new Set(iconIndex.icons.flatMap((i) => [i.name, i.filled].filter(Boolean)));
for (const n of indexed) if (!exportedIcons.has(n)) fail(`icon ${n} is in icon-index.json but not exported`);
for (const n of exportedIcons) if (!indexed.has(n)) fail(`icon ${n} is exported but missing from icon-index.json`);
if (iconIndex.version !== pkg.version) fail(`icon-index.json version ${iconIndex.version} is not ${pkg.version}`);
// icon names the server and the examples rely on
const serverSrc = read('bin/sakaniui-mcp.mjs');
const common = serverSrc.slice(serverSrc.indexOf('const COMMON'), serverSrc.indexOf('function searchIcons'));
for (const n of new Set([...common.matchAll(/Icon[A-Z][A-Za-z0-9]*/g)].map((m) => m[0]))) if (!exportedIcons.has(n)) fail(`the server maps an intent to ${n}, which does not exist`);
for (const c of withExample) {
  const icons = /import \{([^}]*)\} from '@sakaniui\/react\/icons'/.exec(c.example);
  for (const n of icons ? icons[1].split(',').map((x) => x.trim()).filter(Boolean) : []) if (!exportedIcons.has(n)) fail(`the example for ${c.name} uses ${n}, which does not exist`);
}

/* ---- tokens ---- */
const css = read('dist/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
const listed = new Set(Object.values(manifest.tokens.groups).flatMap((g) => Object.keys(g)));
for (const t of listed) if (!defined.has(t)) fail(`token ${t} is listed but not defined in tokens.css`);
for (const t of defined) if (!listed.has(t)) fail(`token ${t} is defined in tokens.css but missing from the manifest`);

/* ---- safety: what must never ship to an agent ---- */
const shipped = { 'dist/manifest.json': read('dist/manifest.json'), 'AGENTS.md': read('AGENTS.md'), 'bin/sakaniui-mcp.mjs': read('bin/sakaniui-mcp.mjs') };
const FORBIDDEN = [
  [/figma\.com\/(?:design|file|proto|board)\//i, 'a design-file link'],
  [/\bnode[-_ ]?id=/i, 'a design node id'],
  [/\bnode \d+[:-]\d+\b/i, 'a design node id'],
  [/\/Users\/[A-Za-z0-9._-]+/, 'an absolute local path'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, 'an e-mail address'],
  [/\bnpm_[A-Za-z0-9]{20,}|\bghp_[A-Za-z0-9]{20,}|\bsk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}/, 'a token or key'],
];
for (const [file, content] of Object.entries(shipped)) {
  for (const [re, what] of FORBIDDEN) {
    const m = re.exec(content);
    // "@sakaniui/react" style package names are not e-mail addresses
    if (m && !(what === 'an e-mail address' && /^@|@sakaniui/.test(m[0]))) fail(`${file} contains ${what}: ${m[0].slice(0, 60)}`);
  }
}
if (/\bFigma\b/i.test(shipped['dist/manifest.json'])) fail('dist/manifest.json mentions the design tool; design-tool notes are not part of the public contract');

/* ---- the server must stay read-only ---- */
const server = shipped['bin/sakaniui-mcp.mjs'];
for (const re of [/\bwriteFile|appendFile|createWriteStream|unlink|rmSync|rmdir|mkdir|rename\(/, /child_process|(?<![.\w])spawn\(|(?<![.\w])exec\(|execSync|execFile/, /\bfetch\(|node:https?|node:net|node:dgram|XMLHttpRequest/, /\beval\(|new Function/]) {
  const m = re.exec(server);
  if (m) fail(`bin/sakaniui-mcp.mjs must be read-only but contains: ${m[0]}`);
}

if (problems.length) {
  console.error(`manifest verification FAILED (${problems.length}):`);
  for (const p of problems.slice(0, 40)) console.error('  - ' + p);
  process.exit(1);
}
console.log(`manifest verified: ${manifest.components.length} entries exist at runtime, ${checkedProps} props match the type definitions, ${withExample.length} examples type-check and pass check_code, ${indexed.size} icons match the exports, ${listed.size} tokens match tokens.css, no private references, server is read-only`);
