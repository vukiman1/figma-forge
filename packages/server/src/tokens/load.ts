import type { ProjectProfile } from '../profile/project-profile.js';
import { withGeneratedTokensNote } from './generated-token-note.js';
import { loadJsConfigTokens } from './js-config-token-loader.js';
import {
  type LoadedProjectTokens,
  listSourceFiles,
  SCSS_USE_NOTE,
  truncationClause,
  withPrefixedNote,
} from './load-result.js';
import { readTokenFile } from './read-token-file.js';
import { loadScssPool } from './scss-token-pool.js';
import { parseCssCustomProperties } from './stylesheet/css-custom-properties.js';
import { aggregateRepoCssTokens } from './stylesheet/repo-stylesheet-tokens.js';
import { parseScssFile } from './stylesheet/scss-file.js';
import { resolveTokenSource, type TokenSource } from './token-source.js';

export { resolveTokenSource } from './token-source.js';
export type { LoadedProjectTokens } from './load-result.js';

const unreadable = (path: string): LoadedProjectTokens => ({
  tokens: [],
  source: null,
  note: `token source ${path} could not be read`,
  files: [],
});

const loadScssSource = async (
  rootDir: string,
  source: TokenSource,
): Promise<LoadedProjectTokens> => {
  const body = await readTokenFile(rootDir, source.path);
  if (body === null) return unreadable(source.path);
  const tokens = parseScssFile(body, source.path);
  if (tokens.length > 0) {
    return { tokens, source: source.path, files: [source.path], note: SCSS_USE_NOTE };
  }
  return withPrefixedNote(
    await loadScssPool(rootDir),
    `${source.path} declares no tokens of its own — it looks like an entry that imports them`,
  );
};

const loadCssSource = async (
  rootDir: string,
  source: TokenSource,
): Promise<LoadedProjectTokens> => {
  const body = await readTokenFile(rootDir, source.path);
  if (body === null) return unreadable(source.path);
  const tokens = parseCssCustomProperties(body);
  if (tokens.length > 0) return { tokens, source: source.path, files: [source.path] };
  const pooled = await aggregateRepoCssTokens(rootDir);
  if (pooled.files.length === 0) return { tokens, source: source.path, files: [source.path] };
  const truncated = truncationClause(pooled);
  return {
    tokens: pooled.tokens,
    source: null,
    note: `${source.path} declares no custom properties — the tokens are not in the detected entry; aggregated ${pooled.tokens.length} from ${pooled.files.length} CSS file(s): ${listSourceFiles(pooled.files)}${truncated === undefined ? '' : `; ${truncated}`}`,
    files: pooled.files,
  };
};

const loadWithoutSource = async (
  rootDir: string,
  profile: ProjectProfile,
  note: string | undefined,
  refusal: string | undefined,
): Promise<LoadedProjectTokens> => {
  if (profile.styling.system === 'scss') {
    const scss = await loadScssPool(rootDir);
    if (scss.files.length > 0) return withPrefixedNote(scss, refusal);
  }
  const css = await aggregateRepoCssTokens(rootDir);
  if (css.files.length === 0) {
    return withPrefixedNote(
      {
        tokens: css.tokens,
        source: null,
        ...(note === undefined ? {} : { note }),
        files: css.files,
      },
      refusal,
    );
  }
  const truncated = truncationClause(css);
  return withPrefixedNote(
    {
      tokens: css.tokens,
      source: null,
      note: `no single token config detected; aggregated ${css.tokens.length} custom properties from ${css.files.length} CSS file(s): ${listSourceFiles(css.files)}${truncated === undefined ? '' : `; ${truncated}`}`,
      files: css.files,
    },
    refusal,
  );
};

const readTokenSource = async (
  rootDir: string,
  profile: ProjectProfile,
  override: string | undefined,
): Promise<LoadedProjectTokens> => {
  const { source, note, refusal } = resolveTokenSource(profile, override);
  if (source === null) return loadWithoutSource(rootDir, profile, note, refusal);
  if (source.kind === 'scss') return loadScssSource(rootDir, source);
  if (source.kind === 'css') return loadCssSource(rootDir, source);
  return loadJsConfigTokens(rootDir, source, profile.styling);
};

export const loadProjectTokens = async (
  rootDir: string,
  profile: ProjectProfile,
  tokenSourceOverride: string | undefined,
): Promise<LoadedProjectTokens> =>
  withGeneratedTokensNote(rootDir, await readTokenSource(rootDir, profile, tokenSourceOverride));
