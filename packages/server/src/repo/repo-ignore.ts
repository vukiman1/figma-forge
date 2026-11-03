import { join } from 'node:path';

import ignore, { type Ignore } from 'ignore';

import { readTextIfPresent } from './optional-file.js';

const IGNORE_FILES = ['.gitignore', '.git/info/exclude'] as const;

export const buildRepoIgnoreMatcher = async (rootDir: string): Promise<Ignore> => {
  const matcher = ignore();
  const contents = await Promise.all(
    IGNORE_FILES.map(relativePath => readTextIfPresent(join(rootDir, relativePath))),
  );
  for (const content of contents) {
    if (content !== null) matcher.add(content);
  }
  return matcher;
};
