# @figma-forge/mcp

> The MCP server for **[Figma Forge](https://github.com/vukiman1/figma-forge)**: a two-way Figma agent for Claude Code, Cursor, Codex, and other MCP clients.

Figma Forge bridges MCP clients to a Figma plugin over a local WebSocket relay, so an AI agent can both **read** your designs with high-fidelity grounding and **write** back to the canvas. No Figma paid tier required. The server exposes **135 tools** spanning reads, writes, and codebase-grounded context.

## Usage

Add it to your MCP client config (e.g. Claude Code's `.mcp.json`):

```json
{
  "mcpServers": {
    "figma-forge": {
      "command": "npx",
      "args": ["-y", "@figma-forge/mcp@latest"]
    }
  }
}
```

The plugin ships inside this package. Each time the server starts it copies the plugin to `~/Figma Forge/`, updating it when the server is newer. Import it once in the Figma desktop app: **Plugins → Development → Import plugin from manifest…** and pick `~/Figma Forge/manifest.json`. Then run **Figma Forge** in your file and wait for **Connected**. If the plugin is not connected, the `ping` tool repeats these steps.

Set `FIGMA_FORGE_PLUGIN_DIR` to copy the plugin somewhere else.

## Requirements

- Node.js 24.11+ (the server runs via `npx` as its own process, independent of your project's Node version)
- The Figma desktop app (the browser version cannot import plugins)

## Links

- Repository & docs: https://github.com/vukiman1/figma-forge
- Issues: https://github.com/vukiman1/figma-forge/issues

## License

[MIT](https://github.com/vukiman1/figma-forge/blob/main/LICENSE)
