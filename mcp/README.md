# @sakaniui/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for [SakaniUI](https://www.sakaniui.com).
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

## Tools

| Tool | What it does |
|---|---|
| `search_components` | find a component or block by what you need |
| `get_component` | full contract for one: props, types, allowed values, required props, and a type-checked `example` |
| `list_components` | browse everything, by kind or category |
| `search_icons` | find real icon names by meaning ("delete" gives `IconTrash`) |
| `check_code` | check a whole snippet: imports, required props, allowed values, icon names (the code is read, never run) |
| `check_usage` | check one component's props |
| `get_tokens` | the design tokens that exist |
| `get_guide` | sections of the AGENTS.md guide |
| `check_compatibility` | compare the reference with the version installed in your project |
| `get_changelog` | release notes for a version, or everything since yours |

## Matches your version

It finds the `@sakaniui/react` installed in your project (the folder it runs in, or `--project <dir>`) and
flags components your version does not have yet. Without a project install it answers for the version
this package was published with.

## Safe

It reads five fixed files and writes nothing, runs nothing and opens no network connection. It takes no
file paths, every argument is validated, and every tool is marked read-only.

Docs: https://www.sakaniui.com/docs/ai · Library: https://www.npmjs.com/package/@sakaniui/react
