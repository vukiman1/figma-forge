import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  aggregateRepoCssTokens,
  aggregateRepoScssTokens,
} from '../../../src/tokens/stylesheet/repo-stylesheet-tokens.js';

const CSS_CAP = 200;
const OVER_CAP = 60;
const SLOW_FILESYSTEM_TIMEOUT_MS = 30_000;

describe('aggregateRepoCssTokens', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'repocss-test-'));
    await mkdir(join(dir, 'src', 'styles'), { recursive: true });
    await mkdir(join(dir, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(
      join(dir, 'src', 'styles', 'tokens.css'),
      ':root {\n  --primary-500: #6266F0;\n  --spacing-md: 16px;\n}\n',
    );
    await writeFile(join(dir, 'src', 'reset.css'), '* { margin: 0; }\n');
    await writeFile(join(dir, 'node_modules', 'pkg', 'vendor.css'), ':root { --vendored: red; }');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('pools custom properties across hand-authored CSS, skipping vendored dirs and prop-less files', async () => {
    const { tokens, files } = await aggregateRepoCssTokens(dir);
    expect(tokens.map(t => t.name).toSorted()).toEqual(['primary-500', 'spacing-md']);
    expect(files).toEqual(['src/styles/tokens.css']);
    expect(tokens.find(t => t.name === 'primary-500')?.value).toBe('#6266F0');
  });

  it(
    "carries the walk's omitted count so a capped pool cannot read as a complete one",
    { timeout: SLOW_FILESYSTEM_TIMEOUT_MS },
    async () => {
      const big = await mkdtemp(join(tmpdir(), 'repocss-cap-'));
      try {
        await mkdir(join(big, 'src'), { recursive: true });
        await Promise.all(
          Array.from({ length: CSS_CAP + OVER_CAP }, (_, i) =>
            writeFile(join(big, 'src', `f${String(i).padStart(3, '0')}.css`), `:root{--c${i}:red}`),
          ),
        );
        const { files, omitted } = await aggregateRepoCssTokens(big);
        expect(files.length).toBe(CSS_CAP);
        expect(omitted).toBe(OVER_CAP);
      } finally {
        await rm(big, { recursive: true, force: true });
      }
    },
  );

  it('reports nothing omitted when the whole repo fits under the cap', async () => {
    expect((await aggregateRepoCssTokens(dir)).omitted).toBe(0);
  });

  it('returns empty when the repo has no CSS custom properties', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'repocss-empty-'));
    try {
      const { tokens, files } = await aggregateRepoCssTokens(empty);
      expect(tokens).toEqual([]);
      expect(files).toEqual([]);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});

describe('aggregateRepoScssTokens', () => {
  it('pools .scss files with each variable carrying its own file, and never walks indented .sass', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'reposcss-test-'));
    try {
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_colors.scss'), '$brand: #6266F0;');
      await writeFile(join(dir, 'src', '_space.scss'), ':root { --gap: 8px; }');
      await writeFile(join(dir, 'src', 'legacy.sass'), '$old: red');
      const { tokens, files } = await aggregateRepoScssTokens(dir);
      expect(files).toEqual(['src/_colors.scss', 'src/_space.scss']);
      expect(tokens).toEqual([
        { name: 'brand', value: '#6266F0', scssVar: '$brand', from: 'src/_colors.scss' },
        { name: 'gap', value: '8px', cssVar: 'var(--gap)' },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
