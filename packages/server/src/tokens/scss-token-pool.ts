import {
  type LoadedProjectTokens,
  listSourceFiles,
  SCSS_USE_NOTE,
  truncationClause,
} from './load-result.js';
import type { ProjectToken } from './project-token.js';
import {
  aggregateRepoCssTokens,
  aggregateRepoScssTokens,
} from './stylesheet/repo-stylesheet-tokens.js';

const referenceKey = (token: ProjectToken): string =>
  [token.name, token.value, token.cssVar ?? '', token.scssVar ?? '', token.from ?? ''].join(
    '\u0000',
  );

const nameValueKey = (token: ProjectToken): string => `${token.name}\u0000${token.value}`;

const dedupeTokens = (tokens: readonly ProjectToken[]): ProjectToken[] => {
  const seen = new Set<string>();
  const unique = tokens.filter(token => {
    const key = referenceKey(token);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const importFree = new Set(unique.filter(t => t.cssVar !== undefined).map(nameValueKey));
  return unique.filter(token => token.cssVar !== undefined || !importFree.has(nameValueKey(token)));
};

const poolPart = (extension: string, files: readonly string[]): string | null =>
  files.length === 0 ? null : `${files.length} ${extension} file(s): ${listSourceFiles(files)}`;

export const loadScssPool = async (rootDir: string): Promise<LoadedProjectTokens> => {
  const scss = await aggregateRepoScssTokens(rootDir);
  const css = await aggregateRepoCssTokens(rootDir);
  const tokens = dedupeTokens([...scss.tokens, ...css.tokens]);
  const parts = [poolPart('.scss', scss.files), poolPart('.css', css.files)].filter(
    part => part !== null,
  );
  const needsUse = tokens.some(token => token.from !== undefined);
  const truncated = truncationClause(scss, css);
  return {
    tokens,
    source: null,
    note: `aggregated ${tokens.length} token(s) from ${parts.join(' and ')}${needsUse ? `; ${SCSS_USE_NOTE}` : ''}${truncated === undefined ? '' : `; ${truncated}`}`,
    files: [...scss.files, ...css.files],
  };
};
