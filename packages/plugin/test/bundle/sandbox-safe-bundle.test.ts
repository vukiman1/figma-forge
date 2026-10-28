import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SANDBOX_BUNDLE = join(import.meta.dirname, '..', '..', 'dist', 'code.js');

const REJECTED_BY_FIGMA_SANDBOX = [
  { label: 'dynamic import', pattern: /\bimport\s*(?:\(|\/[/*])/g },
  { label: 'HTML comment', pattern: /<!--|-->/g },
] as const;

const CONTEXT_CHARS = 40;

const occurrences = (source: string, pattern: RegExp): string[] =>
  [...source.matchAll(pattern)].map(match =>
    source.slice(Math.max(0, match.index - CONTEXT_CHARS), match.index + CONTEXT_CHARS),
  );

describe.skipIf(!existsSync(SANDBOX_BUNDLE))('built sandbox bundle', () => {
  const source = existsSync(SANDBOX_BUNDLE) ? readFileSync(SANDBOX_BUNDLE, 'utf8') : '';

  it.each(REJECTED_BY_FIGMA_SANDBOX)(
    'holds no $label, which Figma refuses to load',
    ({ pattern }) => {
      expect(occurrences(source, pattern)).toEqual([]);
    },
  );
});
