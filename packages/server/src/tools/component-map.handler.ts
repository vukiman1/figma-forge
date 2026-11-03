import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  componentMapParams,
  GET_DESIGN_CONTEXT_TOOL_NAME,
  GetDesignContextResultSchema,
} from '@figma-forge/core';

import {
  collectFigmaComponents,
  type ComponentMapping,
  joinComponents,
  parseMapFile,
} from '../join/component-map.js';
import { analyzeProject, type ProjectProfile } from '../profile/project-profile.js';
import { truncationNote } from '../repo-walk.js';
import { scanComponents } from '../scan/scan-components.js';

const DEFAULT_THRESHOLD = 0.7;
const MAP_FILE = 'docs/figma-component-map.md';

interface StaleOverride {
  figmaComponentName: string;
  name: string;
  filePath: string;
}

export interface ComponentMapResult {
  mappings: ComponentMapping[];
  unmapped: string[];
  profile: ProjectProfile;
  scannedComponentCount: number;
  staleOverrides?: StaleOverride[];
  truncationNote?: string;
}

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

const isFileNotFound = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch (error: unknown) {
    if (isFileNotFound(error)) return false;
    throw new Error(`failed to access component override target ${path}`, { cause: error });
  }
};

const readMapFile = async (rootDir: string): Promise<ReturnType<typeof parseMapFile>> => {
  const file = join(rootDir, MAP_FILE);
  try {
    return parseMapFile(await readFile(file, 'utf8'));
  } catch (error: unknown) {
    if (isFileNotFound(error)) return new Map();
    throw new Error(`failed to read component map overrides from ${file}`, { cause: error });
  }
};

const readOverrides = async (
  rootDir: string,
): Promise<{ overrides: ReturnType<typeof parseMapFile>; overridesOnDisk: Set<string> }> => {
  const overrides = await readMapFile(rootDir);
  const uniquePaths = [...new Set([...overrides.values()].map(override => override.filePath))];
  const checks = await Promise.all(
    uniquePaths.map(async path => ({ path, exists: await fileExists(join(rootDir, path)) })),
  );
  const present = new Set(checks.filter(check => check.exists).map(check => check.path));
  const overridesOnDisk = new Set<string>();
  for (const [key, override] of overrides) {
    if (present.has(override.filePath)) overridesOnDisk.add(key);
  }
  return { overrides, overridesOnDisk };
};

const staleOverridesOf = (mappings: readonly ComponentMapping[]): StaleOverride[] =>
  mappings.flatMap(mapping =>
    mapping.staleOverride === undefined
      ? []
      : [{ figmaComponentName: mapping.figmaComponentName, ...mapping.staleOverride }],
  );

export const handleComponentMap = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<ComponentMapResult> => {
  const args = componentMapParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();
  const contextArgs = {
    detail: 'full',
    dedupeComponents: true,
    ...(args.nodeId === undefined ? {} : { nodeId: args.nodeId }),
  };
  const [contextResult, profile, { overrides, overridesOnDisk }] = await Promise.all([
    dispatch(GET_DESIGN_CONTEXT_TOOL_NAME, contextArgs),
    analyzeProject(rootDir),
    readOverrides(rootDir),
  ]);
  const context = GetDesignContextResultSchema.parse(contextResult);
  const scanned = await scanComponents(rootDir, profile.componentExtensions);
  const mappings = joinComponents(collectFigmaComponents(context.nodes), scanned.components, {
    threshold: args.threshold ?? DEFAULT_THRESHOLD,
    ...(overrides.size > 0 ? { overrides, overridesOnDisk } : {}),
  });
  const staleOverrides = staleOverridesOf(mappings);
  return {
    mappings,
    unmapped: mappings
      .filter(mapping => mapping.status === 'unmapped')
      .map(mapping => mapping.figmaComponentName),
    profile,
    scannedComponentCount: scanned.components.length,
    ...(staleOverrides.length > 0 ? { staleOverrides } : {}),
    ...(scanned.omitted > 0
      ? { truncationNote: truncationNote('source files', scanned.omitted) }
      : {}),
  };
};
