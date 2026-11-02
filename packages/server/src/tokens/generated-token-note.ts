import { readProjectDeps } from '../profile/package-manifest.js';
import { detectTokenBuildTool, findGeneratedStylesheets } from './generated-tokens.js';
import { type LoadedProjectTokens, withNote } from './load-result.js';

export const withGeneratedTokensNote = async (
  rootDir: string,
  loaded: LoadedProjectTokens,
): Promise<LoadedProjectTokens> => {
  const tool = detectTokenBuildTool(await readProjectDeps(rootDir));
  if (tool === null) return loaded;
  const alreadyRead = new Set(loaded.files);
  const candidates = (await findGeneratedStylesheets(rootDir)).filter(
    file => !alreadyRead.has(file),
  );
  const hasTokens = loaded.tokens.length > 0;
  if (candidates.length === 0) {
    if (hasTokens) return loaded;
    return withNote(
      loaded,
      `${tool} generates this project's design tokens, and its output directory (commonly build/ or dist/) holds no committed .css or .scss — run its build, or commit the generated stylesheet`,
    );
  }
  const candidateList = candidates.join(', ');
  const addition = hasTokens
    ? `${tool} also generates design tokens into a directory this does not scan (build/, dist/ and out/ are skipped as build artefacts), so the tokens above may be incomplete. Re-run with tokenSource set to the right one: ${candidateList}`
    : `${tool} generates this project's design tokens, and its generated stylesheet is not scanned, because build/, dist/ and out/ are skipped as build artefacts. Re-run this tool with tokenSource set to the right one: ${candidateList}`;
  return hasTokens ? withNote(loaded, addition) : { ...loaded, note: addition };
};
