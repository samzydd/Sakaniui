# Releasing SakaniUI

Two packages ship together, at the same version: `@sakaniui/react` (this repo's root) and `@sakaniui/mcp` (`mcp/`). Then
sakaniui.com is bumped to the new version. The scripts do the checking, the ordering and the waiting; you do the
two things only you can: approve each publish in the browser, and decide the feel is right.

## 1. Before you cut a release: is the change everywhere?

A change is not done when the code is merged. For anything a visitor or a designer can see, check each place:

| Where | What to check |
| --- | --- |
| **Figma** (file `Fd3uY263mEQKnaTEfrzQxh`) | The new component, variant or state exists as a real component, bound to tokens. Figma first: it is the source of truth. |
| **Storybook** | A story for the new prop or state (and the overview story, if it is a family of components). |
| **CHANGELOG.md** | An entry under `## Unreleased`, written for someone upgrading: what changed, what to pass, what is unchanged. |
| **AGENTS.md** | If an AI assistant should now choose or write something differently, say so here (it ships in the MCP server). |
| **Docs site** (sakani-docs) | The component's page shows it (props table row, a live preview), **and every other place the site shows that component** (the homepage wall and its cards, dashboard showcases, other pages' examples). Search for the component name across `src/`: the page you changed is rarely the only one. |

If you changed how a block or component sizes itself, open every docs page that previews it at desktop width **against the
local package** before you merge: the docs scale blocks inside a shrink-to-fit wrapper, which is where a
percentage-width block collapses (0.16.0 shipped that way; 0.17.1 fixed it).

Do the docs work on a branch in sakani-docs and build it against the local package (`npm pack` here, then
`npm i --no-save <tarball>` there). **Do not push it to docs `main` yet**: the docs site installs `@sakaniui/react` from
npm, and a build that uses a prop npm does not have yet fails the production deploy.

Motion and interaction changes also wait for the author's OK on the feel before they merge to `main`.

## 2. Prepare the version

On `main`, everything merged:

```bash
npm version <x.y.z> --no-git-tag-version          # root
(cd mcp && npm version <x.y.z> --no-git-tag-version)   # same number
```

- Rename `## Unreleased` to `## <x.y.z>` in `CHANGELOG.md`.
- `npm run build:lib`, then commit whatever it rewrote (usually `scripts/manifest/since.json`) with the version bump.
  Message: `chore: @sakaniui/react and @sakaniui/mcp <x.y.z>`.
- Push.

## 3. Check, then publish

```bash
npm login                      # only if `npm whoami` fails; opens the browser
npm run release                # dry run: every check and the build, publishes nothing
npm run release -- --publish   # the real thing
```

The dry run checks: on `main`, clean, in sync with origin; both packages at the same version; the changelog's newest
section is this version; which of the two are not on the registry yet; npm login; the build and the manifest
verification; and what each tarball would contain.

`--publish` then, in order: publishes `@sakaniui/react` (press Enter, approve in the browser), **waits until it is live**,
publishes `@sakaniui/mcp` the same way, tags `v<x.y.z>`, creates the GitHub release from the changelog section (if `gh`
is logged in), and records the commit that shipped in `scripts/manifest/releases.json`. That last file matters: without
it the manifest cannot tell which release a component first appeared in, and labels older components "new in <x.y.z>".

Run it in a terminal you are watching; it waits up to 30 minutes per package (react takes about 10 to go live).

## 4. Put it on sakani-docs

```bash
cd ~/Desktop/sakani-docs
node scripts/bump-library.mjs <x.y.z> --merge docs/<your-waiting-branch>
```

It refuses until the version is on the registry; then merges the waiting branch, installs the version, sets the
hero's "Last updated" badge to today, type-checks, builds, commits and pushes to `main`. Pass `--no-push` to stop
before the push. Or run `npm run release -- --publish --docs ~/Desktop/sakani-docs` to chain it.

## When something goes wrong

| You see | It means | Do |
| --- | --- | --- |
| `E404` on the PUT | Your npm login expired. | `npm login`, run again. |
| `E409 previously staged version` | The version is already submitted; the registry is catching up. | **Do not publish again.** Wait, and watch `npm view @sakaniui/react versions`. The release script already does this. |
| A publish sits at "Press ENTER to open in the browser" | It is waiting for you. | Press Enter and approve. If you ran it twice, `Ctrl+C` the second. |
| The docs deploy fails on an unknown prop | The docs were pushed before the version was live. | Revert the docs commit, wait for the registry, push again. |
| Manifest says a component is new in this release but it is not | `releases.json` is missing the previous release's commit. | Add `"<prev>": "<full sha that was published>"` to `scripts/manifest/releases.json`. |

## CI

`.github/workflows/ci.yml` runs on every pull request and push to `main`: type-check, lint, and the library build with
its manifest verification. A release should find no problem CI has not already found.
