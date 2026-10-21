#!/usr/bin/env node
/**
 * SakaniUI MCP server -- lets an AI editor/agent look up the design system instead of guessing.
 *
 *   npx -y -p @sakaniui/react sakaniui-mcp [--project <dir>]
 *
 * Zero dependencies: speaks newline-delimited JSON-RPC (MCP stdio transport).
 *
 * Read-only by construction. It reads five fixed files (package.json, dist/manifest.json,
 * dist/icon-index.json, AGENTS.md, CHANGELOG.md) from a @sakaniui/react install and writes nothing,
 * runs nothing and opens no network connection. No tool takes a path; every argument is validated.
 * Code passed to check_code is only read as text, never executed.
 *
 * Version-aware. `npx` may fetch a newer release than the project uses, so the server looks for
 * the project's own installed @sakaniui/react (walking up from --project or the working
 * directory). If it has a manifest, answers come from that copy. If it is older than the
 * manifest era, answers come from this copy but every component is checked against its `since`
 * release and flagged when the project does not have it yet.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- reading an install (fixed file names only) ---------- */
const readText = (root, rel) => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; } };
const readJson = (root, rel) => { try { return JSON.parse(readText(root, rel)); } catch { return null; } };

function loadInstall(root) {
  const pkg = readJson(root, 'package.json');
  if (!pkg || pkg.name !== '@sakaniui/react') return null;
  return { root, version: pkg.version, manifest: readJson(root, 'dist/manifest.json'), icons: readJson(root, 'dist/icon-index.json'), guide: readText(root, 'AGENTS.md'), changelog: readText(root, 'CHANGELOG.md') };
}

function findProjectInstall() {
  const i = process.argv.indexOf('--project');
  let dir = path.resolve(i > -1 && process.argv[i + 1] ? process.argv[i + 1] : process.cwd());
  for (let depth = 0; depth < 12; depth++) {
    const candidate = path.join(dir, 'node_modules', '@sakaniui', 'react');
    if (fs.existsSync(path.join(candidate, 'package.json'))) return loadInstall(candidate);
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

const bundled = loadInstall(ownRoot);
if (!bundled || !bundled.manifest) {
  process.stderr.write('sakaniui-mcp: dist/manifest.json not found. Run `npm run build:lib` (or install a published version).\n');
  process.exit(1);
}
const project = findProjectInstall();

/**
 * Answer from the project's own copy when it can (it is what the code will run against) -- but only
 * if its manifest is at least as complete as this one. Older manifest schemas are known to omit
 * things that exist (components, tokens), and "not in the manifest" must mean "does not exist".
 * In that case the newer data is used and checked against the project's version instead.
 */
const schemaOf = (i) => (i && i.manifest && Number.isInteger(i.manifest.schemaVersion) ? i.manifest.schemaVersion : 0);
const active = project && project.manifest && schemaOf(project) >= schemaOf(bundled) ? project : bundled;
const manifest = active.manifest;
const guide = active.guide || bundled.guide || '';
const changelog = active.changelog || bundled.changelog || '';
const iconIndex = (active.icons && active.icons.icons) || (bundled.icons && bundled.icons.icons) || [];
const projectVersion = project ? project.version : null;

/* ---------- versions ---------- */
const SEMVER = /^\d+\.\d+\.\d+/;
const parse = (v) => String(v).split('-')[0].split('.').map(Number);
const cmp = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

const refVersion = manifest.version;
const answeringFromProject = active === project;

function versionNote(installed = projectVersion) {
  if (answeringFromProject) return null;
  if (!installed) {
    return `The project's installed @sakaniui/react version could not be detected, so this describes ${refVersion}. Confirm it (npm ls @sakaniui/react) and call check_compatibility with installedVersion before suggesting a component.`;
  }
  if (installed !== refVersion) {
    return `The project has @sakaniui/react ${installed} installed; this reference describes ${refVersion}. Entries marked availableInInstalled: false were added after ${installed}. Props can also differ between releases: check get_changelog.`;
  }
  return null;
}

/** Is this component in the project's install? null = cannot tell. */
function inInstalled(c, installed = projectVersion) {
  if (!installed || !c.since) return null;
  return cmp(c.since, installed) <= 0;
}

/* ---------- helpers ---------- */
const byName = new Map(manifest.components.map((c) => [c.name.toLowerCase(), c]));
const brief = (c) => {
  const out = { name: c.name, kind: c.kind, category: c.category, import: c.import, since: c.since, summary: c.summary, requiredProps: c.contract.requiredProps };
  if (inInstalled(c) === false) out.availableInInstalled = false;
  return out;
};
const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });
const fail = (msg) => ({ isError: true, content: [{ type: 'text', text: msg }] });

