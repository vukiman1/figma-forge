import { join } from 'node:path';

import { walkRepoFiles } from '../repo-walk.js';
import { readTextIfPresent } from './optional-file.js';

const CSS_TAILWIND_IMPORT = /@import\s+["']tailwindcss["']/;
const CSS_THEME_BLOCK = /@theme\b/;
const CSS_ENTRY_SCAN_CAP = 1000;

export interface TailwindCssEntryScan {
  readonly entry?: string;
  readonly omitted: number;
}

const isTailwindCssEntry = (body: string): boolean =>
  CSS_TAILWIND_IMPORT.test(body) || CSS_THEME_BLOCK.test(body);

export const findTailwindCssEntry = async (root: string): Promise<TailwindCssEntryScan> => {
  const walk = await walkRepoFiles(root, { extensions: ['.css'], cap: CSS_ENTRY_SCAN_CAP });
  for (const rel of walk.files) {
    // oxlint-disable-next-line no-await-in-loop -- sequential scan stops at the first match
    const body = await readTextIfPresent(join(root, rel));
    if (body !== null && isTailwindCssEntry(body)) return { entry: rel, omitted: walk.omitted };
  }
  return { omitted: walk.omitted };
};
