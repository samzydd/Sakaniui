#!/usr/bin/env node
/**
 * SakaniUI MCP server -- lets an AI editor/agent look up the design system instead of guessing.
 *
 *   npx -y -p @sakaniui/react sakaniui-mcp
 *
 * Zero dependencies: speaks newline-delimited JSON-RPC (MCP stdio transport) and answers from the
 * files shipped in this package -- dist/manifest.json (generated from the source on every build)
 * and AGENTS.md -- so it always matches the installed version.
 *
 * Tools: search_components, get_component, list_components, get_tokens, check_usage, get_guide.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readPkgFile = (p) => fs.readFileSync(path.join(pkgRoot, p), 'utf8');

let manifest;
try {
  manifest = JSON.parse(readPkgFile('dist/manifest.json'));
} catch {
  process.stderr.write('sakaniui-mcp: dist/manifest.json not found. Run `npm run build:lib` (or install a published version).\n');
  process.exit(1);
}
const guide = (() => { try { return readPkgFile('AGENTS.md'); } catch { return ''; } })();
const byName = new Map(manifest.components.map((c) => [c.name.toLowerCase(), c]));

/* ---------- helpers ---------- */
const brief = (c) => ({ name: c.name, kind: c.kind, category: c.category, import: c.import, summary: c.summary, requiredProps: c.contract.requiredProps });
const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });
const fail = (msg) => ({ isError: true, content: [{ type: 'text', text: msg }] });

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

