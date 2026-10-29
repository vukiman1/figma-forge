import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', '..', 'src');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });

const DIRECT_COMPARISON = /\bsystem\s*===\s*['"](tailwind|unocss)['"]/;

const ALLOWED: ReadonlyMap<string, string> = new Map([
  [
    'profile/styling-system.ts',
    'declares isUtilityFirst — the predicate every other file should call',
  ],
  [
    'tokens/load.ts',
    'picks which config vocabulary to parse (Tailwind keys vs UnoCSS keys), which is not the same ' +
      'question as whether the project generates utility classes — a project can be one and read ' +
      'a config written in the other, which is exactly what the tokenSource override allows',
  ],
]);

describe('utility-first is decided in one place, so token_map and icon_map cannot disagree', () => {
  it('no unexplained source file compares styling.system to a utility framework', () => {
    const offenders = sourceFiles(SRC)
      .filter(path => DIRECT_COMPARISON.test(readFileSync(path, 'utf8')))
      .map(path => path.slice(SRC.length + 1).replaceAll('\\', '/'))
      .filter(rel => !ALLOWED.has(rel));

    expect(
      offenders,
      'call isUtilityFirst(profile.styling.system), or add the file to ALLOWED saying why it must tell Tailwind from UnoCSS',
    ).toEqual([]);
  });

  it('every allowlist entry still compares the literal, so stale exemptions are removed', () => {
    const stale = [...ALLOWED.keys()].filter(
      rel => !DIRECT_COMPARISON.test(readFileSync(join(SRC, rel), 'utf8')),
    );
    expect(stale).toEqual([]);
  });
});
