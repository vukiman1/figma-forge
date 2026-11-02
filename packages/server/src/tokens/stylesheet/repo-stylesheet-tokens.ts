import { join } from 'node:path';

import { readTextIfPresent } from '../../optional-file.js';
import { walkRepoFiles } from '../../repo-walk.js';
import type { ProjectToken } from '../project-token.js';
import { parseCssCustomProperties } from './css-custom-properties.js';
import { parseScssFile } from './scss-file.js';

const MAX_CSS_FILES = 200;
const MAX_SCSS_FILES = 300;

export interface PooledStylesheetTokens {
  readonly tokens: ProjectToken[];
  readonly files: string[];
  readonly omitted: number;
}

interface StylesheetSource {
  readonly extension: string;
  readonly cap: number;
  readonly parse: (body: string, relativePath: string) => ProjectToken[];
}

const CSS_SOURCE: StylesheetSource = {
  extension: '.css',
  cap: MAX_CSS_FILES,
  parse: body => parseCssCustomProperties(body),
};

const SCSS_SOURCE: StylesheetSource = {
  extension: '.scss',
  cap: MAX_SCSS_FILES,
  parse: parseScssFile,
};

const poolRepoTokens = async (
  rootDir: string,
  source: StylesheetSource,
): Promise<PooledStylesheetTokens> => {
  const tokens: ProjectToken[] = [];
  const files: string[] = [];
  const walk = await walkRepoFiles(rootDir, { extensions: [source.extension], cap: source.cap });
  for (const relativePath of walk.files) {
    // oxlint-disable-next-line no-await-in-loop -- one stylesheet in memory at a time on large repos
    const body = await readTextIfPresent(join(rootDir, relativePath));
    const parsed = body === null ? [] : source.parse(body, relativePath);
    if (parsed.length === 0) continue;
    tokens.push(...parsed);
    files.push(relativePath);
  }
  return { tokens, files, omitted: walk.omitted };
};

export const aggregateRepoCssTokens = (rootDir: string): Promise<PooledStylesheetTokens> =>
  poolRepoTokens(rootDir, CSS_SOURCE);

export const aggregateRepoScssTokens = (rootDir: string): Promise<PooledStylesheetTokens> =>
  poolRepoTokens(rootDir, SCSS_SOURCE);
