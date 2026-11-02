import { join } from 'node:path';

import { readTextIfPresent } from '../optional-file.js';
import { walkRepoFiles } from '../repo-walk.js';
import { type ClassNamingTally, tallyClassNaming } from './class-naming-tally.js';
import { readStylesheetNames, type StylesheetNames } from './stylesheet-names.js';

const NESTING_STYLESHEET_EXTENSIONS = ['.scss', '.sass', '.less', '.styl', '.pcss', '.postcss'];
const SFC_EXTENSIONS = ['.vue', '.svelte'];
const SFC_PREPROCESSOR_STYLE_BLOCK =
  /<style\b[^>]*\blang\s*=\s*["'](?:scss|sass|less|stylus|styl|postcss|pcss)["'][^>]*>([\s\S]*?)<\/style>/gi;
const CLASS_NAMING_FILE_CAP = 400;

const sfcPreprocessorStyles = (body: string): string =>
  [...body.matchAll(SFC_PREPROCESSOR_STYLE_BLOCK)].map(match => match[1]).join('\n');

const stylesheetSource = (rel: string, body: string): string =>
  SFC_EXTENSIONS.some(extension => rel.endsWith(extension)) ? sfcPreprocessorStyles(body) : body;

const readStylesheets = async (
  root: string,
  files: readonly string[],
): Promise<StylesheetNames[]> => {
  const names: StylesheetNames[] = [];
  for (const rel of files) {
    // oxlint-disable-next-line no-await-in-loop -- sequential scan, bounded by the file cap
    const body = await readTextIfPresent(join(root, rel));
    const source = body === null ? '' : stylesheetSource(rel, body);
    if (source.trim() !== '') names.push(readStylesheetNames(source));
  }
  return names;
};

export const scanClassNaming = async (root: string): Promise<ClassNamingTally | undefined> => {
  const walk = await walkRepoFiles(root, {
    extensions: [...NESTING_STYLESHEET_EXTENSIONS, ...SFC_EXTENSIONS],
    cap: CLASS_NAMING_FILE_CAP,
  });
  const files = await readStylesheets(root, walk.files);
  if (files.length === 0) return undefined;
  return { ...tallyClassNaming(files), filesScanned: files.length, omitted: walk.omitted };
};
