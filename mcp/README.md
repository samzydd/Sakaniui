# @sakaniui/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for [SakaniUI](https://www.sakaniui.com),
the open-source React design system with 1500+ components and variants.
It lets an AI assistant (Claude Code, Cursor, Windsurf, Claude Desktop, ...) look the design system up
instead of guessing: components, props, allowed values, tokens and icons, plus a checker for the code it
writes.

Read-only, no dependencies, starts in about a second.

## Add it

Claude Code:

```bash
claude mcp add sakaniui -- npx -y @sakaniui/mcp
```

Any MCP client (Cursor, Windsurf, Claude Desktop, ...), or a `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "sakaniui": { "command": "npx", "args": ["-y", "@sakaniui/mcp"] }
  }
}
```

**Windows:** `npx` is a `.cmd` script there, so launch it through `cmd /c`:

```json
{ "mcpServers": { "sakaniui": { "command": "cmd", "args": ["/c", "npx", "-y", "@sakaniui/mcp"] } } }
```

and in Claude Code: `claude mcp add sakaniui -- cmd /c npx -y @sakaniui/mcp`.

Needs Node.js 18 or later. Check it is connected in your editor's MCP list (in Claude Code: `/mcp`): `sakaniui` should
show 10 tools.

## Tools

| Tool | What it does |
|---|---|
| `search_components` | find a component or block by what you need |
| `get_component` | full contract for one: props, types, allowed values, required props, and a type-checked `example` |
| `list_components` | browse everything, by kind or category |
| `search_icons` | find real icon names by meaning ("delete" gives `IconTrash`) |
| `check_code` | check a whole snippet: imports, required props, allowed values, icon names, and the field names of object props like table columns (the code is read, never run) |
| `check_usage` | check one component's props |
| `get_tokens` | the design tokens that exist |
| `get_guide` | sections of the AGENTS.md guide |
| `check_compatibility` | compare the reference with the version installed in your project |
| `get_changelog` | release notes for a version, or everything since yours |

## Troubleshooting

Run this in a terminal first. It checks Node, the data, the tools and your project, and prints a report you can
paste when asking for help:

```bash
npx -y @sakaniui/mcp --doctor
```

| Symptom | Fix |
|---|---|
| `spawn npx ENOENT`, or the editor cannot start it | Desktop editors often start with a smaller `PATH` than your terminal (common with nvm and Homebrew). Use the full path: run `which npx` (macOS/Linux) or `where npx` (Windows) and put that in `"command"`, e.g. `"/opt/homebrew/bin/npx"`. |
| Windows | `npx` is a `.cmd` script: use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@sakaniui/mcp"]`. |
| Connects, but tool calls fail (before 0.8.13) | Node older than 16.9. Update Node (18 or later is supported), or use `@sakaniui/mcp@latest`. |
| "Node.js ... is too old" | Install Node 18 or later: https://nodejs.org (check with `node --version`). |
| Times out on the first start | The first run downloads about 200 kB. Run `npx -y @sakaniui/mcp --version` once in a terminal to warm the cache, then restart the editor. |
| Behind a company proxy or private npm registry | The machine must reach `registry.npmjs.org` (check `npm config get registry`) and `@sakaniui/*` packages must be allowed. |
| Odd `npx` errors, or an old version keeps running | Delete the `_npx` folder inside your npm cache (find it with `npm config get cache`), then restart the editor. |
| Added it but no tools appear | Restart the editor. In Claude Code run `/mcp` and look for `sakaniui` with 10 tools. |
| `Failed to connect` after typing the command by hand | Check the package name for a full-width `＠` or stray characters; copy the command from here instead. |

## Matches your version

It finds the `@sakaniui/react` installed in your project (the folder it runs in, or `--project <dir>`) and
flags components your version does not have yet. Without a project install it answers for the version
this package was published with.

## Safe

It reads five fixed files and writes nothing, runs nothing and opens no network connection. It takes no
file paths, every argument is validated, and every tool is marked read-only.

Docs: https://www.sakaniui.com/docs/ai · Library: https://www.npmjs.com/package/@sakaniui/react
