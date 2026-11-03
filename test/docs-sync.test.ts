import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ALL_TOOL_SPECS } from '../packages/server/src/tools/registry/registry.js';

const COUNTED_DOC_PATHS = ['packages/server/README.md'];
const TOOL_COUNT_CLAIM = /\*{0,2}(\d+)\*{0,2} (?:MCP )?tools\b/g;

describe('README tool counts', () => {
  it.each(COUNTED_DOC_PATHS)('%s advertises exactly ALL_TOOL_SPECS.length tools', path => {
    const body = readFileSync(join(import.meta.dirname, '..', path), 'utf8');
    const claims = [...body.matchAll(TOOL_COUNT_CLAIM)].map(m => Number(m[1]));
    expect(
      claims.length,
      `${path}: no "N tools" claim found — update TOOL_COUNT_CLAIM`,
    ).toBeGreaterThan(0);
    expect(claims).toEqual(claims.map(() => ALL_TOOL_SPECS.length));
  });
});
