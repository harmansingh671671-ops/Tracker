# .mcp-servers — dedicated OpenCode MCP install

OpenCode's `playwright` and `rea` MCP servers run from this folder, launched as
`node <entry script>` straight from these local packages. This makes them
independent of:

- `npx` (slow ~5-10s startup, caused "Request timed out" on Windows)
- the npm global folder (`%APPDATA%\npm\node_modules`), which node/npm
  reinstalls and version switches wipe
- accidental package updates breaking behavior mid-project

At `2026-10-29`, versions are pinned: `@playwright/mcp@0.0.83`, `rea-agents@6.5.0`.

## Config

`~/.config/opencode/opencode.jsonc` is the single OpenCode config. Its
`mcp.servers.*` entries point `node` at the entry scripts here:

- playwright: `node_modules/@playwright/mcp/cli.js`
- rea: `node_modules/rea-agents/scripts/rea.mjs --mcp` (the `--mcp` global flag
  starts REA's stdio server; bare `mcp` is a management command that just
  prints usage — that mistake is how the timeout bug started)

`fleet` is a separate server; it stays a plain script.

## If it breaks

Run `reinstall.cmd` in this folder. It reinstalls the pinned versions from
`package.json`, verifies both servers answer an MCP `initialize` handshake, and
tells you what to sanity check next (`opencode mcp list` → all "connected").

## Upgrading

1. Bump the version in `package.json` (playwright tracks an alpha `0.0.x` line)
2. `npm install --no-audit --no-fund`
3. Run the two handshake commands from `reinstall.cmd`, or just `opencode mcp list`
