import type { FigmaToken } from '../tokens/figma-tokens.js';
import type { MappingStatus } from './status.js';

export interface TokenCandidate {
  token: string;
  ref: string;
  cssVar?: string;
  utility?: string;
  from?: string;
  confidence: number;
  matchedBy: ('name' | 'value' | 'map-file')[];
  ambiguousWith?: string[];
  ambiguousFrom?: string[];
}

export interface TokenMapping {
  figmaName: string;
  figmaValue: FigmaToken['value'];
  figmaType: string;
  figmaModes?: FigmaToken['modes'];
  candidate?: TokenCandidate;
  builtin?: { scale: string; step: string };
  source?: 'style';
  staleOverride?: { ref: string };
  status: MappingStatus;
}

export interface TokenJoinOptions {
  threshold: number;
  utilityFirst?: boolean;
  overrides?: ReadonlyMap<string, string>;
}
