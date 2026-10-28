---
name: sakaniui
description: Build and edit UI with SakaniUI (@sakaniui/react), a React design system with components, blocks, icons, emoji, design tokens, dark mode and glass surfaces. Use whenever the user asks for a screen, page, form, dashboard, modal, table or any interface in a project that depends on @sakaniui/react, or when they mention SakaniUI, Sakani UI or its MCP server, or ask for an icon or emoji from it.
---

# SakaniUI

SakaniUI (`@sakaniui/react`) is a token-driven React design system. It ships its own machine-readable
contract, so look things up instead of writing them from memory. This skill only tells you where to look.

## 1. Find the contract

Use the first source that is available.

1. **MCP server** (`sakaniui`), if its tools are connected: `search_components`, `get_component`,
   `search_icons`, `search_emoji`, `check_code`, `check_usage`, `get_tokens`, `get_guide`,
   `check_compatibility`, `get_changelog`. If it is not connected, tell the user it is one command
   (`claude mcp add sakaniui -- npx -y @sakaniui/mcp`) and carry on with the sources below.
2. **The installed package**: `node_modules/@sakaniui/react/dist/manifest.json` (every component, prop, type,
   default, required prop and token) and `node_modules/@sakaniui/react/AGENTS.md` (why, and when not to use
   a component). They match the installed version exactly.
3. **The web**: https://www.sakaniui.com/llms.txt and https://www.sakaniui.com/llms-full.txt.

If a component, prop, value or token is not in the manifest, it does not exist. Do not invent it.

## 2. Workflow

1. **Check the project.** Read `package.json` for `@sakaniui/react` and its version. If it is missing, install
   it (`npm install @sakaniui/react`). If the project is older than a component you want, run
   `check_compatibility` or compare `since` in the manifest, and say so rather than using it.
2. **Check the setup.** Both stylesheets must be imported once at the app root, or everything renders unstyled:
   ```tsx
   import '@sakaniui/react/tokens.css';
   import '@sakaniui/react/style.css';
   ```
3. **Find the component.** Search by the name you would normally use (dialog, snackbar, navbar, date picker);
   the server maps it to the real one. Start from the component's `example`, not from memory.
4. **Icons and emoji: look them up, never guess.** Icons are `IconTrash` from `@sakaniui/react/icons`, passed as
   `icon={IconTrash}`. Emoji are `EmojiRocket` from `@sakaniui/react/emoji`. Use `search_icons` and
   `search_emoji`, or `dist/icon-index.json` and `dist/emoji-index.json` in the package.
5. **Style with tokens.** Use `var(--color-…)` and the other CSS variables from `get_tokens`, not hex values,
   pixel literals or utility classes the project may not have. Dark mode is `className="dark"` on a container;
   glass is `data-surface="glass" | "liquid"`. Do not write per-component dark styles.
6. **Check before you answer.** Run `check_code` on every snippet. Without the server, confirm each prop and
   token against the manifest and set every `contract.requiredProps` entry.

## 3. Rules that are easy to get wrong

- One `primary` Button per view. No hand-styled `<button>` where `Button` fits.
- An icon-only control needs its accessible name (`aria-label`); do not drop it.
- Object props (`columns`, `items`, `options`, `plans`) take objects with exactly the fields in the prop's
  `shape`.
- Behaviour the system does not supply (data fetching, routing, validation rules) is yours to write. Say
  where you composed something the system does not provide.
- When nothing fits, read `get_guide` (or section 3 of `AGENTS.md`) before building a one-off.

## 4. Before you finish

Both stylesheets imported once, tokens instead of literals, every icon-only control named, every prop and token
present in the manifest, and the result looks right inside `className="dark"`.
