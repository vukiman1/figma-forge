import {
  GET_DESIGN_CONTEXT_TOOL_NAME,
  GetDesignContextResultSchema,
  iconMapParams,
} from '@figma-forge/core';

import { detectIconLibraries, scanRepoSvgs } from '../icons/repo-icons.js';
import { collectFigmaIcons, type IconMapping, joinIcons } from '../join/icon-map.js';
import { readProjectDeps } from '../profile/package-manifest.js';
import { analyzeProject, type ProjectProfile } from '../profile/project-profile.js';
import { isUtilityFirst } from '../profile/styling-system.js';
import { truncationNote } from '../repo-walk.js';

const DEFAULT_THRESHOLD = 0.7;

export interface IconMapResult {
  mappings: IconMapping[];
  unmapped: string[];
  iconLibraries: string[];
  profile: ProjectProfile;
  svgFileCount: number;
  truncationNote?: string;
}

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

const loadDesignContext = async (
  dispatch: ToolDispatcher,
  nodeId: string | undefined,
): Promise<ReturnType<typeof GetDesignContextResultSchema.parse>> => {
  const contextArgs: Record<string, unknown> = { detail: 'full', dedupeComponents: true };
  if (nodeId !== undefined) contextArgs.nodeId = nodeId;
  return GetDesignContextResultSchema.parse(
    await dispatch(GET_DESIGN_CONTEXT_TOOL_NAME, contextArgs),
  );
};

export const handleIconMap = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<IconMapResult> => {
  const args = iconMapParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();
  const threshold = args.threshold ?? DEFAULT_THRESHOLD;

  const [context, profile, svgs, deps] = await Promise.all([
    loadDesignContext(dispatch, args.nodeId),
    analyzeProject(rootDir),
    scanRepoSvgs(rootDir),
    readProjectDeps(rootDir),
  ]);

  const icons = collectFigmaIcons(context.nodes);
  const mappings = joinIcons(icons, svgs.svgs, {
    threshold,
    svg: profile.svg,
    utilityFirst: isUtilityFirst(profile.styling.system),
  });
  const unmapped = mappings.filter(m => m.status === 'unmapped').map(m => m.name);

  return {
    mappings,
    unmapped,
    iconLibraries: detectIconLibraries(deps),
    profile,
    svgFileCount: svgs.svgs.length,
    ...(svgs.omitted > 0 ? { truncationNote: truncationNote('.svg files', svgs.omitted) } : {}),
  };
};
