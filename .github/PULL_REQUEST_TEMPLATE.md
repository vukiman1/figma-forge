<!--
PR title: `type(scope): subject`, lowercase subject, scope one of `codegen`,
`design`, `grounding`, `tools`, `relay`, `plugin`, `deps`, `repo`.
-->

## Description

<!--
What is this PR solving, and why? Keep it clear and concise.
Link the issues it resolves, e.g. `Fixes #123`.
-->

## Checklist

- [ ] The canonical checks pass locally: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm knip && pnpm build && pnpm test`
- [ ] Tests are added or updated for any behavior change (in `test/` mirroring `src/`; cross-package tests in the root `test/`)
- [ ] Read-path / serializer changes are verified with a live round-trip against a real Figma file (plugin connected, running the built `dist`)
- [ ] Documentation is updated if needed (README, AGENTS.md, tool descriptions)
