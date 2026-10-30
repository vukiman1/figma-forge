import { extname, join } from 'node:path';

import { readTextIfPresent } from '../optional-file.js';
import { walkRepoFiles } from '../repo-walk.js';
import { extractAngularComponents } from './angular-components.js';
import { extractReactComponents } from './react-components.js';
import type { ComponentFramework, ScannedComponent } from './scanned-component.js';
import { extractSfcComponent } from './sfc-component.js';

export interface ComponentScan {
  readonly components: ScannedComponent[];
  readonly omitted: number;
}

const FRAMEWORK_BY_EXTENSION: ReadonlyMap<string, ComponentFramework> = new Map([
  ['.tsx', 'react'],
  ['.jsx', 'react'],
  ['.vue', 'vue'],
  ['.svelte', 'svelte'],
  ['.ts', 'angular'],
]);

const componentsOf = (
  filePath: string,
  code: string,
  framework: ComponentFramework,
): ScannedComponent[] => {
  if (framework === 'react') return extractReactComponents(filePath, code);
  if (framework === 'angular') return extractAngularComponents(filePath, code);
  return extractSfcComponent(filePath, code, framework);
};

export const scanComponents = async (
  rootDir: string,
  extensions: readonly string[],
): Promise<ComponentScan> => {
  const walk = await walkRepoFiles(rootDir, { extensions });
  const components: ScannedComponent[] = [];
  for (const rel of walk.files) {
    const framework = FRAMEWORK_BY_EXTENSION.get(extname(rel));
    if (framework === undefined) continue;
    // oxlint-disable-next-line no-await-in-loop -- one file in memory at a time on large repos
    const code = await readTextIfPresent(join(rootDir, rel));
    if (code !== null) components.push(...componentsOf(rel, code, framework));
  }
  return { components, omitted: walk.omitted };
};
