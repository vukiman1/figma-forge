import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  GET_STYLES_TOOL_NAME,
  GET_VARIABLE_DEFS_TOOL_NAME,
  GetStylesResultSchema,
  GetVariableDefsResultSchema,
  tokenMapParams,
  type GetStylesResult,
  type GetVariableDefsResult,
} from '@figma-forge/core';

import { joinTokens, parseTokenMapFile, type TokenMapping } from '../join/token-map.js';
import { analyzeProject, type ProjectProfile } from '../profile/project-profile.js';
import { isUtilityFirst } from '../profile/styling-system.js';
import { resolveFigmaTokens, resolvePaintStyleTokens } from '../tokens/figma-tokens.js';
import { loadProjectTokens } from '../tokens/load.js';

const DEFAULT_THRESHOLD = 0.7;
const MAP_FILE = 'docs/figma-token-map.md';
const EMPTY_STYLES: GetStylesResult = { paints: [], texts: [], effects: [], grids: [] };

interface ThemedCollection {
  name: string;
  modes: string[];
  defaultMode: string;
}

interface StaleOverride {
  figmaName: string;
  ref: string;
}

export interface TokenMapResult {
  colorProfile?: 'DISPLAY_P3';
  mappings: TokenMapping[];
  unmapped: string[];
  themedCollections: ThemedCollection[];
  profile: ProjectProfile;
  tokenSource: string | null;
  projectTokenCount: number;
  staleOverrides?: StaleOverride[];
  note?: string;
}

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

const isFileNotFound = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const readOverrides = async (rootDir: string): Promise<ReturnType<typeof parseTokenMapFile>> => {
  const file = join(rootDir, MAP_FILE);
  try {
    return parseTokenMapFile(await readFile(file, 'utf8'));
  } catch (error: unknown) {
    if (isFileNotFound(error)) return new Map();
    throw new Error(`failed to read token map overrides from ${file}`, { cause: error });
  }
};

const loadVariableDefs = async (dispatch: ToolDispatcher): Promise<GetVariableDefsResult> =>
  GetVariableDefsResultSchema.parse(await dispatch(GET_VARIABLE_DEFS_TOOL_NAME, {}));

const loadStyles = async (dispatch: ToolDispatcher): Promise<GetStylesResult> => {
  try {
    return GetStylesResultSchema.parse(await dispatch(GET_STYLES_TOOL_NAME, {}));
  } catch {
    return EMPTY_STYLES;
  }
};

const themedCollectionsOf = (defs: GetVariableDefsResult): ThemedCollection[] =>
  defs.collections
    .filter(collection => collection.modes.length > 1)
    .map(collection => ({
      name: collection.name,
      modes: collection.modes.map(mode => mode.name),
      defaultMode:
        collection.modes.find(mode => mode.modeId === collection.defaultModeId)?.name ??
        collection.modes[0]?.name ??
        '',
    }));

const staleOverridesOf = (mappings: readonly TokenMapping[]): StaleOverride[] =>
  mappings.flatMap(mapping =>
    mapping.staleOverride === undefined
      ? []
      : [{ figmaName: mapping.figmaName, ref: mapping.staleOverride.ref }],
  );

export const handleTokenMap = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<TokenMapResult> => {
  const args = tokenMapParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();
  const [defs, styles, profile, overrides] = await Promise.all([
    loadVariableDefs(dispatch),
    loadStyles(dispatch),
    analyzeProject(rootDir),
    readOverrides(rootDir),
  ]);
  const loaded = await loadProjectTokens(rootDir, profile, args.tokenSource);
  const figmaTokens = [...resolveFigmaTokens(defs), ...resolvePaintStyleTokens(styles.paints)];
  const mappings = joinTokens(figmaTokens, loaded.tokens, {
    threshold: args.threshold ?? DEFAULT_THRESHOLD,
    utilityFirst: isUtilityFirst(profile.styling.system),
    ...(overrides.size > 0 ? { overrides } : {}),
  });
  const staleOverrides = staleOverridesOf(mappings);
  return {
    ...(defs.colorProfile === undefined ? {} : { colorProfile: defs.colorProfile }),
    mappings,
    unmapped: mappings
      .filter(mapping => mapping.status === 'unmapped')
      .map(mapping => mapping.figmaName),
    themedCollections: themedCollectionsOf(defs),
    profile,
    tokenSource: loaded.source,
    projectTokenCount: loaded.tokens.length,
    ...(staleOverrides.length > 0 ? { staleOverrides } : {}),
    ...(loaded.note === undefined ? {} : { note: loaded.note }),
  };
};
