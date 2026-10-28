import {
  GET_DESIGN_CONTEXT_TOOL_NAME,
  type GetDesignContextResult,
  iconMapParams,
} from '@figma-forge/core';

import { detectIconLibraries, scanRepoSvgs } from '../icons/repo-icons.js';
import { collectFigmaIcons, type IconMapping, joinIcons } from '../join/icon-map.js';
import {
  analyzeProject,
  isUtilityFirst,
  type ProjectProfile,
  readProjectDeps,
} from '../profile/profile.js';
import { truncationNote } from '../repo-walk.js';

const DEFAULT_THRESHOLD = 0.7;

export interface IconMapResult {
  mappings: IconMapping[];
  /**
   * Figma icon names with no `.svg` match — export fresh (get_screenshot SVG) or use an icon
   * library.
   */
  unmapped: string[];
  /**
   * Icon component libraries detected in the project (lucide / heroicons / iconify …). The
   * alternative route for unmapped icons: import from one of these instead of exporting. Empty when
   * none installed, in which case unmapped icons fall back to a fresh get_screenshot SVG export.
   */
  iconLibraries: string[];
  profile: ProjectProfile;
  svgFileCount: number;
  /**
   * Present only when the walk's file cap was reached: says the result covers a subset of the repo,
   * so an absent match reads as "not in the part that was read" rather than "not in the project".
   */
  truncationNote?: string;
}

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

/**
 * Orchestrate the icon join: pull the grounded Figma tree (reusing get_design_context — no
 * dedicated plugin handler), scan the repo's `.svg` files + detect icon libraries, and join.
 * Filesystem + dispatch live here; the matching itself is pure (join/icon-map.ts).
 */
export const handleIconMap = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<IconMapResult> => {
  const args = iconMapParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();
  const threshold = args.threshold ?? DEFAULT_THRESHOLD;

  const contextArgs: Record<string, unknown> = { detail: 'full', dedupeComponents: true };
  if (args.nodeId !== undefined) contextArgs.nodeId = args.nodeId;

  const [context, profile, svgs, deps] = await Promise.all([
    dispatch(GET_DESIGN_CONTEXT_TOOL_NAME, contextArgs) as Promise<GetDesignContextResult>,
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
