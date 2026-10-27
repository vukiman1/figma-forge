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

The server talks to the Figma Forge Figma plugin running in your Figma app. See the [main repository](https://github.com/vukiman1/figma-forge) for the full setup (installing the plugin, connecting, and the available skills).

## Requirements

- Node.js 20.19+ or 22.12+ (the server runs via `npx` as its own process, independent of your project's Node version)

## Links

- Repository & docs: https://github.com/vukiman1/figma-forge
- Issues: https://github.com/vukiman1/figma-forge/issues

## License

[MIT](https://github.com/vukiman1/figma-forge/blob/main/LICENSE)
