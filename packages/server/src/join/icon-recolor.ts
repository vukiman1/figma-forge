import type { SvgColorContract } from '../icons/repo-icons.js';
import type { ProjectProfile } from '../profile/project-profile.js';

const currentColorGuidance = (svg: ProjectProfile['svg'], isUtilityFirst: boolean): string => {
  if (svg.mode !== 'component') {
    return "currentColor can't apply through an <img> (url mode) — inline the svg or add an svg loader to recolor, else it renders with no color";
  }
  const colorTarget = isUtilityFirst
    ? 'text-{token}'
    : 'the CSS `color` property (or var(--token))';
  return `recolorable — set ${colorTarget} at the usage site (fill is currentColor); it also inherits the parent's text color`;
};

export const recolorGuidance = (
  contract: SvgColorContract,
  svg: ProjectProfile['svg'],
  isUtilityFirst: boolean,
): string => {
  switch (contract) {
    case 'currentColor':
      return currentColorGuidance(svg, isUtilityFirst);
    case 'fixed':
      return 'single fixed color baked into the file — not recolorable via CSS; if the Figma fill differs, convert its fills to currentColor or re-export';
    case 'multi-color':
      return 'multi-color asset — render as-is, do not recolor';
    case 'unknown':
      return 'color contract unclear (no explicit fill or currentColor found) — inspect the svg before relying on recolor';
    default:
      throw new Error('Unsupported SVG color contract');
  }
};
