#!/usr/bin/env node
/**
 * Release @sakaniui/react and @sakaniui/mcp.
 *
 *   npm run release              dry run: every check, a build, what would be published. Publishes nothing.
 *   npm run release -- --publish check, then publish react, wait until it is live, publish mcp, wait, tag, record.
 *
 * Flags:
 *   --publish            really publish (without it nothing leaves this machine)
 *   --skip-build         trust the dist/ already built (the build also verifies the manifest)
 *   --no-github-release  tag and push, but do not create the GitHub release
 *   --docs <path>        afterwards run the docs bump in that checkout (see sakani-docs/scripts/bump-library.mjs)
 *
 * Why a script: a release used to be a list in someone's head. The ways it went wrong were all in the list:
 *   - publishing twice (npm "previously staged" E409: the first publish had already gone, it was only waiting
 *     for the browser approval or the registry),
 *   - a stale login (E404 on the PUT), found only after the build,
 *   - the manifest labelling components "new in 0.16.0" because releases.json did not say which commit shipped 0.15.0,
 *   - publishing mcp before react was live, so the docs saw one without the other.
 *
 * npm asks for a browser approval on every publish. The script cannot do that for you: it prints what it is about
 * to publish, runs `npm publish` in your terminal, and you press Enter and approve in the browser, as before.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const PUBLISH = flag('--publish');
const docsAt = args.includes('--docs') ? args[args.indexOf('--docs') + 1] : null;

const c = { dim: (s) => `\x1b[2m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m` };
const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const tryRun = (cmd, a, opts) => { try { return { ok: true, out: run(cmd, a, opts) }; } catch (e) { return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() }; } };
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pkgs = [
  { name: '@sakaniui/react', dir: root, json: readJson('package.json') },
  { name: '@sakaniui/mcp', dir: path.join(root, 'mcp'), json: readJson('mcp/package.json') },
];
const version = pkgs[0].json.version;

const failures = [];
const warnings = [];
const check = (ok, label, hint) => {
  console.log(`  ${ok ? c.green('✓') : c.red('✗')} ${label}`);
  if (!ok) { failures.push(label); if (hint) console.log(c.dim(`      ${hint}`)); }
};
const warn = (label, hint) => { warnings.push(label); console.log(`  ${c.yellow('!')} ${label}`); if (hint) console.log(c.dim(`      ${hint}`)); };

/** Is this exact version on the registry? (npm view exits non-zero with E404 when it is not.) */
const onRegistry = (name, v) => tryRun('npm', ['view', `${name}@${v}`, 'version']).out === v;

console.log(c.bold(`\nRelease ${version}${PUBLISH ? '' : c.dim('  (dry run: nothing will be published)')}\n`));
console.log(c.bold('Checks'));