/* ---------- tools ---------- */
const tools = {
  search_components: {
    description: 'Find SakaniUI components/blocks by what you need (e.g. "date picker", "sidebar navigation", "pricing"). Returns the best matches with import path and required props.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, kind: { type: 'string', enum: ['component', 'block'] }, limit: { type: 'number' } }, required: ['query'] },
    run({ query, kind, limit = 8 }) {
      const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
      const hits = manifest.components
        .filter((c) => !kind || c.kind === kind)
        .map((c) => [score(c, terms), c])
        .filter(([s]) => s > 0)
        .sort((a, b) => b[0] - a[0])
        .slice(0, limit)
        .map(([, c]) => brief(c));
      return hits.length ? text(hits) : text(`No match for "${query}". If nothing fits, follow AGENTS.md section 3 ("When nothing fits"): compose from tokens and say so. Try list_components to browse.`);
    },
  },
  get_component: {
    description: 'Full contract for one component or block: import path, every prop with type / allowed values / default / required, and the accessible-name rule. Use this before writing JSX.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    run({ name }) {
      const c = byName.get(String(name).toLowerCase());
      if (!c) return fail(`No component named "${name}". Did you mean: ${closest(String(name)).join(', ') || '(none close)'}? Use search_components.`);
      return text({ ...c, note: 'Native HTML attributes (className, style, aria-*, event handlers) are also accepted on the root element.' });
    },
  },
  list_components: {
    description: 'List all components and blocks (name + one-line summary), optionally filtered by kind or category (e.g. Forms, Core, Marketing).',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['component', 'block'] }, category: { type: 'string' } } },
    run({ kind, category }) {
      const list = manifest.components
        .filter((c) => (!kind || c.kind === kind) && (!category || (c.category ?? '').toLowerCase().includes(String(category).toLowerCase())))
        .map((c) => ({ name: c.name, kind: c.kind, category: c.category, summary: c.summary }));
      const categories = [...new Set(manifest.components.map((c) => c.category).filter(Boolean))].sort();
      return text({ count: list.length, categories, components: list });
    },
  },
  get_tokens: {
    description: 'Design tokens (CSS custom properties). Pass a group (color, space, radius, shadow, font, motion, ...) and/or a substring to filter. Only these tokens exist.',
    inputSchema: { type: 'object', properties: { group: { type: 'string' }, query: { type: 'string' } } },
    run({ group, query }) {
      const groups = manifest.tokens.groups;
      if (group && !groups[group]) return fail(`Unknown token group "${group}". Groups: ${Object.keys(groups).join(', ')}`);
      const out = {};
      for (const [g, toks] of Object.entries(groups)) {
        if (group && g !== group) continue;
        const sel = Object.entries(toks).filter(([k, v]) => !query || k.includes(String(query).toLowerCase()) || String(v).toLowerCase().includes(String(query).toLowerCase()));
        if (sel.length) out[g] = Object.fromEntries(sel);
      }
      return text(Object.keys(out).length ? out : `No tokens match. Groups: ${Object.keys(groups).join(', ')}`);
    },
  },
  check_usage: {
    description: 'Validate props you are about to use against the contract: reports missing required props, values outside an enum, and props that do not exist. Run it on each component you write.',
    inputSchema: { type: 'object', properties: { component: { type: 'string' }, props: { type: 'object', description: 'prop name -> value (use true/false/strings; for non-literal values pass any placeholder)' } }, required: ['component'] },
    run({ component, props = {} }) {
      const c = byName.get(String(component).toLowerCase());
      if (!c) return fail(`No component named "${component}". Did you mean: ${closest(String(component)).join(', ') || '(none close)'}?`);
      const known = new Map(c.props.map((p) => [p.name, p]));
      const errors = [];
      const warnings = [];
      for (const r of c.contract.requiredProps) if (!(r in props)) errors.push(`Missing required prop "${r}".`);
      for (const [k, v] of Object.entries(props)) {
        const p = known.get(k);
        if (!p) { if (!NATIVE.test(k)) warnings.push(`"${k}" is not a ${c.name} prop in the manifest (it would only work if it is a native attribute).`); continue; }
        if (p.values && typeof v === 'string' && !p.values.includes(v)) errors.push(`"${k}" = "${v}" is not allowed. Use one of: ${p.values.join(', ')}.`);
      }
      if (c.contract.requiresAccessibleName && !errors.length) warnings.push('This control has no visible text of its own: keep its accessible-name prop set.');
      return text({ component: c.name, ok: errors.length === 0, errors, warnings });
    },
  },
  get_guide: {
    description: 'The AGENTS.md guide (principles, token rules, when nothing fits, glass, icons, per-component "why / when not to use", checklist). Pass a section number or heading text to get just that section; omit for the section list.',
    inputSchema: { type: 'object', properties: { section: { type: 'string' } } },
    run({ section }) {
      if (!guide) return fail('AGENTS.md is not available in this install.');
      const parts = guide.split(/^(?=## )/m);
      const heads = parts.filter((p) => p.startsWith('## ')).map((p) => p.split('\n')[0].replace(/^## /, ''));
      if (!section) return text({ sections: heads, hint: 'Call again with a number (e.g. "5") or heading text.' });
      const s = String(section).toLowerCase().trim();
      const hit = parts.filter((p) => p.startsWith('## ')).filter((p) => { const h = p.split('\n')[0].replace(/^## /, '').toLowerCase(); return h === s || h.startsWith(s + '.') || h.startsWith(s + ' ') || h.includes(s); });
      return hit.length ? text(hit.join('\n')) : fail(`No section "${section}". Sections: ${heads.join(' | ')}`);
    },
  },
};

/* ---------- JSON-RPC over stdio ---------- */
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');

function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  try {
    switch (method) {
      case 'initialize':
        return send({ id, result: {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'sakaniui', version: manifest.version },
          instructions: `SakaniUI ${manifest.version}. Look components up with search_components / get_component before writing JSX, validate with check_usage, use only tokens from get_tokens, and read get_guide when nothing fits.`,
        } });
      case 'ping':
        return send({ id, result: {} });
      case 'tools/list':
        return send({ id, result: { tools: Object.entries(tools).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema })) } });
      case 'tools/call': {
        const t = tools[params?.name];
        if (!t) return send({ id, error: { code: -32602, message: `Unknown tool: ${params?.name}` } });
        return send({ id, result: t.run(params.arguments || {}) });
      }
      default:
        if (isRequest) send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
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
