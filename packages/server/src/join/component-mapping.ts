import type { MappingStatus } from './status.js';

export interface FigmaInstance {
  nodeId: string;
  props?: Record<string, string | boolean>;
}

export interface FigmaComponentUsage {
  name: string;
  mainComponentId?: string;
  variantAxes: string[];
  instances: FigmaInstance[];
  instanceCount: number;
}

export interface ComponentCandidate {
  name: string;
  filePath: string;
  confidence: number;
  matchedProps: string[];
  unmatchedProps: string[];
  ambiguousWith?: { name: string; filePath: string }[];
}

export interface ComponentMapping {
  figmaComponentName: string;
  mainComponentId?: string;
  variantAxes: string[];
  instances: FigmaInstance[];
  instanceCount: number;
  candidate?: ComponentCandidate;
  status: MappingStatus;
  source: 'map-file' | 'scan';
  staleOverride?: ComponentOverride;
}

export interface ComponentOverride {
  name: string;
  filePath: string;
}

export interface JoinOptions {
  threshold: number;
  overrides?: ReadonlyMap<string, ComponentOverride>;
  overridesOnDisk?: ReadonlySet<string>;
}

export type ComponentSetIndex = ReadonlyMap<string, { id: string; name: string }>;
