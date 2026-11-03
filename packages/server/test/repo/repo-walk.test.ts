import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { walkRepoFiles } from '../../src/repo/repo-walk.js';

const dirs: string[] = [];
const make = async (files: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'walk-test-'));
  dirs.push(root);

  await Promise.all(
    Object.entries(files).map(async ([rel, body]) => {
      await mkdir(join(root, rel, '..'), { recursive: true });
      await writeFile(join(root, rel), body);
    }),
  );
  return root;
};
const collect = async (
  root: string,
  opts?: Parameters<typeof walkRepoFiles>[1],
): Promise<string[]> => (await walkRepoFiles(root, opts)).files.toSorted();

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true })));
});

describe('walkRepoFiles', () => {
  it('prunes baseline dirs (node_modules/vendor) even with no .gitignore', async () => {
    const root = await make({
      'src/Button.tsx': 'x',
      'node_modules/pkg/A.tsx': 'x',
      'vendor/pkg/B.tsx': 'x',
    });
    expect(await collect(root, { extensions: ['.tsx'] })).toEqual(['src/Button.tsx']);
  });

  it('honors the project .gitignore (dir + glob rules) as a union on top of the baseline', async () => {
    const root = await make({
      '.gitignore': 'generated/\nstorybook-static/\n*.draft.tsx\n!Special.draft.tsx\n',
      'src/Card.tsx': 'x',
      'generated/Gen.tsx': 'x',
      'storybook-static/Story.tsx': 'x',
      'src/A.draft.tsx': 'x',
      'src/Special.draft.tsx': 'x',
    });
    expect(await collect(root, { extensions: ['.tsx'] })).toEqual([
      'src/Card.tsx',
      'src/Special.draft.tsx',
    ]);
  });

  it('skips dotfiles and never descends dot-directories (parity with the prior node:fs glob)', async () => {
    const root = await make({
      'src/Keep.tsx': 'x',
      '.hidden.tsx': 'x',
      'src/.secret.tsx': 'x',
      '.storybook/Preview.tsx': 'x',
      'sub/.dot/Deep.tsx': 'x',
    });
    expect(await collect(root, { extensions: ['.tsx'] })).toEqual(['src/Keep.tsx']);
  });

  it('yields only files, never directory entries', async () => {
    const root = await make({ 'src/a.tsx': 'x', 'src/nested/b.css': 'x' });

    expect(await collect(root)).toEqual(['src/a.tsx', 'src/nested/b.css']);
  });

  it('walks a non-baseline dir when there is no .gitignore (degrades to baseline-only)', async () => {
    const root = await make({ 'src/A.tsx': 'x', 'generated/B.tsx': 'x' });

    expect(await collect(root, { extensions: ['.tsx'] })).toEqual(['generated/B.tsx', 'src/A.tsx']);
  });

  it('caps the number of yielded files', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 10; i++) files[`src/F${i}.tsx`] = 'x';
    const root = await make(files);
    expect((await collect(root, { extensions: ['.tsx'], cap: 3 })).length).toBe(3);
  });

  it('reports how many matching files the cap left out', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 10; i += 1) files[`src/F${i}.tsx`] = 'x';
    const root = await make(files);
    expect(await walkRepoFiles(root, { extensions: ['.tsx'], cap: 3 })).toMatchObject({
      omitted: 7,
    });
    expect(await walkRepoFiles(root, { extensions: ['.tsx'], cap: 10 })).toMatchObject({
      omitted: 0,
    });

    expect(await walkRepoFiles(root, { extensions: ['.css'] })).toMatchObject({ omitted: 0 });
  });

  it('filters by extension, or yields everything when none given', async () => {
    const root = await make({ 'a.tsx': 'x', 'b.css': 'x', 'c.md': 'x' });
    expect(await collect(root, { extensions: ['.css'] })).toEqual(['b.css']);
    expect((await collect(root)).length).toBe(3);
  });
});

const rawCollect = async (
  root: string,
  opts?: Parameters<typeof walkRepoFiles>[1],
): Promise<string[]> => (await walkRepoFiles(root, opts)).files;

describe('walkRepoFiles ordering', () => {
  it(
    'returns the same sequence on every run over an unchanged repo',
    { timeout: 30_000 },
    async () => {
      const files: Record<string, string> = {};
      for (let i = 0; i < 60; i += 1) {
        files[`pkg${i}/a.css`] = 'x';
        files[`pkg${i}/nested/b.css`] = 'x';
      }
      const root = await make(files);
      const runs: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop -- separate crawls on purpose
        runs.push((await rawCollect(root, { extensions: ['.css'] })).join('\n'));
      }
      expect(new Set(runs).size).toBe(1);
    },
  );

  it('orders shallowest first, then by code unit', async () => {
    const root = await make({
      'src/a/b/deep.css': 'x',
      'src/index.css': 'x',
      'zz/later.css': 'x',
      'root.css': 'x',
    });
    expect(await rawCollect(root, { extensions: ['.css'] })).toEqual([
      'root.css',
      'src/index.css',
      'zz/later.css',
      'src/a/b/deep.css',
    ]);
  });

  it(
    'returns the same files on every run when the repo is over the cap',
    { timeout: 30_000 },
    async () => {
      const files: Record<string, string> = {};
      for (let i = 0; i < 60; i += 1) {
        files[`pkg${i}/a.css`] = 'x';
        files[`pkg${i}/nested/b.css`] = 'x';
        files[`pkg${i}/nested/deep/c.css`] = 'x';
      }
      const root = await make(files);
      const runs: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        // eslint-disable-next-line no-await-in-loop -- separate crawls on purpose
        runs.push((await rawCollect(root, { extensions: ['.css'], cap: 50 })).join('\n'));
      }
      expect(new Set(runs).size).toBe(1);
    },
  );

  it('keeps the canonically-first files when it caps, not an arbitrary prefix', async () => {
    const files: Record<string, string> = { 'zz/shallow.css': 'x' };
    for (let i = 0; i < 8; i += 1) {
      files[`a${i}/n/deep/0.css`] = 'x';
      files[`a${i}/n/deep/1.css`] = 'x';
    }
    const root = await make(files);
    expect(await rawCollect(root, { extensions: ['.css'], cap: 3 })).toEqual([
      'zz/shallow.css',
      'a0/n/deep/0.css',
      'a0/n/deep/1.css',
    ]);
  });

  it('orders by code unit rather than locale collation', async () => {
    const root = await make({ 'a.css': 'x', 'B.css': 'x', 'z.css': 'x', 'ä.css': 'x' });
    expect(await rawCollect(root, { extensions: ['.css'] })).toEqual([
      'B.css',
      'a.css',
      'z.css',
      'ä.css',
    ]);
  });
});
