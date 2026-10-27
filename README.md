# Figma Forge

A two-way Figma MCP server. A coding agent reads a Figma file as structured design context and edits the canvas through a Figma plugin.

Figma Forge is a hard fork of [Figwright](https://github.com/awdr74100/figwright) (MIT, © Roya).

## Setup

You need Node.js 24.11+, pnpm 12 and the Figma desktop app.

1. Build from source:

   ```bash
   pnpm install && pnpm build
   ```

2. Add the server to your MCP client:

   ```json
   {
     "mcpServers": {
       "figma-forge": {
         "command": "node",
         "args": ["/path/to/figma-forge/packages/mcp/dist/index.mjs"]
       }
     }
   }
   ```

3. In Figma, go to **Plugins → Development → Import plugin from manifest…** and pick `packages/plugin/manifest.json`. Open **Figma Forge** and wait for the panel to show **Connected**.
4. Ask your agent to run `ping`.

The relay listens on `127.0.0.1:3056`.

## Development

Run the same checks CI runs:

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm knip && pnpm build && pnpm test
```

After you change the server, rebuild and reconnect your MCP client. After you change the plugin, rebuild and run the plugin again.

Conventions are in [AGENTS.md](./AGENTS.md).

## License

MIT. See [LICENSE](./LICENSE).
