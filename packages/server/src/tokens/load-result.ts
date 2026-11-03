import { truncationNote } from '../repo/repo-walk.js';
import type { ProjectToken } from './project-token.js';

const NAMED_FILES_LIMIT = 6;

export interface LoadedProjectTokens {
  readonly tokens: ProjectToken[];
  readonly source: string | null;
  readonly note?: string;
  readonly files: string[];
}

export const SCSS_USE_NOTE =
  "a SCSS ref only resolves once the consuming file imports its `from` file. `from` is repo-relative and Sass resolves @use against the *importing* file, so re-resolve it from wherever the code is being written (a file in src/components imports '../styles/tokens', not the repo-relative path verbatim). `@use '<resolved>' as *` keeps the ref as written; a namespaced @use instead requires prefixing the ref with that namespace";

export const listSourceFiles = (files: readonly string[]): string =>
  files.length <= NAMED_FILES_LIMIT
    ? files.join(', ')
    : `${files.slice(0, NAMED_FILES_LIMIT).join(', ')} (+${files.length - NAMED_FILES_LIMIT} more)`;

export const truncationClause = (
  ...walks: readonly { readonly omitted: number }[]
): string | undefined => {
  const omitted = walks.reduce((count, walk) => count + walk.omitted, 0);
  return omitted === 0 ? undefined : truncationNote('stylesheets', omitted);
};

export const withNote = (loaded: LoadedProjectTokens, addition: string): LoadedProjectTokens => ({
  ...loaded,
  note: loaded.note === undefined ? addition : `${loaded.note}; ${addition}`,
});

export const withPrefixedNote = (
  loaded: LoadedProjectTokens,
  reason: string | undefined,
): LoadedProjectTokens =>
  reason === undefined ? loaded : { ...loaded, note: `${reason}; ${loaded.note ?? ''}`.trim() };
