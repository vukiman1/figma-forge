import { fdir } from 'fdir';

const TOKEN_BUILD_TOOLS: ReadonlyMap<string, string> = new Map([
  ['style-dictionary', 'Style Dictionary'],
  ['@tokens-studio/sd-transforms', 'Tokens Studio + Style Dictionary'],
  ['@terrazzo/cli', 'Terrazzo'],
  ['@cobalt-ui/cli', 'Cobalt'],
  ['theo', 'Theo'],
]);

const OUTPUT_DIRECTORIES = ['build', 'dist', 'out'] as const;
const STYLESHEET_EXTENSIONS = ['.css', '.scss'] as const;
const MAX_NAMED_FILES = 8;
const CRAWL_CAP = 400;

export const detectTokenBuildTool = (deps: Readonly<Record<string, unknown>>): string | null => {
  for (const [packageName, label] of TOKEN_BUILD_TOOLS) {
    if (packageName in deps) return label;
  }
  return null;
};

const byLikeliestEntry = (a: string, b: string): number =>
  a.length - b.length || a.localeCompare(b);

const isStylesheet = (path: string): boolean => {
  const baseName = path.slice(path.lastIndexOf('/') + 1);
  return (
    !baseName.startsWith('.') &&
    STYLESHEET_EXTENSIONS.some(extension => baseName.endsWith(extension))
  );
};

const capCandidates = (candidates: string[]): void => {
  if (candidates.length < CRAWL_CAP * 2) return;
  candidates.sort(byLikeliestEntry);
  candidates.length = CRAWL_CAP;
};

const findInDirectory = async (rootDir: string, directory: string): Promise<string[]> => {
  const candidates: string[] = [];
  try {
    await new fdir()
      .withRelativePaths()
      .withPathSeparator('/')
      .exclude(name => name.startsWith('.') || name === 'node_modules')
      .filter(path => {
        if (isStylesheet(path)) {
          candidates.push(path);
          capCandidates(candidates);
        }
        return false;
      })
      .crawl(`${rootDir}/${directory}`)
      .withPromise();
  } catch {
    return [];
  }
  return candidates.toSorted(byLikeliestEntry).slice(0, CRAWL_CAP);
};

export const findGeneratedStylesheets = async (rootDir: string): Promise<string[]> => {
  const found: string[] = [];
  for (const directory of OUTPUT_DIRECTORIES) {
    // oxlint-disable-next-line no-await-in-loop -- three fixed directories keep memory bounded
    const candidates = await findInDirectory(rootDir, directory);
    found.push(...candidates.map(path => `${directory}/${path}`));
  }
  return found.toSorted(byLikeliestEntry).slice(0, MAX_NAMED_FILES);
};
