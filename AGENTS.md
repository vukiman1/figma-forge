# AGENTS.md

## Architecture

Hexagonal. Dependencies point inward only.

| Package  | Role                                                                                              | May import                    |
| -------- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| `core`   | Pure domain: wire protocol, schemas, colour, geometry, design context, tokens, diff, tool schemas | `zod`                         |
| `server` | Adapters: MCP stdio, websocket relay, leader election, local file tools                           | `core`, Node, MCP SDK         |
| `plugin` | Adapters: Figma sandbox handlers, serializer, Vue panel                                           | `core`, Figma Plugin API, Vue |

`server` and `plugin` never import each other. Plugin handlers receive `figma` as a parameter (`createXHandler(figmaCtx)`), so the Plugin API stays the port.

The migration is in progress. `packages/shared` and `packages/mcp` are being moved into `core` and `server`.

## Rules

- No comments. The only exceptions are a lint suppression with its reason (`// oxlint-disable-next-line rule -- reason`) and `@ts-expect-error`. Record Figma quirks in test names instead.
- Files stay under 150 lines, functions under 40 lines, nesting under 3 levels.
- No `any`. `as` is allowed only to narrow `unknown` coming from JSON or the Figma API.
- Plugin handlers parse their params with the tool's schema from `core`. Don't check types by hand.
- Name files by role: `*.schema.ts` (tool params), `*.spec.ts` (tool description for agents), `*.handler.ts` (plugin), `*.adapter.ts`, `*.test.ts`.
- A tool description in `*.spec.ts` is a prompt that agents read, not a comment. Keep it short and exact.
- Tests live in `test/`, mirroring `src/`. A test name states the behaviour.

## Commands

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm knip && pnpm build && pnpm test
```

`packages/mcp/test/e2e` runs against the built `dist`, so run `pnpm build` before `pnpm test`.

## Commits

`type(scope): subject` in lowercase. Scopes: `codegen`, `design`, `grounding`, `tools`, `relay`, `plugin`, `deps`, `repo`. Work lands on `dev`; `main` holds stable releases.
