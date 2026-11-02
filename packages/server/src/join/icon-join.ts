import type { RepoSvg } from '../icons/repo-icons.js';
import { casefold } from './casefold.js';
import { diceSimilarity } from './dice-similarity.js';
import { iconLabel } from './icon-label.js';
import type { FigmaIconUsage, IconJoinOptions, IconMapping } from './icon-mapping.js';
import { recolorGuidance } from './icon-recolor.js';
import { statusFor } from './status.js';

const ICON_MATCH_FLOOR = 0.85;

interface SvgMatch {
  svg: RepoSvg;
  score: number;
}

const scoreSvg = (target: string, svg: RepoSvg): number =>
  Math.max(
    diceSimilarity(target, casefold(svg.fileName)),
    diceSimilarity(target, casefold(iconLabel(svg.fileName))),
  );

const findBestSvg = (label: string, svgs: readonly RepoSvg[]): SvgMatch | null => {
  const target = casefold(label);
  let best: SvgMatch | null = null;
  for (const svg of svgs) {
    const score = scoreSvg(target, svg);
    if (best === null || score > best.score) best = { svg, score };
  }
  return best;
};

const createBaseMapping = (icon: FigmaIconUsage): IconMapping => ({
  figmaName: icon.figmaName,
  name: icon.name,
  nodeIds: icon.nodeIds,
  ...(icon.fill === undefined ? {} : { fill: icon.fill }),
  status: 'unmapped',
});

const joinIcon = (
  icon: FigmaIconUsage,
  svgs: readonly RepoSvg[],
  options: IconJoinOptions,
): IconMapping => {
  const base = createBaseMapping(icon);
  const match = findBestSvg(icon.name, svgs);
  if (match === null || match.score < ICON_MATCH_FLOOR) return base;
  const confidence = Number(match.score.toFixed(3));
  return {
    ...base,
    candidate: {
      filePath: match.svg.path,
      colorContract: match.svg.colorContract,
      recolor: recolorGuidance(match.svg.colorContract, options.svg, options.utilityFirst),
      confidence,
    },
    status: statusFor(confidence, options.threshold),
  };
};

export const joinIcons = (
  icons: readonly FigmaIconUsage[],
  svgs: readonly RepoSvg[],
  options: IconJoinOptions,
): IconMapping[] => icons.map(icon => joinIcon(icon, svgs, options));
