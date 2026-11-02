import { join, resolve } from 'node:path';

import { fileExists, readTextIfPresent } from '../optional-file.js';
import { declaresVocabularyPreset } from '../tokens/js-config/uno-presets.js';
import { scanClassNaming } from './class-naming-scan.js';
import type { ClassNamingTally } from './class-naming-tally.js';
import { findPresentConfigFiles, findUnoConfig } from './config-files.js';
import { type PackageJson, readPackageManifest } from './package-manifest.js';
import { findTailwindCssEntry } from './tailwind-css-entry.js';

export interface ProjectInput {
  readonly rootDir: string;
  readonly packageJson: PackageJson | null;
  readonly hasTsconfig: boolean;
  readonly presentConfigFiles: readonly string[];
  readonly tailwindCssEntry?: string;
  readonly cssScanOmitted: number;
  readonly unoConfigDeclaresVocabulary?: boolean;
  readonly classNamingTally?: ClassNamingTally;
}

const readUnoVocabulary = async (
  root: string,
  presentConfigFiles: readonly string[],
): Promise<boolean | undefined> => {
  const unoConfig = findUnoConfig(presentConfigFiles);
  if (unoConfig === undefined) return undefined;
  const body = await readTextIfPresent(join(root, unoConfig));
  return body === null ? undefined : (declaresVocabularyPreset(unoConfig, body) ?? undefined);
};

export const gatherProjectInput = async (rootDir: string): Promise<ProjectInput> => {
  const root = resolve(rootDir);
  const packageJson = await readPackageManifest(root);
  const hasTsconfig = await fileExists(join(root, 'tsconfig.json'));
  const presentConfigFiles = await findPresentConfigFiles(root);
  const [tailwindCss, classNamingTally] = await Promise.all([
    findTailwindCssEntry(root),
    scanClassNaming(root),
  ]);
  const unoConfigDeclaresVocabulary = await readUnoVocabulary(root, presentConfigFiles);
  return {
    rootDir: root,
    packageJson,
    hasTsconfig,
    presentConfigFiles,
    ...(tailwindCss.entry === undefined ? {} : { tailwindCssEntry: tailwindCss.entry }),
    cssScanOmitted: tailwindCss.omitted,
    ...(unoConfigDeclaresVocabulary === undefined ? {} : { unoConfigDeclaresVocabulary }),
    ...(classNamingTally === undefined ? {} : { classNamingTally }),
  };
};
