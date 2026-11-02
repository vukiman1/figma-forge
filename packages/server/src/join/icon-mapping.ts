import type { SvgColorContract } from '../icons/repo-icons.js';
import type { ProjectProfile } from '../profile/project-profile.js';
import type { MappingStatus } from './status.js';

export interface IconFill {
  hex?: string;
  variable?: boolean;
}

export interface FigmaIconUsage {
  name: string;
  figmaName: string;
  nodeIds: string[];
  fill?: IconFill;
}

export interface IconMapping {
  figmaName: string;
  name: string;
  nodeIds: string[];
  fill?: IconFill;
  candidate?: {
    filePath: string;
    colorContract: SvgColorContract;
    recolor: string;
    confidence: number;
  };
  status: MappingStatus;
}

export interface IconJoinOptions {
  threshold: number;
  svg: ProjectProfile['svg'];
  utilityFirst: boolean;
}
