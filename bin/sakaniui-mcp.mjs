#!/usr/bin/env node
/**
 * SakaniUI MCP server -- lets an AI editor/agent look up the design system instead of guessing.
 *
 *   npx -y -p @sakaniui/react sakaniui-mcp [--project <dir>]
 *
 * Zero dependencies: speaks newline-delimited JSON-RPC (MCP stdio transport).
 *
 * Read-only by construction. It reads four fixed files (package.json, dist/manifest.json,
 * AGENTS.md, CHANGELOG.md) from a @sakaniui/react install and writes nothing, runs nothing and
 * opens no network connection. No tool takes a path; every tool argument is validated.
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
  return { root, version: pkg.version, manifest: readJson(root, 'dist/manifest.json'), guide: readText(root, 'AGENTS.md'), changelog: readText(root, 'CHANGELOG.md') };
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

const NATIVE = /^(className|style|id|ref|key|children|role|tabIndex|title|hidden|lang|dir|slot|on[A-Z].*|aria-.*|data-.*)$/;

/** Release notes: [{version, body}] newest first, from the CHANGELOG that matches the answering install. */
function releases() {
  const parts = changelog.split(/^## (\d+\.\d+\.\d+[^\n]*)\n/m);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ version: parts[i].trim(), body: (parts[i + 1] || '').trim() });
  return out.sort((a, b) => cmp(b.version, a.version));
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