const MAX_STR = 200;
function strArg(args, key, { required = false } = {}) {
  const v = args[key];
  if (v === undefined || v === null) return required ? { err: `"${key}" is required.` } : { value: undefined };
  if (typeof v !== 'string') return { err: `"${key}" must be a string.` };
  if (v.length > MAX_STR) return { err: `"${key}" is too long (max ${MAX_STR} characters).` };
  return { value: v };
}
function enumArg(args, key, allowed) {
  const v = args[key];
  if (v === undefined || v === null) return { value: undefined };
  if (!allowed.includes(v)) return { err: `"${key}" must be one of: ${allowed.join(', ')}.` };
  return { value: v };
}
const verArg = (args, key) => {
  const s = strArg(args, key);
  if (s.err || s.value === undefined) return s;
  return SEMVER.test(s.value) ? s : { err: `"${key}" must be a version like 0.8.7.` };
};
const firstError = (...rs) => rs.find((r) => r.err);

function score(c, terms) {
  const hay = `${c.name} ${c.category ?? ''} ${c.summary} ${c.props.map((p) => p.name).join(' ')}`.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (c.name.toLowerCase() === t) s += 20;
    else if (c.name.toLowerCase().includes(t)) s += 8;
    if ((c.category ?? '').toLowerCase().includes(t)) s += 3;
    if (c.summary.toLowerCase().includes(t)) s += 3;
    else if (hay.includes(t)) s += 1;
  }
  return s;
}

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function closest(name) {
  const n = name.toLowerCase();
  return manifest.components
    .map((c) => [c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()) ? 0 : distance(n, c.name.toLowerCase()), c.name])
    .filter(([d]) => d <= 2)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 5)
    .map(([, c]) => c);
}

/* ---------- icons ---------- */
const iconNames = new Set();
for (const i of iconIndex) { iconNames.add(i.name); if (i.filled) iconNames.add(i.filled); }
const iconWords = (name) => name.replace(/^Icon/, '').replace(/Filled$/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').toLowerCase();

// The conventional icon for common UI intents, ranked first (tags alone rank e.g. IconHttpDelete above IconTrash for "delete").
const COMMON = {
  delete: ['IconTrash'], remove: ['IconTrash', 'IconX'], trash: ['IconTrash'], bin: ['IconTrash'], edit: ['IconPencil', 'IconEdit'], rename: ['IconPencil'],
  close: ['IconX'], dismiss: ['IconX'], cancel: ['IconX'], add: ['IconPlus'], new: ['IconPlus'], create: ['IconPlus'], plus: ['IconPlus'],
  search: ['IconSearch'], find: ['IconSearch'], settings: ['IconSettings', 'IconAdjustments'], preferences: ['IconSettings'], menu: ['IconMenu2'],
  more: ['IconDots', 'IconDotsVertical'], options: ['IconDots', 'IconDotsVertical'], user: ['IconUser'], profile: ['IconUser', 'IconUserCircle'], account: ['IconUserCircle'],
  home: ['IconHome'], back: ['IconArrowLeft', 'IconChevronLeft'], next: ['IconArrowRight', 'IconChevronRight'], forward: ['IconArrowRight'], previous: ['IconArrowLeft', 'IconChevronLeft'],
  expand: ['IconChevronDown'], collapse: ['IconChevronUp'], dropdown: ['IconChevronDown'], upload: ['IconUpload'], download: ['IconDownload'], share: ['IconShare'],
  copy: ['IconCopy'], duplicate: ['IconCopy'], save: ['IconDeviceFloppy'], filter: ['IconFilter'], sort: ['IconArrowsSort'], calendar: ['IconCalendar'], date: ['IconCalendar'],
  notification: ['IconBell'], notifications: ['IconBell'], bell: ['IconBell'], mail: ['IconMail'], email: ['IconMail'], message: ['IconMessage'], chat: ['IconMessageCircle'],
  phone: ['IconPhone'], call: ['IconPhone'], logout: ['IconLogout'], signout: ['IconLogout'], login: ['IconLogin'], help: ['IconHelpCircle', 'IconHelp'], info: ['IconInfoCircle'],
  warning: ['IconAlertTriangle'], error: ['IconAlertCircle'], success: ['IconCircleCheck'], check: ['IconCheck'], done: ['IconCheck'], favorite: ['IconHeart', 'IconStar'],
  like: ['IconHeart', 'IconThumbUp'], star: ['IconStar'], rating: ['IconStar'], cart: ['IconShoppingCart'], refresh: ['IconRefresh'], reload: ['IconRefresh'], link: ['IconLink'],
  attach: ['IconPaperclip'], attachment: ['IconPaperclip'], lock: ['IconLock'], password: ['IconLock'], view: ['IconEye'], show: ['IconEye'], hide: ['IconEyeOff'],
  play: ['IconPlayerPlay'], pause: ['IconPlayerPause'], stop: ['IconPlayerStop'], theme: ['IconSun', 'IconMoon'], dark: ['IconMoon'], light: ['IconSun'],
  external: ['IconExternalLink'], drag: ['IconGripVertical'], sidebar: ['IconLayoutSidebar'], dashboard: ['IconLayoutDashboard'], analytics: ['IconChartBar'], chart: ['IconChartBar'],
  money: ['IconCurrencyDollar'], payment: ['IconCreditCard'], card: ['IconCreditCard'], location: ['IconMapPin'], time: ['IconClock'], clock: ['IconClock'], file: ['IconFile'],
  folder: ['IconFolder'], image: ['IconPhoto'], photo: ['IconPhoto'], video: ['IconVideo'],
};

function searchIcons(query, limit = 12) {
  const terms = String(query).toLowerCase().replace(/icon/g, ' ').split(/[^a-z0-9]+/).filter(Boolean);
  if (!terms.length) return [];
  const boosted = new Map();
  for (const t of terms) (COMMON[t] || []).forEach((n, k) => boosted.set(n, Math.max(boosted.get(n) || 0, 40 - k * 5)));
  return iconIndex
    .map((i) => {
      const words = iconWords(i.name).split(' ');
      const tags = (i.tags || []).map((t) => t.toLowerCase());
      let s = boosted.get(i.name) || 0;
      for (const t of terms) {
        if (words.join(' ') === t) s += 30;
        else if (words[0] === t) s += 12;
        else if (words.includes(t)) s += 8;
        else if (words.some((w) => w.startsWith(t))) s += 4;
        if (tags.includes(t)) s += 6;
        else if (tags.some((g) => g.includes(t))) s += 2;
        if ((i.category || '').toLowerCase() === t) s += 2;
      }
      return [s - words.length * 0.1, i];
    })
    .filter(([s]) => s > 0.5)
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, i]) => i);
}

