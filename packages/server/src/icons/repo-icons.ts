import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { walkRepoFiles } from '../repo/repo-walk.js';

const COLOR_TOKEN = /(?:fill|stroke)\s*[:=]\s*["']?\s*([^"';\s/>]+)/gi;
const GRADIENT_OR_IMAGE = /<(?:linear|radial)gradient|url\(#|<image\b/i;
const ICON_LIBRARY_DEPS = [
  'lucide-react',
  'lucide-vue-next',
  '@tabler/icons-react',
  '@tabler/icons-vue',
  '@heroicons/react',
  '@heroicons/vue',
  '@phosphor-icons/react',
  '@phosphor-icons/vue',
  'react-icons',
  'react-feather',
  '@radix-ui/react-icons',
  'unplugin-icons',
] as const;

export type SvgColorContract = 'currentColor' | 'fixed' | 'multi-color' | 'unknown';

export interface RepoSvg {
  path: string;
  fileName: string;
  colorContract: SvgColorContract;
}

export class RepoSvgReadError extends Error {
  public constructor(path: string, options: ErrorOptions) {
    super(`Failed to read repository SVG: ${path}`, options);
    this.name = 'RepoSvgReadError';
  }
}

const isNoColor = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return normalized === 'none' || normalized === 'transparent' || normalized === 'inherit';
};

export const classifySvgColor = (svg: string): SvgColorContract => {
  const colors = new Set<string>();
  let hasCurrentColor = false;
  for (const match of svg.matchAll(COLOR_TOKEN)) {
    const value = (match[1] ?? '').toLowerCase();
    if (value === 'currentcolor') hasCurrentColor = true;
    else if (!isNoColor(value)) colors.add(value);
  }
  if (hasCurrentColor) return 'currentColor';
  if (GRADIENT_OR_IMAGE.test(svg)) return 'multi-color';
  if (colors.size === 0) return 'unknown';
  return colors.size === 1 ? 'fixed' : 'multi-color';
};

const readRepoSvg = async (rootDir: string, path: string): Promise<RepoSvg> => {
  let content: string;
  try {
    content = await readFile(join(rootDir, path), 'utf8');
  } catch (error: unknown) {
    throw new RepoSvgReadError(path, { cause: error });
  }
  const basename = path.split('/').pop() ?? path;
  return {
    path,
    fileName: basename.replace(/\.svg$/i, ''),
    colorContract: classifySvgColor(content),
  };
};

export const scanRepoSvgs = async (
  rootDir: string,
): Promise<{ svgs: RepoSvg[]; omitted: number }> => {
  const walk = await walkRepoFiles(rootDir, { extensions: ['.svg'] });
  const svgs = await Promise.all(walk.files.map(path => readRepoSvg(rootDir, path)));
  return { svgs, omitted: walk.omitted };
};

export const detectIconLibraries = (dependencies: Record<string, string>): string[] =>
  ICON_LIBRARY_DEPS.filter(dependency => dependency in dependencies);
