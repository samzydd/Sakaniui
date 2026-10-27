/**
 * Copies the server and the data it answers from out of the library build into this package, so
 * `npx @sakaniui/mcp` installs a few hundred kB and nothing else (the library itself drags in
 * React, Recharts and Next.js through its dependencies, which made a cold start take ~30 s).
 *
 *   npm run build:lib          (in the repo root: builds dist/ and verifies it)
 *   cd mcp && npm publish      (prepack runs this script)
 *
 * The version is taken from the library, so the two always match.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(here, '..');
const lib = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const need = ['dist/manifest.json', 'dist/icon-index.json', 'dist/emoji-index.json', 'AGENTS.md', 'CHANGELOG.md', 'bin/sakaniui-mcp.mjs', 'LICENSE'];
for (const f of need) if (!fs.existsSync(path.join(root, f))) { console.error(`mcp: ${f} is missing. Run \`npm run build:lib\` in the repo root first.`); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist/manifest.json'), 'utf8'));
if (manifest.version !== lib.version) { console.error(`mcp: dist/manifest.json is ${manifest.version} but the library is ${lib.version}. Rebuild with \`npm run build:lib\`.`); process.exit(1); }

fs.rmSync(path.join(here, 'bin'), { recursive: true, force: true });
fs.rmSync(path.join(here, 'data'), { recursive: true, force: true });
fs.mkdirSync(path.join(here, 'bin'), { recursive: true });
fs.mkdirSync(path.join(here, 'data/dist'), { recursive: true });

fs.copyFileSync(path.join(root, 'bin/sakaniui-mcp.mjs'), path.join(here, 'bin/sakaniui-mcp.mjs'));
fs.chmodSync(path.join(here, 'bin/sakaniui-mcp.mjs'), 0o755);
fs.copyFileSync(path.join(root, 'dist/manifest.json'), path.join(here, 'data/dist/manifest.json'));
fs.copyFileSync(path.join(root, 'dist/icon-index.json'), path.join(here, 'data/dist/icon-index.json'));
fs.copyFileSync(path.join(root, 'dist/emoji-index.json'), path.join(here, 'data/dist/emoji-index.json'));
fs.copyFileSync(path.join(root, 'AGENTS.md'), path.join(here, 'data/AGENTS.md'));
fs.copyFileSync(path.join(root, 'CHANGELOG.md'), path.join(here, 'data/CHANGELOG.md'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(here, 'LICENSE'));
// the server reads the data as if it were an install of the library
fs.writeFileSync(path.join(here, 'data/package.json'), JSON.stringify({ name: '@sakaniui/react', version: lib.version, private: true }, null, 2) + '\n');

const own = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8'));
if (own.version !== lib.version) { own.version = lib.version; fs.writeFileSync(path.join(here, 'package.json'), JSON.stringify(own, null, 2) + '\n'); }
console.log(`mcp: synced @sakaniui/mcp@${lib.version} (${manifest.components.length} components, ${manifest.utilities.length} utilities)`);