/** Checks a value given for an icon prop. Returns an error string, or null. */
function iconProblem(propName, raw, importedElsewhere = new Set()) {
  const v = String(raw).trim().replace(/^\{|\}$/g, '').trim();
  if (/^</.test(v)) {
    const tag = (/^<\s*([A-Za-z][\w.]*)/.exec(v) || [])[1] || 'Icon';
    const real = iconNames.has(tag) || importedElsewhere.has(tag) ? tag : (searchIcons(tag, 1)[0] || {}).name;
    const unknown = real && real !== tag ? ` ${tag} is not a SakaniUI icon either.` : '';
    return `"${propName}" takes the icon component itself, not an element: write ${propName}={${real || 'IconName'}}, not ${propName}={<${tag} />}.${unknown}${!real ? ' Use search_icons to find the real name.' : ''}`;
  }
  if (!/^[A-Za-z_$][\w$]*$/.test(v)) return null; // an expression we cannot judge
  if (iconNames.has(v) || importedElsewhere.has(v)) return null;
  const hint = searchIcons(v, 3).map((i) => i.name);
  return `"${v}" is not a SakaniUI icon.${hint.length ? ` Did you mean: ${hint.join(', ')}?` : ''} Use search_icons to find the real name.`;
}

const NATIVE = /^(className|style|id|ref|key|children|role|tabIndex|title|hidden|lang|dir|slot|on[A-Z].*|aria-.*|data-.*)$/;

