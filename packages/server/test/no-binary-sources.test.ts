import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOTS = [join(import.meta.dirname, '..', 'src'), join(import.meta.dirname, '..', 'test')];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });

describe('source files stay textual', () => {
  it('no .ts file contains a raw control byte git would read as binary', () => {
    const offenders = ROOTS.flatMap(sourceFiles)
      .filter(path => {
        const buf = readFileSync(path);

        return buf.some(b => b < 32 && b !== 9 && b !== 10 && b !== 13);
      })
      .map(path => path.slice(path.indexOf('packages/')));

    expect(offenders).toEqual([]);
  });
});
