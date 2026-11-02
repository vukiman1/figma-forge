import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const readTokenFile = async (
  rootDir: string,
  relativePath: string,
): Promise<string | null> => {
  try {
    return await readFile(join(rootDir, relativePath), 'utf8');
  } catch {
    return null;
  }
};