/** Release notes: [{version, body}] newest first, from the CHANGELOG that matches the answering install. */
function releases() {
  const parts = changelog.split(/^## (\d+\.\d+\.\d+[^\n]*)\n/m);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ version: parts[i].trim(), body: (parts[i + 1] || '').trim() });
  return out.sort((a, b) => cmp(b.version, a.version));
}

/* ---------- check_code: a small, read-only JSX scanner (the code is never executed) ---------- */
/** Line number lookup in O(log n): a precomputed index of line starts per code string. */
function lineIndex(code) {
  const starts = [0];
  for (let i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) starts.push(i + 1);
  return (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
}
let lineAt = (code, i) => code.slice(0, i).split('\n').length;

function parseImports(code) {
  const out = [];
  const re = /import\s+(type\s+)?(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) {
    const names = (m[3] || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
      const typeOnly = /^type\s+/.test(x);
      const [imported, local] = x.replace(/^type\s+/, '').split(/\s+as\s+/).map((y) => y.trim());
      return { imported, local: local || imported, typeOnly: typeOnly || !!m[1] };
    });
    out.push({ from: m[4], names, line: lineAt(code, m.index), def: m[2] || null });
  }
  return out;
}

/** Reads a balanced {...} starting at code[i] === '{'. Returns the index after the closing brace. */
function skipBraces(code, i) {
  let depth = 0;
  for (; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      for (i++; i < code.length && code[i] !== q; i++) if (code[i] === '\\') i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return code.length;
}

const ATTR_NAME = /[A-Za-z_][\w:.-]*/y;

function parseElements(code, wanted) {
  const els = [];
  const re = /<([A-Z][\w]*(?:\.[A-Z][\w]*)?)(?=[\s/>])/g;
  let m;
  while ((m = re.exec(code))) {
    const tag = m[1];
    if (!wanted(tag)) continue;
    let i = m.index + m[0].length;
    const attrs = [];
    let spread = false;
    let selfClosing = false;
    // every pass must move forward; an unterminated attribute ends the element instead of looping
    for (let guard = 0; i < code.length && guard < 5000; guard++) {
      while (/\s/.test(code[i])) i++;
      if (code[i] === '/' && code[i + 1] === '>') { selfClosing = true; i += 2; break; }
      if (code[i] === '>') { i++; break; }
      if (code[i] === '<') break; // a new tag before this one closed: malformed, stop here
      if (code[i] === '{') { const end = skipBraces(code, i); if (/^\{\s*\.\.\./.test(code.slice(i, end))) spread = true; i = end; continue; }
      ATTR_NAME.lastIndex = i;
      const nm = ATTR_NAME.exec(code);
      if (!nm) { i++; continue; }
      const name = nm[0];
      i += name.length;
      while (/\s/.test(code[i])) i++;
      if (code[i] !== '=') { attrs.push({ name, kind: 'boolean', value: true }); continue; }
      i++;
      while (/\s/.test(code[i])) i++;
      if (code[i] === '"' || code[i] === "'") {
        const q = code[i];
        const end = code.indexOf(q, i + 1);
        if (end === -1) { attrs.push({ name, kind: 'string', value: code.slice(i + 1) }); i = code.length; break; }
        attrs.push({ name, kind: 'string', value: code.slice(i + 1, end) });
        i = end + 1;
      } else if (code[i] === '{') {
        const end = skipBraces(code, i);
        const expr = code.slice(i + 1, end - 1).trim();
        attrs.push({ name, ...classify(expr) });
        i = end;
      }
    }
    els.push({ tag, attrs, spread, selfClosing, line: lineAt(code, m.index) });
    if (els.length >= 5000) break;
    re.lastIndex = Math.max(re.lastIndex, i);
  }
  return els;
}

function classify(expr) {
  let m;
  if ((m = /^(['"])([\s\S]*)\1$/.exec(expr))) return { kind: 'string', value: m[2], raw: expr };
  if ((m = /^`([^`$]*)`$/.exec(expr))) return { kind: 'string', value: m[1], raw: expr };
  if (/^-?\d+(\.\d+)?$/.test(expr)) return { kind: 'number', value: Number(expr), raw: expr };
  if (expr === 'true' || expr === 'false') return { kind: 'boolean', value: expr === 'true', raw: expr };
  if (/^</.test(expr)) return { kind: 'element', raw: expr };
  if (/^[A-Za-z_$][\w$]*$/.test(expr)) return { kind: 'identifier', value: expr, raw: expr };
  return { kind: 'expression', raw: expr };
}

const TYPE_LIKE = /(Props|Type|Variant|Size|Item|Option|Datum|Column|Link|Plan|Post|Action|Step|Image|Author|Change|Data|Tab|Color|Category|Job|Member|Testimonial|Transaction)$/;

function checkCode(code) {
  lineAt = ((idx) => (_c, pos) => idx(pos))(lineIndex(code));
  const errors = [];
  const warnings = [];
  const imports = parseImports(code);
  const importedFrom = new Map(); // local name -> module
  for (const imp of imports) for (const n of imp.names) importedFrom.set(n.local, imp.from);
  const importedElsewhere = new Set([...importedFrom].filter(([, from]) => !from.startsWith('@sakaniui/react')).map(([n]) => n));

  for (const imp of imports) {
    if (!imp.from.startsWith('@sakaniui/react')) continue;
    const entry = imp.from;
    if (!['@sakaniui/react', '@sakaniui/react/blocks', '@sakaniui/react/icons'].includes(entry)) {
      if (imp.names.length) errors.push({ line: imp.line, message: `"${entry}" has no named exports. Import components from @sakaniui/react, blocks from @sakaniui/react/blocks and icons from @sakaniui/react/icons.` });
      continue;
    }
    if (imp.def) errors.push({ line: imp.line, message: `${entry} has no default export; use a named import: import { ${imp.def} } from '${entry}';` });
    for (const n of imp.names) {
      if (n.typeOnly) continue;
      const c = byName.get(n.imported.toLowerCase());
      const isUtility = manifest.utilities?.some((u) => u.name === n.imported);
      if (entry === '@sakaniui/react/icons') {
        if (!iconNames.has(n.imported)) {
          const hint = searchIcons(n.imported, 3).map((i) => i.name);
          errors.push({ line: imp.line, message: `${n.imported} is not exported by @sakaniui/react/icons.${hint.length ? ` Did you mean: ${hint.join(', ')}?` : ''}` });
        }
        continue;
      }
      if (c && c.name !== n.imported) { errors.push({ line: imp.line, message: `${n.imported} has the wrong casing; the export is ${c.name}.` }); continue; }
      if (entry === '@sakaniui/react/blocks') {
        if (!c || c.kind !== 'block') errors.push({ line: imp.line, message: c ? `${n.imported} is a component: import it from @sakaniui/react.` : `${n.imported} is not a SakaniUI block.` });
        continue;
      }
      if (c && c.kind === 'block') { errors.push({ line: imp.line, message: `${n.imported} is a block: import it from @sakaniui/react/blocks.` }); continue; }
      if (!c && !isUtility) {
        if (TYPE_LIKE.test(n.imported)) continue; // most likely a type export
        const near = closest(n.imported);
        errors.push({ line: imp.line, message: `${n.imported} is not exported by @sakaniui/react.${near.length ? ` Did you mean: ${near.join(', ')}?` : ''} Use search_components.` });
      }
      if (c && inInstalled(c) === false) errors.push({ line: imp.line, message: `${c.name} was added in ${c.since}; the project has ${projectVersion}.` });
    }
  }

  // elements: anything imported from @sakaniui, plus manifest names used without an import
  const isSakani = (tag) => importedFrom.get(tag)?.startsWith('@sakaniui/react') || (!importedFrom.has(tag) && byName.has(tag.toLowerCase()) && byName.get(tag.toLowerCase()).name === tag);
  const elements = parseElements(code, isSakani);
  for (const el of elements) {
    const c = byName.get(el.tag.toLowerCase());
    if (!c) continue;
    const at = (message) => ({ line: el.line, message: `<${el.tag}>: ${message}` });
    if (!importedFrom.has(el.tag)) warnings.push(at(`not imported. Add: import { ${c.name} } from '${c.import}';`));
    const given = new Map(el.attrs.map((a) => [a.name, a]));
    if (!el.selfClosing) given.set('children', { kind: 'expression' });
    for (const r of c.contract.requiredProps) {
      if (given.has(r)) continue;
      if (el.spread) warnings.push(at(`required prop "${r}" is not written out (it may come from the spread).`));
      else errors.push(at(`missing required prop "${r}".`));
    }
    const known = new Map(c.props.map((p) => [p.name, p]));
    for (const a of el.attrs) {
      const p = known.get(a.name);
      if (!p) { if (!NATIVE.test(a.name) && a.name !== 'key' && a.name !== 'ref') warnings.push(at(`"${a.name}" is not a ${c.name} prop (it only works if it is a native attribute).`)); continue; }
      if (p.values && ['string', 'number', 'boolean'].includes(a.kind) && !p.values.includes(a.value)) {
        errors.push(at(`${a.name}=${JSON.stringify(a.value)} is not allowed. Use one of: ${p.values.map((x) => JSON.stringify(x)).join(', ')}.`));
      }
      if (p.type === 'IconComponent') {
        if (a.kind === 'string') errors.push(at(`"${a.name}" takes an icon component, not a string: ${a.name}={IconName}.`));
        else if (a.kind === 'element' || a.kind === 'identifier') {
          const e = iconProblem(a.name, a.raw, importedElsewhere);
          if (e) errors.push(at(e));
          else if (a.kind === 'identifier' && iconNames.has(a.value) && importedFrom.get(a.value) !== '@sakaniui/react/icons') warnings.push(at(`${a.value} is not imported. Add: import { ${a.value} } from '@sakaniui/react/icons';`));
        }
      }
    }
  }
  if (!elements.length && !imports.some((i) => i.from.startsWith('@sakaniui/react'))) warnings.push({ line: 1, message: 'No SakaniUI imports or elements found in this code.' });
  const out = { ok: errors.length === 0, checkedElements: elements.length, errors, warnings };
  const note = versionNote(); if (note) out.versionNote = note;
  return out;
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/* ---------- tools ---------- */
const tools = {
  search_components: {
    description: 'Find SakaniUI components/blocks by what you need (e.g. "date picker", "sidebar navigation", "pricing"). Returns the best matches with import path, the release that added them and required props.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, kind: { type: 'string', enum: ['component', 'block'] }, limit: { type: 'number' } }, required: ['query'] },
    run(args) {
      const q = strArg(args, 'query', { required: true }); const k = enumArg(args, 'kind', ['component', 'block']);
      const e = firstError(q, k); if (e) return fail(e.err);
      const limit = Number.isInteger(args.limit) ? Math.min(Math.max(args.limit, 1), 25) : 8;
      const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = manifest.components
        .filter((c) => !k.value || c.kind === k.value)
        .map((c) => [score(c, terms), c])
        .filter(([s]) => s > 0)
        .sort((a, b) => b[0] - a[0])
        .slice(0, limit)
        .map(([, c]) => brief(c));
      const note = versionNote();
      const body = hits.length ? hits : `No match for "${q.value}". If nothing fits, follow AGENTS.md section 3 ("When nothing fits"): compose from tokens and say so. Try list_components to browse.`;
      return text(note && hits.length ? { versionNote: note, results: hits } : body);
    },
  },
  get_component: {
    description: 'Full contract for one component or block: import path, the release that added it, every prop with type / allowed values / default / required, and the accessible-name rule. Use this before writing JSX.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    run(args) {
      const n = strArg(args, 'name', { required: true }); if (n.err) return fail(n.err);
      const c = byName.get(n.value.toLowerCase());
      if (!c) return fail(`No component named "${n.value}". Did you mean: ${closest(n.value).join(', ') || '(none close)'}? Use search_components.`);
      const out = { ...c, note: 'Native HTML attributes (className, style, aria-*, event handlers) are also accepted on the root element.' };
      if (c.example) out.exampleNote = 'Start from `example`: it is type-checked against this release. Replace the placeholder text and values; keep the prop names and shapes.';
      if (c.props.some((p) => p.type === 'IconComponent')) out.iconNote = 'Icon props take the component itself (icon={IconTrash}), not an element. The example uses IconStar as a placeholder: find the real icon with search_icons.';
      if (inInstalled(c) === false) out.availableInInstalled = false;
      const note = versionNote();
      if (note) out.versionNote = note;
      if (inInstalled(c) === false) out.warning = `${c.name} was added in ${c.since} but the project has ${projectVersion}. Do not use it without upgrading (npm install @sakaniui/react@latest).`;
      return text(out);
    },
  },
  list_components: {
    description: 'List all components and blocks (name + one-line summary), optionally filtered by kind or category (e.g. Forms, Core, Marketing).',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['component', 'block'] }, category: { type: 'string' } } },
    run(args) {
      const k = enumArg(args, 'kind', ['component', 'block']); const cat = strArg(args, 'category');
      const e = firstError(k, cat); if (e) return fail(e.err);
      const list = manifest.components
        .filter((c) => (!k.value || c.kind === k.value) && (!cat.value || (c.category ?? '').toLowerCase().includes(cat.value.toLowerCase())))
        .map((c) => { const o = { name: c.name, kind: c.kind, category: c.category, since: c.since, summary: c.summary }; if (inInstalled(c) === false) o.availableInInstalled = false; return o; });
      const categories = [...new Set(manifest.components.map((c) => c.category).filter(Boolean))].sort();
      const out = { version: refVersion, count: list.length, categories, components: list };
      const note = versionNote(); if (note) out.versionNote = note;
      return text(out);
    },
  },
  get_tokens: {
    description: 'Design tokens (CSS custom properties). Pass a group (color, space, radius, shadow, font, motion, glass, surface, liquid, ...) and/or a substring to filter. Only these tokens exist.',
    inputSchema: { type: 'object', properties: { group: { type: 'string' }, query: { type: 'string' } } },
    run(args) {
      const g = strArg(args, 'group'); const q = strArg(args, 'query');
      const e = firstError(g, q); if (e) return fail(e.err);
      const groups = manifest.tokens.groups;
      if (g.value && !Object.hasOwn(groups, g.value)) return fail(`Unknown token group "${g.value}". Groups: ${Object.keys(groups).join(', ')}`);
      const needle = q.value?.toLowerCase();
      const out = {};
      for (const [name, toks] of Object.entries(groups)) {
        if (g.value && name !== g.value) continue;
        const sel = Object.entries(toks).filter(([k, v]) => !needle || k.includes(needle) || String(v).toLowerCase().includes(needle));
        if (sel.length) out[name] = Object.fromEntries(sel);
      }
      return text(Object.keys(out).length ? out : `No tokens match. Groups: ${Object.keys(groups).join(', ')}`);
    },
  },
  check_usage: {
    description: 'Validate props you are about to use against the contract: reports missing required props, values outside an enum, props that do not exist, and components the project\'s installed version does not have. Run it on each component you write.',
    inputSchema: { type: 'object', properties: { component: { type: 'string' }, props: { type: 'object', description: 'prop name -> value (use true/false/numbers/strings; for non-literal values pass any placeholder)' } }, required: ['component'] },
    run(args) {
      const n = strArg(args, 'component', { required: true }); if (n.err) return fail(n.err);
      const props = args.props === undefined || args.props === null ? {} : args.props;
      if (typeof props !== 'object' || Array.isArray(props)) return fail('"props" must be an object of prop name -> value.');
      if (Object.keys(props).length > 200) return fail('"props" has too many entries (max 200).');
      const c = byName.get(n.value.toLowerCase());
      if (!c) return fail(`No component named "${n.value}". Did you mean: ${closest(n.value).join(', ') || '(none close)'}?`);
      const known = new Map(c.props.map((p) => [p.name, p]));
      const errors = [];
      const warnings = [];
      if (inInstalled(c) === false) errors.push(`${c.name} was added in ${c.since}; the project has ${projectVersion}. It does not exist there.`);
      for (const r of c.contract.requiredProps) if (!Object.hasOwn(props, r)) errors.push(`Missing required prop "${r}".`);
      for (const [k, v] of Object.entries(props)) {
        const p = known.get(k);
        if (!p) { if (!NATIVE.test(k)) warnings.push(`"${k}" is not a ${c.name} prop in the manifest (it would only work if it is a native attribute).`); continue; }
        if (p.values && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') && !p.values.includes(v)) {
          errors.push(`"${k}" = ${JSON.stringify(v)} is not allowed. Use one of: ${p.values.map((x) => JSON.stringify(x)).join(', ')}.`);
        }
        if (p.type === 'IconComponent' && typeof v === 'string') { const e = iconProblem(k, v); if (e) errors.push(e); }
      }
      if (c.contract.requiresAccessibleName && !errors.length) warnings.push('This control has no visible text of its own: keep its accessible-name prop set.');
      const out = { component: c.name, ok: errors.length === 0, errors, warnings };
      const note = versionNote(); if (note) out.versionNote = note;
      return text(out);
    },
  },
  check_compatibility: {
    description: 'Compare the version this reference describes with the version installed in the project, and list what the project does not have yet. Call this first when you cannot tell which @sakaniui/react version the project uses (pass installedVersion, from `npm ls @sakaniui/react` or package.json).',
    inputSchema: { type: 'object', properties: { installedVersion: { type: 'string', description: 'e.g. 0.7.0' } } },
    run(args) {
      const v = verArg(args, 'installedVersion'); if (v.err) return fail(v.err.err);
      const installed = v.value ? v.value.match(SEMVER)[0] : projectVersion;
      const source = v.value ? 'provided' : projectVersion ? 'detected' : 'unknown';
      if (!installed) {
        return text({ reference: refVersion, installed: null, source, advice: 'The project version is unknown. Run `npm ls @sakaniui/react`, then call this tool again with installedVersion.' });
      }
      const missing = manifest.components.filter((c) => c.since && cmp(c.since, installed) > 0).map((c) => ({ name: c.name, since: c.since }));
      const newer = releases().filter((r) => cmp(r.version, installed) > 0).map((r) => r.version);
      const relation = cmp(installed, refVersion) === 0 ? 'same' : cmp(installed, refVersion) < 0 ? 'project is older' : 'project is newer than this reference';
      const advice = relation === 'same' ? 'The reference matches the installed version.'
        : relation === 'project is older' ? `Do not suggest the components listed under missingInInstalled, and check get_changelog (since ${installed}) before relying on newer props. Or upgrade: npm install @sakaniui/react@latest.`
        : 'The project has a newer release than this reference. Run the server from the project root (or pass --project) so it answers from the installed copy.';
      return text({ reference: refVersion, installed, source, relation, missingInInstalled: missing, releasesAfterInstalled: newer, advice });
    },
  },
  get_changelog: {
    description: 'Release notes that match a version. With `version`: that release. With `since`: every release after it, up to the version this reference describes. With neither: the releases between the project\'s installed version and this reference (or the latest release when they match or the project version is unknown).',
    inputSchema: { type: 'object', properties: { version: { type: 'string' }, since: { type: 'string' } } },
    run(args) {
      const ver = verArg(args, 'version'); const since = verArg(args, 'since');
      const e = firstError(ver, since); if (e) return fail(e.err);
      const all = releases();
      if (!all.length) return fail('No release notes are bundled with this install.');
      let pick;
      if (ver.value) {
        pick = all.filter((r) => cmp(r.version, ver.value) === 0 && r.version.startsWith(ver.value.match(SEMVER)[0]));
        if (!pick.length) return fail(`No release notes for ${ver.value}. Releases: ${all.map((r) => r.version).join(', ')}`);
      } else {
        const from = since.value ?? (projectVersion && cmp(projectVersion, refVersion) < 0 ? projectVersion : null);
        pick = from ? all.filter((r) => cmp(r.version, from) > 0 && cmp(r.version, refVersion) <= 0) : all.slice(0, 1);
        if (!pick.length) return text(`No releases after ${from}. This reference describes ${refVersion}.`);
      }
      return text(pick.map((r) => `## ${r.version}\n\n${r.body}`).join('\n\n'));
    },
  },
  search_icons: {
    description: 'Find real icon names (Tabler set, exported from @sakaniui/react/icons) by meaning, e.g. "delete", "settings", "arrow right". Never guess an icon name: only names returned here exist.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
    run(args) {
      const q = strArg(args, 'query', { required: true }); if (q.err) return fail(q.err);
      if (!iconIndex.length) return fail('The icon index is not available in this install.');
      const limit = Number.isInteger(args.limit) ? Math.min(Math.max(args.limit, 1), 30) : 12;
      const hits = searchIcons(q.value, limit).map((i) => { const o = { name: i.name }; if (i.filled) o.filled = i.filled; if (i.category) o.category = i.category; if (i.tags) o.tags = i.tags.slice(0, 5); return o; });
      if (!hits.length) return text(`No icon matches "${q.value}". Try a simpler word (e.g. "delete" rather than "remove item").`);
      return text({ import: "import { IconName } from '@sakaniui/react/icons';", usage: 'icon={IconName} (the component, not <IconName />)', icons: hits });
    },
  },
  check_code: {
    description: 'Check a JSX/TSX snippet you wrote: imports from @sakaniui/react (and /blocks, /icons) must exist, every SakaniUI element must have its required props, prop values must be allowed, and icon props must be real icon components passed as components. The code is only read, never run. Run it on every snippet before you answer.',
    inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'The snippet, including its import lines.' } }, required: ['code'] },
    run(args) {
      const code = args.code;
      if (typeof code !== 'string' || !code.trim()) return fail('"code" must be a non-empty string.');
      if (code.length > 50000) return fail('"code" is too long (max 50,000 characters).');
      return text(checkCode(code));
    },
  },
  get_guide: {
    description: 'The AGENTS.md guide (principles, token rules, when nothing fits, glass, icons, per-component "why / when not to use", checklist). Pass a section number or heading text to get just that section; omit for the section list.',
    inputSchema: { type: 'object', properties: { section: { type: 'string' } } },
    run(args) {
      const s0 = strArg(args, 'section'); if (s0.err) return fail(s0.err);
      if (!guide) return fail('AGENTS.md is not available in this install.');
      const parts = guide.split(/^(?=## )/m).filter((p) => p.startsWith('## '));
      const heads = parts.map((p) => p.split('\n')[0].replace(/^## /, ''));
      if (!s0.value) return text({ version: refVersion, sections: heads, hint: 'Call again with a number (e.g. "5") or heading text.' });
      const s = s0.value.toLowerCase().trim();
      const hit = parts.filter((p) => { const h = p.split('\n')[0].replace(/^## /, '').toLowerCase(); return h === s || h.startsWith(s + '.') || h.startsWith(s + ' ') || h.includes(s); });
      return hit.length ? text(hit.join('\n')) : fail(`No section "${s0.value}". Sections: ${heads.join(' | ')}`);
    },
  },
};

/* ---------- JSON-RPC over stdio ---------- */
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');

function handle(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return send({ id: null, error: { code: -32600, message: 'Invalid request' } });
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  try {
    switch (method) {
      case 'initialize': {
        const note = versionNote();
        return send({ id, result: {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'sakaniui', version: refVersion },
          instructions: `SakaniUI ${refVersion}${projectVersion ? ` (project has ${projectVersion})` : ''}. Read-only reference. Look components up with search_components / get_component before writing JSX, validate with check_usage, use only tokens from get_tokens, and read get_guide when nothing fits.${note ? ` ${note}` : ''}`,
        } });
      }
      case 'ping':
        return send({ id, result: {} });
      case 'tools/list':
        return send({ id, result: { tools: Object.entries(tools).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema, annotations: READ_ONLY })) } });
      case 'tools/call': {
        const t = typeof params?.name === 'string' && Object.hasOwn(tools, params.name) ? tools[params.name] : null;
        if (!t) return send({ id, error: { code: -32602, message: `Unknown tool: ${String(params?.name).slice(0, 60)}` } });
        const args = params.arguments;
        if (args !== undefined && args !== null && (typeof args !== 'object' || Array.isArray(args))) return send({ id, result: fail('Tool arguments must be an object.') });
        return send({ id, result: t.run(args || {}) });
      }
      default:
        if (isRequest) send({ id, error: { code: -32601, message: `Method not found: ${String(method).slice(0, 60)}` } });
    }
  } catch (e) {
    if (isRequest) send({ id, error: { code: -32603, message: String(e?.message || e) } });
  }
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: 'Parse error' } }); }
  handle(msg);
});
