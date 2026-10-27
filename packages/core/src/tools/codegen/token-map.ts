import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const TOKEN_MAP_TOOL_NAME = 'token_map';

export const tokenMapParams = z.object({
  rootDir: z.string().describe('Project root; defaults to the server cwd').optional(),
  tokenSource: z
    .string()
    .describe(
      'Path (relative to rootDir) to the file holding the tokens — a CSS file, a .scss file, or a ' +
        'Tailwind / UnoCSS config (.js/.cjs/.mjs/.ts), read according to its name; overrides detection',
    )
    .optional(),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence at/above which a match counts as reliable (default 0.7)')
    .optional(),
});

export const tokenMapTool: ToolSpec = {
  name: TOKEN_MAP_TOOL_NAME,
  description:
    "Map the document's Figma variables — and its shared paint styles (single solid color styles, " +
    "the design-token mechanism of pre-variables files; such rows carry source: 'style') — to the " +
    "project's design tokens, so generated code references " +
    'existing tokens instead of hard-coded values. Joins the grounded Figma names + values ' +
    "against the project's design tokens — parsed from its CSS (Tailwind v4 @theme or :root custom " +
    'properties), on a Tailwind v3 or UnoCSS project from the theme scales in its JS/TS config ' +
    '(whose tokens have no var() form: reference them by candidate.ref, the utility base), and on a ' +
    'SCSS project from its $variables. A SCSS candidate carries candidate.from, the file declaring ' +
    'it: candidate.ref does NOT resolve on its own — the consuming file must @use that file. from ' +
    'is REPO-relative and Sass resolves @use against the importing file, so re-resolve it from the ' +
    "file being written (from src/components/card.scss it is '../styles/tokens', never the " +
    'repo-relative path verbatim). `as *` keeps the ref as written; a namespaced @use requires ' +
    'prefixing the ref with that namespace. Emitting the ref without the import is a compile ' +
    'error. The ' +
    'match is name-based with an exact color value-match as confirmation. When several project ' +
    'tokens share the exact same color value and the name cannot pick one, the mapping is capped ' +
    "below 'high' and candidate.ambiguousWith lists the other same-value tokens — verify that pick " +
    'semantically instead of trusting it blindly. When the rival is the SAME name in another file ' +
    '(a SCSS layout with per-component variable files), candidate.ambiguousFrom lists those files ' +
    'instead: the ref is right and the declaring file is the open question, so confirm which one ' +
    'the design means before writing its @use. On a project with a utility framework (Tailwind ' +
    'or UnoCSS) a ' +
    'variable that hits a framework built-in scale (spacing/N, line-height/N, weight/*) is reported as ' +
    "status 'framework-builtin' with { builtin: { scale, step } } rather than unmapped — it has no " +
    '@theme token but the utility (p-4 / gap-4, leading-7, font-bold) is still usable. A variable in ' +
    'a multi-mode collection whose value differs per mode (a Light/Dark theme) carries figmaModes ' +
    '(mode name → value per theme; figmaValue is only the default mode), and the result lists ' +
    'themedCollections — keep such tokens theme-aware (a token that itself switches per theme, or ' +
    "the non-default values wired through the project's dark-mode mechanism), never just the " +
    'default-mode literal. tokenSource ' +
    'overrides the ' +
    'detected styling config; rootDir defaults to the server cwd. A JS-config theme built at ' +
    'runtime (spread from an imported palette, computed, or living in a preset) is only partly ' +
    'readable — the note says how much was skipped or whether the theme was reachable at all, and ' +
    'the project CSS is pooled alongside it either way. ' +
    'An explicit docs/figma-token-map.md row ' +
    '(FigmaName | ref) overrides the fuzzy join with matchedBy ["map-file"] — this file is the ' +
    'durable record a verified token mapping is written back to, so the next run reuses it instead ' +
    'of re-guessing an ambiguous or value-only match. A row whose ref no longer resolves to a ' +
    'project token is reported in staleOverrides and degrades to the normal join. Returns { mappings ' +
    '(candidate + confidence + status + matchedBy + builtin), unmapped, staleOverrides, tokenSource, ' +
    'profile }, led by colorProfile: "DISPLAY_P3" in a Display P3 file — its Figma values are P3 ' +
    'colours there, so a value match is equal numbers in different spaces: keep the token, but ' +
    'the design renders more saturated than it.',
  inputSchema: tokenMapParams,
  kind: 'local',
  serverOnlyArgs: null,
};
