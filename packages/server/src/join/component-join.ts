import type { ScannedComponent } from '../scan/scanned-component.js';
import { casefold } from './casefold.js';
import type { ComponentMapping, FigmaComponentUsage, JoinOptions } from './component-mapping.js';
import {
  findBestComponentScore,
  scoreComponentNames,
  type ComponentNameScore,
} from './component-name-score.js';
import { partitionAxes, resolveOverrideComponent } from './component-props.js';
import { CANDIDATE_FLOOR, statusFor } from './status.js';

const VARIANT_BONUS_PER_PROP = 0.05;
const MAX_VARIANT_BONUS = 0.1;
const TIE_EPSILON = 0.05;
const MAX_AMBIGUOUS = 3;

type SharedMapping = Omit<ComponentMapping, 'candidate' | 'status' | 'source' | 'staleOverride'>;

const createSharedMapping = (usage: FigmaComponentUsage): SharedMapping => ({
  figmaComponentName: usage.name,
  ...(usage.mainComponentId === undefined ? {} : { mainComponentId: usage.mainComponentId }),
  variantAxes: usage.variantAxes,
  instances: usage.instances,
  instanceCount: usage.instanceCount,
});

const findAmbiguousComponents = (
  scores: readonly ComponentNameScore[],
  best: ComponentNameScore,
): { name: string; filePath: string }[] =>
  scores
    .filter(
      score =>
        score.component !== best.component &&
        score.score >= CANDIDATE_FLOOR &&
        best.score - score.score <= TIE_EPSILON,
    )
    .toSorted((left, right) => right.score - left.score)
    .slice(0, MAX_AMBIGUOUS)
    .map(score => ({ name: score.component.name, filePath: score.component.filePath }));

const joinScan = (
  usage: FigmaComponentUsage,
  scanned: readonly ScannedComponent[],
  options: JoinOptions,
  shared: SharedMapping,
): ComponentMapping => {
  const scores = scoreComponentNames(usage.name, scanned);
  const best = findBestComponentScore(scores);
  if (best === null || best.score < CANDIDATE_FLOOR) {
    return { ...shared, status: 'unmapped', source: 'scan' };
  }
  const props = partitionAxes(usage.variantAxes, best.component);
  const bonus = Math.min(MAX_VARIANT_BONUS, props.matchedProps.length * VARIANT_BONUS_PER_PROP);
  const confidence = Math.min(1, Number((best.score + bonus).toFixed(3)));
  const ambiguousWith = findAmbiguousComponents(scores, best);
  const baseStatus = statusFor(confidence, options.threshold);
  const status = ambiguousWith.length > 0 && baseStatus === 'high' ? 'medium' : baseStatus;
  return {
    ...shared,
    candidate: {
      name: best.component.name,
      filePath: best.component.filePath,
      confidence,
      ...props,
      ...(ambiguousWith.length === 0 ? {} : { ambiguousWith }),
    },
    status,
    source: 'scan',
  };
};

const isOverrideOnDisk = (usage: FigmaComponentUsage, options: JoinOptions): boolean =>
  options.overridesOnDisk?.has(usage.name) === true ||
  options.overridesOnDisk?.has(casefold(usage.name)) === true;

const joinOverride = (
  usage: FigmaComponentUsage,
  scanned: readonly ScannedComponent[],
  options: JoinOptions,
  shared: SharedMapping,
): ComponentMapping | null => {
  const override =
    options.overrides?.get(usage.name) ?? options.overrides?.get(casefold(usage.name));
  if (override === undefined) return null;
  const component = resolveOverrideComponent(override, scanned);
  if (component === undefined && !isOverrideOnDisk(usage, options)) {
    return { ...joinScan(usage, scanned, options, shared), staleOverride: override };
  }
  const props =
    component === undefined
      ? { matchedProps: [], unmatchedProps: [] }
      : partitionAxes(usage.variantAxes, component);
  return {
    ...shared,
    candidate: { ...override, confidence: 1, ...props },
    status: 'high',
    source: 'map-file',
  };
};

const joinComponent = (
  usage: FigmaComponentUsage,
  scanned: readonly ScannedComponent[],
  options: JoinOptions,
): ComponentMapping => {
  const shared = createSharedMapping(usage);
  return joinOverride(usage, scanned, options, shared) ?? joinScan(usage, scanned, options, shared);
};

export const joinComponents = (
  usages: readonly FigmaComponentUsage[],
  scanned: readonly ScannedComponent[],
  options: JoinOptions,
): ComponentMapping[] => usages.map(usage => joinComponent(usage, scanned, options));