// 1. where the code is
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
check(branch === 'main', `on main (on ${branch})`, 'Releases go out from main: merge your branch first.');
const dirty = run('git', ['status', '--porcelain', '--untracked-files=no']);
check(dirty === '', 'no uncommitted changes to tracked files', dirty.split('\n').slice(0, 4).join(' | '));
tryRun('git', ['fetch', '--quiet']);
const sync = tryRun('git', ['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
const [ahead, behind] = sync.ok ? sync.out.split(/\s+/).map(Number) : [NaN, NaN];
check(ahead === 0 && behind === 0, `in sync with origin (ahead ${ahead}, behind ${behind})`, 'Push, or pull, so the published code is the code on GitHub.');

// 2. versions and notes
check(pkgs[1].json.version === version, `@sakaniui/react and @sakaniui/mcp agree on ${version} (mcp is ${pkgs[1].json.version})`, 'Bump both: npm version <v> --no-git-tag-version in the root and in mcp/.');
const firstHeading = (fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').match(/^## (.+)$/m) ?? [])[1];
check(firstHeading === version, `CHANGELOG's newest section is "${version}" (it is "${firstHeading}")`, 'Rename "Unreleased" to the version.');
const releases = readJson('scripts/manifest/releases.json');
const prevVersions = Object.keys(releases);
const lastRecorded = prevVersions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
const published = tryRun('npm', ['view', '@sakaniui/react', 'versions', '--json']);
const live = published.ok ? JSON.parse(published.out) : [];
const latestLive = live.filter((v) => /^\d+\.\d+\.\d+$/.test(v)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
if (latestLive && latestLive !== version && !releases[latestLive]) {
  warn(`releases.json does not record which commit shipped ${latestLive}`, `Without it the manifest may label components "new in ${version}" that shipped earlier. This script records ${version} after publishing; add ${latestLive} by hand if it was published from an older commit than the one that bumped it.`);
} else check(true, `releases.json is current (last recorded ${lastRecorded})`);

// 3. what is left to publish
const todo = pkgs.filter((p) => !onRegistry(p.name, version));
for (const p of pkgs) console.log(`  ${onRegistry(p.name, version) ? c.dim('•') : c.green('→')} ${p.name}@${version} ${onRegistry(p.name, version) ? c.dim('is already on the registry, will be skipped') : 'will be published'}`);
check(todo.length > 0, 'something to publish', 'Both packages are already live at this version: bump it for a new release.');

// 4. npm login
if (PUBLISH) {
  const who = tryRun('npm', ['whoami']);
  check(who.ok, who.ok ? `logged in to npm as ${who.out}` : 'logged in to npm', 'Run `npm login` (it opens the browser), then run this again.');
} else {
  const who = tryRun('npm', ['whoami']);
  if (who.ok) check(true, `logged in to npm as ${who.out}`); else warn('not logged in to npm', 'Run `npm login` before --publish; the dry run does not need it.');
}

// a real publish needs a login and a clean start: say so now, not after a minute-long build
if (PUBLISH && failures.length) { console.log(c.red(`\n${failures.length} check(s) failed. Fix them and run again.\n`)); process.exit(1); }

// 5. build, with the manifest verified; then what would go in each tarball
if (flag('--skip-build')) warn('build skipped (--skip-build): publishing whatever dist/ holds');
else {
  process.stdout.write(c.dim('  … building (npm run build:lib, also verifies the manifest) '));
  const b = tryRun('npm', ['run', 'build:lib'], { maxBuffer: 1 << 28 });
  console.log('');
  check(b.ok, 'build and manifest verification pass', b.ok ? undefined : b.out.split('\n').slice(-6).join(' | '));
  if (b.ok) console.log(c.dim(`      ${b.out.split('\n').filter((l) => l.startsWith('manifest verified')).join('').slice(0, 150)}`));
  const afterBuild = run('git', ['status', '--porcelain', '--untracked-files=no']);
  check(afterBuild === dirty, 'the build changed no tracked files', 'It rewrote: ' + afterBuild.split('\n').filter((l) => !dirty.includes(l)).join(' | ') + ' (commit them, e.g. scripts/manifest/since.json, then run again)');
}
for (const p of todo) {
  const sync = p.name === '@sakaniui/mcp' ? tryRun('node', ['scripts/sync.mjs'], { cwd: p.dir }) : { ok: true, out: '' };
  if (!sync.ok) check(false, 'mcp data syncs from the build', sync.out.split('\n').slice(-2).join(' | '));
  // --ignore-scripts: `prepare` would rebuild the library and print the build log into the JSON
  const pack = tryRun('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: p.dir, maxBuffer: 1 << 28 });
  if (pack.ok) { const j = JSON.parse(pack.out)[0]; console.log(c.dim(`  ${p.name}: ${j.entryCount} files, ${(j.size / 1048576).toFixed(1)} MB packed, ${(j.unpackedSize / 1048576).toFixed(1)} MB unpacked`)); }
  else check(false, `${p.name} packs`, pack.out.split('\n').slice(-2).join(' | '));
}

console.log('');
if (failures.length) { console.log(c.red(`${failures.length} check(s) failed. Fix them and run again.\n`)); process.exit(1); }
if (!PUBLISH) {
  console.log(c.green('Everything checks out.') + ` To publish ${version}: ${c.bold('npm run release -- --publish')}\n`);
  process.exit(0);
}

// ---------- publish ----------
console.log(c.bold('Publishing') + c.dim('  (each publish asks for a browser approval: press Enter, approve, and wait; do not run it twice)\n'));
const waitLive = async (name) => {
  process.stdout.write(c.dim(`  waiting for ${name}@${version} to appear on the registry `));
  for (let i = 0; i < 90; i++) { // 30 minutes
    if (onRegistry(name, version)) { console.log(c.green(' live')); return true; }
    process.stdout.write('.'); await sleep(20000);
  }
  console.log(c.red(' not seen after 30 minutes'));
  return false;
};
for (const p of todo) {
  console.log(`\n${c.bold(`${p.name}@${version}`)}`);
  const r = spawnSync('npm', ['publish'], { cwd: p.dir, stdio: 'inherit' });
  if (r.status !== 0) {
    // "previously staged" and a slow approval both end up here although the version is on its way: look before giving up
    console.log(c.yellow('  npm exited with an error. Checking whether the version is on its way anyway…'));
    if (!onRegistry(p.name, version)) {
      const ok = await waitLive(p.name);
      if (!ok) { console.log(c.red(`\nStopped. ${p.name} is not live. Do NOT run npm publish again before checking: npm view ${p.name} versions\n`)); process.exit(1); }
      continue;
    }
  }
  if (!(await waitLive(p.name))) { console.log(c.red('\nStopped: not live in time. Check `npm view` before doing anything else.\n')); process.exit(1); }
}

// ---------- after publishing ----------
console.log(c.bold('\nRecording the release'));
const sha = run('git', ['rev-parse', 'HEAD']);
const tag = `v${version}`;
if (!tryRun('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).ok) {
  run('git', ['tag', '-a', tag, '-m', `@sakaniui/react ${version}`]);
  const pushed = tryRun('git', ['push', 'origin', tag]);
  console.log(`  ${pushed.ok ? c.green('✓') : c.red('✗')} tag ${tag}${pushed.ok ? ' pushed' : ' not pushed: ' + pushed.out}`);
} else console.log(c.dim(`  tag ${tag} already exists`));

// which commit shipped this version: the manifest's "since" needs it for the NEXT release
releases[version] = sha;
fs.writeFileSync(path.join(root, 'scripts/manifest/releases.json'), JSON.stringify(releases, null, 2) + '\n');
const rec = tryRun('git', ['commit', '-am', `chore: record that ${version} shipped from ${sha.slice(0, 8)}`]);
if (rec.ok) { const push = tryRun('git', ['push', 'origin', 'main']); console.log(`  ${push.ok ? c.green('✓') : c.red('✗')} releases.json records ${version} -> ${sha.slice(0, 8)}${push.ok ? '' : ' (committed, not pushed: ' + push.out + ')'}`); }

if (!flag('--no-github-release') && tryRun('gh', ['auth', 'status']).ok) {
  const log = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  const section = log.split(/^## /m).find((s) => s.startsWith(`${version}\n`))?.replace(`${version}\n`, '').trim() ?? '';
  const gr = tryRun('gh', ['release', 'create', tag, '--title', `@sakaniui/react ${version}`, '--notes', section || `Release ${version}`]);
  console.log(`  ${gr.ok ? c.green('✓') : c.yellow('!')} GitHub release ${gr.ok ? gr.out : '(not created: ' + gr.out.split('\n')[0] + ')'}`);
}

console.log(c.green(`\n${version} is live.`));
if (docsAt) {
  console.log(c.bold('\nDocs'));
  spawnSync('node', ['scripts/bump-library.mjs', version], { cwd: path.resolve(docsAt), stdio: 'inherit' });
} else {
  console.log(`Next, in the docs checkout:  ${c.bold(`node scripts/bump-library.mjs ${version}`)}  ${c.dim('(or re-run this with --docs ~/Desktop/sakani-docs)')}\n`);
}
