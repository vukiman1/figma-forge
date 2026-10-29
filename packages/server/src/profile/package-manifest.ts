import { join, resolve } from 'node:path';

import { z } from 'zod';

import { parseJson } from '../parse-json.js';
import { readTextIfPresent } from './optional-file.js';

const DependencyMapSchema = z.record(z.string(), z.string().catch('')).optional().catch(undefined);

const PackageJsonSchema = z.object({
  dependencies: DependencyMapSchema,
  devDependencies: DependencyMapSchema,
});

export type PackageJson = z.infer<typeof PackageJsonSchema>;

export type Dependencies = Record<string, string>;

export const allDependencies = (manifest: PackageJson | null): Dependencies => ({
  ...manifest?.dependencies,
  ...manifest?.devDependencies,
});

export const readPackageManifest = async (root: string): Promise<PackageJson | null> => {
  const text = await readTextIfPresent(join(root, 'package.json'));
  if (text === null) return null;
  const parsed = PackageJsonSchema.safeParse(parseJson(text));
  return parsed.success ? parsed.data : null;
};

export const readProjectDeps = async (rootDir: string): Promise<Dependencies> =>
  allDependencies(await readPackageManifest(resolve(rootDir)));
