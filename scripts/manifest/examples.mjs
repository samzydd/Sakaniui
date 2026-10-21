/**
 * Builds a minimal, ready-to-paste example for every component and block: the import lines plus
 * the element with each REQUIRED prop filled in. Agents copy it instead of composing their own
 * (which is how invented names like `<TrashIcon />` happen).
 *
 * Accurate by construction:
 *   - prop types are read from the SHIPPED type definitions (dist/*.d.ts), through the TypeScript
 *     checker, so values have the real shape (an array of `BreadcrumbItem` objects gets one item
 *     with each required field), real literal values and real icon names;
 *   - every example is then type-checked against the built package exactly as a user would import
 *     it (`@sakaniui/react`, `/blocks`, `/icons`). An example that does not compile is retried with
 *     simpler values and, if it still fails, left out -- never shipped broken.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const PLACEHOLDER_ICON = 'IconStar';

function compilerOptions(root) {
  return {
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    baseUrl: root,
    paths: {
      '@sakaniui/react': ['dist/index.d.ts'],
      '@sakaniui/react/blocks': ['dist/blocks.d.ts'],
      '@sakaniui/react/icons': ['dist/icons.d.ts'],
    },
    types: [],
  };
}

/* ---- placeholder values chosen by prop name, so the example reads naturally ---- */
const words = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function stringFor(name) {
  const n = name.toLowerCase();
  if (n === 'aria-label') return 'Describe the action';
  if (n === 'alt' || n.endsWith('alt')) return 'Describe the image';
  if (n === 'src' || n.endsWith('src') || n === 'image' || n.endsWith('image') || n === 'avatar' || n === 'logo') return '/images/example.jpg';
  if (n === 'href' || n.endsWith('href') || n === 'url' || n.endsWith('url')) return '/path';
  if (n === 'id' || n.endsWith('id')) return 'item-1';
  if (n === 'color') return 'var(--color-accent-default)';
  if (n === 'readtime') return '5 min read';
  if (n.includes('date')) return 'Oct 21, 2026';
  if (n.includes('time')) return '2 min ago';
  return cap(words(name));
}
function numberFor(name) {
  const n = name.toLowerCase();
  if (/progress|percent|value/.test(n)) return 50;
  if (/rating/.test(n)) return 4;
  if (/price|amount|total|balance/.test(n)) return 49;
  if (/index/.test(n)) return 0;
  return 1;
}

/** Writes a TS expression for a value of `type`. Returns null when it cannot. */
function makeSynth(checker, iconsUsed) {
  const isNullish = (t) => (t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)) !== 0;
  const nameOf = (t) => t.aliasSymbol?.getName() || t.getSymbol()?.getName() || '';

  function synth(type, propName, depth) {
    const alias = nameOf(type);
    if (alias === 'IconComponent') { iconsUsed.add(PLACEHOLDER_ICON); return PLACEHOLDER_ICON; }
    if (alias === 'ReactNode') return JSON.stringify(stringFor(propName));
    if (alias === 'ReactElement' || alias === 'Element') return `<span>${stringFor(propName)}</span>`;
    if (alias === 'Date') return 'new Date()';

    if (type.isUnion()) {
      const parts = type.types.filter((t) => !isNullish(t));
      if (parts.length && parts.every((t) => t.flags & ts.TypeFlags.BooleanLiteral)) return 'true';
      const lit = parts.find((t) => t.isStringLiteral() || t.isNumberLiteral());
      if (lit) return lit.isStringLiteral() ? JSON.stringify(lit.value) : String(lit.value);
      const pick = parts.find((t) => t.flags & ts.TypeFlags.String) || parts.find((t) => t.flags & ts.TypeFlags.Number) || parts[0];
      return pick ? synth(pick, propName, depth) : null;
    }
    if (type.isStringLiteral()) return JSON.stringify(type.value);
    if (type.isNumberLiteral()) return String(type.value);
    if (type.flags & ts.TypeFlags.String) return JSON.stringify(stringFor(propName));
    if (type.flags & ts.TypeFlags.Number) return String(numberFor(propName));
    if (type.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) return 'true';
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return '{}';
    if (type.flags & ts.TypeFlags.TypeParameter) {
      const c = type.getConstraint();
      return c ? synth(c, propName, depth) : '{ id: 1 }';
    }
    if (checker.isArrayType(type)) {
      const [elem] = checker.getTypeArguments(type);
      if (depth > 3 || !elem) return '[]';
      const v = synth(elem, singular(propName), depth + 1);
      return v === null ? '[]' : `[${v}]`;
    }
    if (checker.isTupleType(type)) {
      const els = checker.getTypeArguments(type).map((t) => synth(t, propName, depth + 1));
      return els.includes(null) ? null : `[${els.join(', ')}]`;
    }
    if (type.getCallSignatures().length) return '() => {}';
    if (type.flags & ts.TypeFlags.Object) {
      if (depth > 3) return '{}';
      const required = checker.getPropertiesOfType(type).filter((p) => !(p.flags & ts.SymbolFlags.Optional));
      if (!required.length) {
        // Record<string, string | number> and similar: give it one readable field
        const idx = type.getStringIndexType();
        if (idx) { const v = synth(idx, 'name', depth + 1); return v === null ? '{}' : `{ name: ${v} }`; }
        return '{}';
      }
      const fields = [];
      for (const p of required) {
        const pt = checker.getTypeOfSymbol(p);
        const v = synth(pt, p.getName(), depth + 1);
        if (v === null) return null;
        fields.push(`${/^[A-Za-z_$][\w$]*$/.test(p.getName()) ? p.getName() : JSON.stringify(p.getName())}: ${v}`);
      }
      return `{ ${fields.join(', ')} }`;
    }
    return null;
  }
  return synth;
}
const singular = (n) => n.replace(/ies$/, 'y').replace(/s$/, '');

