import type { ScannedComponent } from '../scan/scanned-component.js';
import { casefold } from './casefold.js';
import type { ComponentOverride } from './component-mapping.js';

export interface PartitionedAxes {
  matchedProps: string[];
  unmatchedProps: string[];
}

export const partitionAxes = (
  variantAxes: readonly string[],
  component: ScannedComponent,
): PartitionedAxes => {
  const codeProps = new Set(component.propNames.map(casefold));
  const matchedProps: string[] = [];
  const unmatchedProps: string[] = [];
  for (const axis of variantAxes) {
    if (codeProps.has(casefold(axis))) matchedProps.push(axis);
    else if (component.propsExtracted) unmatchedProps.push(axis);
  }
  return { matchedProps, unmatchedProps };
};

export const resolveOverrideComponent = (
  override: ComponentOverride,
  scanned: readonly ScannedComponent[],
): ScannedComponent | undefined =>
  scanned.find(component => component.filePath === override.filePath) ??
  scanned.find(component => casefold(component.name) === casefold(override.name));
