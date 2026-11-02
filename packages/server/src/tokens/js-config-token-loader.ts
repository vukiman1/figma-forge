import type { ProjectProfile } from '../profile/project-profile.js';
import { parseTailwindConfig } from './js-config/tailwind-config.js';
import type { JsConfigTokens } from './js-config/theme-tokens.js';
import { parseUnoConfig } from './js-config/uno-config.js';
import { type LoadedProjectTokens, listSourceFiles, truncationClause } from './load-result.js';
import type { ProjectToken } from './project-token.js';
import { readTokenFile } from './read-token-file.js';
import { aggregateRepoCssTokens } from './stylesheet/repo-stylesheet-tokens.js';
import type { TokenSource } from './token-source.js';

interface CssPool {
  readonly tokens: ProjectToken[];
  readonly files: string[];
  readonly omitted: number;
}

const withoutGeneratedClass = (token: ProjectToken): ProjectToken => {
  const pooled = { ...token };
  delete pooled.utilityIsClass;
  return pooled;
};

const mergeTokens = (
  configTokens: readonly ProjectToken[],
  cssTokens: readonly ProjectToken[],
  canCompileTheme: boolean,
): ProjectToken[] => {
  const seen = new Set(configTokens.map(token => `${token.name} ${token.value}`));
  const tokens = [...configTokens];
  for (const token of cssTokens) {
    const key = `${token.name} ${token.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(canCompileTheme ? token : withoutGeneratedClass(token));
  }
  return tokens;
};

const buildNotes = (config: JsConfigTokens, source: TokenSource, css: CssPool): string => {
  const notes = [`read ${config.tokens.length} theme token(s) from ${source.path}`];
  if (!config.themeFound) {
    notes.push(
      'no theme object was reachable in it — the theme is built at runtime, or lives in a preset / shared package this does not open; pass tokenSource to the file that declares the tokens',
    );
  } else if (config.tokens.length === 0 && config.skipped === 0) {
    notes.push('its theme declares no scales that map to design tokens');
  }
  if (config.themeFound && config.skipped > 0) {
    notes.push(
      `${config.skipped} theme entr(ies) were skipped because they are not statically readable (spread of an imported palette, computed key, or function value)`,
    );
  }
  if (css.files.length > 0) {
    notes.push(
      `also pooled ${css.tokens.length} CSS custom propert(ies) from ${css.files.length} file(s): ${listSourceFiles(css.files)}`,
    );
  }
  const truncated = truncationClause(css);
  if (truncated !== undefined) notes.push(truncated);
  if (config.tokens.length > 0) {
    notes.push(
      `the ${source.kind === 'unocss' ? 'UnoCSS' : 'Tailwind'} config declares no CSS custom properties; reference its theme tokens as utilities`,
    );
  }
  return notes.join('; ');
};

export const loadJsConfigTokens = async (
  rootDir: string,
  source: TokenSource,
  styling: ProjectProfile['styling'],
): Promise<LoadedProjectTokens> => {
  const body = await readTokenFile(rootDir, source.path);
  if (body === null) {
    return {
      tokens: [],
      source: null,
      note: `token source ${source.path} could not be read`,
      files: [],
    };
  }
  const parse = source.kind === 'unocss' ? parseUnoConfig : parseTailwindConfig;
  const config = parse(source.path, body);
  const css = await aggregateRepoCssTokens(rootDir);
  const canCompileTheme = styling.system === 'tailwind' && styling.tailwindVersion === 4;
  const tokens = mergeTokens(config.tokens, css.tokens, canCompileTheme);
  return {
    tokens,
    source: source.path,
    note: buildNotes(config, source, css),
    files: [source.path, ...css.files],
  };
};
