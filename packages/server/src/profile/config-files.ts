import { join } from 'node:path';

import { fileExists } from './optional-file.js';

const TAILWIND_CONFIGS: readonly string[] = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
];

const UNOCSS_BASENAMES = ['uno.config', 'unocss.config'];
const SCRIPT_EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'];

const UNOCSS_CONFIGS: readonly string[] = UNOCSS_BASENAMES.flatMap(base =>
  SCRIPT_EXTENSIONS.map(extension => `${base}.${extension}`),
);

const PROBE_CONFIG_FILES = [...TAILWIND_CONFIGS, ...UNOCSS_CONFIGS];

export const findPresentConfigFiles = async (root: string): Promise<string[]> => {
  const probed = await Promise.all(PROBE_CONFIG_FILES.map(name => fileExists(join(root, name))));
  return PROBE_CONFIG_FILES.filter((_, index) => probed[index] === true);
};

export const findTailwindConfig = (present: readonly string[]): string | undefined =>
  present.find(name => TAILWIND_CONFIGS.includes(name));

export const findUnoConfig = (present: readonly string[]): string | undefined =>
  present.find(name => UNOCSS_CONFIGS.includes(name));