function render(c, required, synth, simple) {
  const attrs = [];
  let children = null;
  for (const { name, type } of required) {
    if (name === 'children') { const v = synth(type, 'label', 0); children = v && /^"/.test(v) ? JSON.parse(v) : v ? `{${v}}` : 'Label'; continue; }
    let v = synth(type, name, 0);
    if (v === null) return null;
    if (simple && v.startsWith('[')) v = '[]'; // the fallback: empty arrays always type-check
    attrs.push(/^"/.test(v) ? `${name}=${v}` : `${name}={${v}}`);
  }
  const open = `<${c.name}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
  return children === null ? `${open} />` : `${open}>${children}</${c.name}>`;
}

/**
 * @returns {{ examples: Map<string, string>, failed: string[] }}
 */
export function buildExamples(root, components) {
  const options = compilerOptions(root);
  const tmp = path.join(root, 'node_modules/.cache/sakaniui-manifest');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  /* 1. read every component's props type from the shipped .d.ts */
  const typesFile = path.join(tmp, 'props.ts');
  const lines = ["import type { ComponentProps } from 'react';", "import * as M from '@sakaniui/react';", "import * as B from '@sakaniui/react/blocks';"];
  components.forEach((c, i) => lines.push(`export type P${i} = ComponentProps<typeof ${c.kind === 'block' ? 'B' : 'M'}.${c.name}>;`));
  fs.writeFileSync(typesFile, lines.join('\n') + '\n');
  const program = ts.createProgram([typesFile], options);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(typesFile);
  const aliasTypes = new Map();
  ts.forEachChild(sf, (node) => { if (ts.isTypeAliasDeclaration(node)) aliasTypes.set(node.name.text, checker.getTypeAtLocation(node.name)); });

  const drafts = [];
  components.forEach((c, i) => {
    const propsType = aliasTypes.get(`P${i}`);
    if (!propsType) return;
    const required = checker.getPropertiesOfType(propsType)
      .filter((p) => !(p.flags & ts.SymbolFlags.Optional) && p.getName() !== 'ref' && p.getName() !== 'key')
      .map((p) => ({ name: p.getName(), type: checker.getTypeOfSymbol(p) }));
    for (const simple of [false, true]) {
      const icons = new Set();
      const synth = makeSynth(checker, icons);
      const jsx = render(c, required, synth, simple);
      if (jsx === null) continue;
      const imports = [`import { ${c.name} } from '${c.import}';`];
      if (icons.size) imports.push(`import { ${[...icons].sort().join(', ')} } from '@sakaniui/react/icons';`);
      drafts.push({ c, simple, code: `${imports.join('\n')}\n\n${jsx}`, imports, jsx });
    }
  });

  /* 2. type-check every draft as a user's file would, against the built package */
  const fileOf = (d) => path.join(tmp, `${d.c.name}${d.simple ? '.simple' : ''}.tsx`);
  for (const d of drafts) fs.writeFileSync(fileOf(d), `${d.imports.join('\n')}\n\nexport const Example = () => (\n  ${d.jsx}\n);\n`);
  const check = ts.createProgram(drafts.map(fileOf), options);
  const bad = new Set();
  for (const diag of ts.getPreEmitDiagnostics(check)) if (diag.file) bad.add(path.resolve(diag.file.fileName));

  const examples = new Map();
  for (const d of drafts) {
    if (examples.has(d.c.name) || bad.has(path.resolve(fileOf(d)))) continue;
    examples.set(d.c.name, d.code);
  }
  const failed = components.filter((c) => !examples.has(c.name)).map((c) => c.name);
  return { examples, failed };
}

/** Re-checks shipped examples (used by verify.mjs). Returns the names whose example does not compile. */
export function typecheckExamples(root, entries) {
  const options = compilerOptions(root);
  const tmp = path.join(root, 'node_modules/.cache/sakaniui-manifest/verify');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const files = [];
  for (const { name, example } of entries) {
    const [head, ...rest] = example.split('\n\n');
    const file = path.join(tmp, `${name}.tsx`);
    fs.writeFileSync(file, `${head}\n\nexport const Example = () => (\n  ${rest.join('\n\n')}\n);\n`);
    files.push([name, file]);
  }
  const program = ts.createProgram(files.map(([, f]) => f), options);
  const bad = new Set();
  for (const diag of ts.getPreEmitDiagnostics(program)) if (diag.file) bad.add(path.resolve(diag.file.fileName));
  return files.filter(([, f]) => bad.has(path.resolve(f))).map(([n]) => n);
}

/** Every attribute React accepts on an HTML element (AllHTMLAttributes), from the installed @types/react. */
export function htmlAttributes(root) {
  const tmp = path.join(root, 'node_modules/.cache/sakaniui-manifest');
  fs.mkdirSync(tmp, { recursive: true });
  const f = path.join(tmp, 'attrs.ts');
  fs.writeFileSync(f, "import type { AllHTMLAttributes } from 'react';\nexport type A = AllHTMLAttributes<HTMLElement>;\n");
  const program = ts.createProgram([f], { ...compilerOptions(root), jsx: ts.JsxEmit.ReactJSX });
  const checker = program.getTypeChecker();
  let names = [];
  ts.forEachChild(program.getSourceFile(f), (n) => { if (ts.isTypeAliasDeclaration(n)) names = checker.getPropertiesOfType(checker.getTypeAtLocation(n.name)).map((x) => x.getName()); });
  return names.filter((n) => !/^on[A-Z]/.test(n) && !/^aria-/.test(n)).sort();
}
