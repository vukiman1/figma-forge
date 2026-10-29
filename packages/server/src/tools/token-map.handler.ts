import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { tokenMapParams } from '@figma-forge/core';
import {
  GET_STYLES_TOOL_NAME,
  GET_VARIABLE_DEFS_TOOL_NAME,
  type GetStylesResult,
  type GetVariableDefsResult,
} from '@figma-forge/core';

import { joinTokens, parseTokenMapFile, type TokenMapping } from '../join/token-map.js';
import { analyzeProject, isUtilityFirst, type ProjectProfile } from '../profile/profile.js';
import { resolveFigmaTokens, resolvePaintStyleTokens } from '../tokens/figma-tokens.js';
import { loadProjectTokens } from '../tokens/load.js';

const DEFAULT_THRESHOLD = 0.7;

const MAP_FILE = 'docs/figma-token-map.md';

const readOverrides = async (rootDir: string): Promise<ReturnType<typeof parseTokenMapFile>> => {
  try {
    return parseTokenMapFile(await readFile(join(rootDir, MAP_FILE), 'utf8'));
  } catch {
    return new Map();
  }
};

export interface TokenMapResult {
  /**
   * `'DISPLAY_P3'` when the document is a Display P3 file, whose variable values — every figmaValue
   * and figmaModes hex below — are P3 colours; absent otherwise. A value match against a project
   * token then means equal numbers in different spaces: the token still wins, but the design
   * renders more saturated than it.
   */
  colorProfile?: 'DISPLAY_P3';
  mappings: TokenMapping[];
  /** Figma token names with no project token candidate ≥ 0.5 — the gap to define. */
  unmapped: string[];
  /**
   * The file's theme axes: every variable collection with more than one mode (e.g. Light/Dark),
   * with its mode names and default. Mappings whose variable actually changes per mode carry the
   * per-theme values on figmaModes; this is the file-level summary that says themes exist at all.
   */
  themedCollections: { name: string; modes: string[]; defaultMode: string }[];
  profile: ProjectProfile;
  /** Repo-relative token source that was parsed, or null when none was usable. */
  tokenSource: string | null;
  projectTokenCount: number;
  /**
   * Docs/figma-token-map.md rows whose recorded ref no longer resolves to a project token
   * (renamed/removed). The mapping degraded to the normal join; re-record or remove the row.
   * Present only when at least one row is stale.
   */
  staleOverrides?: { figmaName: string; ref: string }[];
  /**
   * How the token pool was assembled, when that isn't just "read the detected source": which files
   * were aggregated, how much of a Tailwind config could not be read statically, or why no source
   * was usable at all.
   */
  note?: string;
}

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

/**
 * Orchestrate the token join: pull the document's variables (reusing get_variable_defs — no
 * dedicated plugin handler), detect the project profile, load its design tokens (tokens/load.ts,
 * shared with the design-context value annotation), and join. Filesystem + dispatch live here; the
 * matching itself is pure (join/token-map.ts).
 */
export const handleTokenMap = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<TokenMapResult> => {
  const args = tokenMapParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();
  const threshold = args.threshold ?? DEFAULT_THRESHOLD;

  // Styles are an additive source, not a requirement: a get_styles failure must not take down the
  // variable join that succeeded before styles existed — degrade to variables-only instead.
  const [defs, styles, profile, overrides] = await Promise.all([
    dispatch(GET_VARIABLE_DEFS_TOOL_NAME, {}) as Promise<GetVariableDefsResult>,
    (dispatch(GET_STYLES_TOOL_NAME, {}) as Promise<GetStylesResult>).catch((): GetStylesResult => ({
      paints: [],
      texts: [],
      effects: [],
      grids: [],
    })),
    analyzeProject(rootDir),
    readOverrides(rootDir),
  ]);

  const loaded = await loadProjectTokens(rootDir, profile, args.tokenSource);

  // Variables first, then paint-style pseudo-tokens: a pre-variables file (palette carried as
  // shared paint styles, zero variables) joins too instead of coming back empty.
  const figmaTokens = [...resolveFigmaTokens(defs), ...resolvePaintStyleTokens(styles.paints)];
  const mappings = joinTokens(figmaTokens, loaded.tokens, {
    threshold,
    utilityFirst: isUtilityFirst(profile.styling.system),
    ...(overrides.size > 0 ? { overrides } : {}),
  });
  const unmapped = mappings.filter(m => m.status === 'unmapped').map(m => m.figmaName);
  // Stale rows (recorded ref no longer resolves) that degraded to the normal join — surfaced so the
  // caller can re-record or delete them, keeping the map file self-healing.
  const staleOverrides = mappings.flatMap(m =>
    m.staleOverride === undefined ? [] : [{ figmaName: m.figmaName, ref: m.staleOverride.ref }],
  );
  const themedCollections = defs.collections
    .filter(c => c.modes.length > 1)
    .map(c => ({
      name: c.name,
      modes: c.modes.map(m => m.name),
      defaultMode: c.modes.find(m => m.modeId === c.defaultModeId)?.name ?? c.modes[0]?.name ?? '',
    }));

  return {
    // The variables' values (and so every figmaValue / figmaModes below) are P3 in a P3 document.
    ...(defs.colorProfile === undefined ? {} : { colorProfile: defs.colorProfile }),
    mappings,
    unmapped,
    themedCollections,
    profile,
    tokenSource: loaded.source,
    projectTokenCount: loaded.tokens.length,
    ...(staleOverrides.length > 0 ? { staleOverrides } : {}),
    ...(loaded.note === undefined ? {} : { note: loaded.note }),
  };
};
