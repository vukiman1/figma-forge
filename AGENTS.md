# AGENTS.md

## Architecture

Hexagonal. Dependencies point inward only.

| Package  | Role                                                                                              | May import                    |
| -------- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| `core`   | Pure domain: wire protocol, schemas, colour, geometry, design context, tokens, diff, tool schemas | `zod`                         |
| `server` | Adapters: MCP stdio, websocket relay, leader election, local file tools                           | `core`, Node, MCP SDK         |
| `plugin` | Adapters: Figma sandbox handlers, serializer, Vue panel                                           | `core`, Figma Plugin API, Vue |

`server` and `plugin` never import each other. Plugin handlers receive `figma` as a parameter (`createXHandler(figmaCtx)`), so the Plugin API stays the port.

The migration is in progress: `packages/server` (published as `@figma-forge/mcp`) is being brought under the strict rules. The strict checks (`.oxlintrc.strict.json`, `pnpm comments:check`) cover migrated paths only; legacy paths are listed there and drop off as they move.

## Rules

- No comments. The only exceptions are a lint suppression with its reason (`// oxlint-disable-next-line rule -- reason`) and `@ts-expect-error`. Record Figma quirks in test names instead. Enforced by `pnpm comments:check`.
- Files stay under 150 lines, functions under 40 lines, nesting under 3 levels. Enforced by oxlint.
- No `any`. `as` is allowed only to narrow `unknown` coming from JSON or the Figma API.
- Plugin handlers parse their params with the tool's schema from `core`. Don't check types by hand.
- A tool is defined once in `core/src/tools/<group>/<tool>.ts`: its name, its params schema (`<tool>Params`) and its spec. The code that runs it is `<tool>.handler.ts`, in `server` for local tools and in `plugin` for Figma calls.
- A tool description is a prompt that agents read, not a comment. Keep it short and exact.
- Tests live in `test/`, mirroring `src/`. A test name states the behaviour.
- Layer boundaries are enforced by `pnpm deps:check` (dependency-cruiser).

## Commands

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm knip && pnpm deps:check && pnpm comments:check && pnpm build && pnpm test
```

`packages/server/test/e2e` runs against the built `dist`, so run `pnpm build` before `pnpm test`.

## Commits

`type(scope): subject` in lowercase. Scopes: `codegen`, `design`, `grounding`, `tools`, `relay`, `plugin`, `deps`, `repo`. Work lands on `dev`; `main` holds stable releases.
