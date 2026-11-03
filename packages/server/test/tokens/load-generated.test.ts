import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeProject, type ProjectProfile } from '../../src/profile/project-profile.js';
import { loadProjectTokens, resolveTokenSource } from '../../src/tokens/load.js';

const profileWith = (
  styling: Partial<ProjectProfile['styling']>,
): Pick<ProjectProfile, 'styling'> => ({
  styling: { system: 'unknown', ...styling },
});

describe('resolveTokenSource', () => {
  it('refuses a .sass override instead of silently reading nothing', () => {
    const { source, refusal } = resolveTokenSource(profileWith({ system: 'scss' }), 'src/_v.sass');
    expect(source).toBeNull();

    expect(refusal).toMatch(/indented \.sass syntax/);
  });

  it('does not report a token ambiguous with itself when both walks see it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-dup-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_t.scss'), ':root { --brand: #6266F0; }');
      await writeFile(join(dir, 'src', 'compiled.css'), ':root { --brand: #6266F0; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.tokens.filter(t => t.name === 'brand')).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reads a single .scss file when tokenSource names one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-scss-one-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_a.scss'), '$from-a: #111111;');
      await writeFile(join(dir, 'src', '_b.scss'), '$from-b: #222222;');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), 'src/_a.scss');
      expect(loaded.source).toBe('src/_a.scss');
      expect(loaded.tokens.map(t => t.name)).toEqual(['from-a']);
      expect(loaded.tokens[0]?.from).toBe('src/_a.scss');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('names the generated stylesheet when a token build tool wrote it somewhere pruned', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-generated-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { 'style-dictionary': '^5.5.1' } }),
      );
      await mkdir(join(dir, 'build'), { recursive: true });
      await writeFile(join(dir, 'build', 'variables.css'), ':root { --brand: #6266F0; }');

      const profile = await analyzeProject(dir);
      const loaded = await loadProjectTokens(dir, profile, undefined);
      expect(loaded.tokens).toEqual([]);
      expect(loaded.note).toMatch(/Style Dictionary/);
      expect(loaded.note).toContain('build/variables.css');

      const followed = await loadProjectTokens(dir, profile, 'build/variables.css');
      expect(followed.tokens.map(t => t.name)).toEqual(['brand']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('names the generated stylesheet even when other tokens were found', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-partial-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { 'style-dictionary': '^5.5.1' } }),
      );
      await mkdir(join(dir, 'build'), { recursive: true });
      await writeFile(join(dir, 'build', 'variables.css'), ':root { --color-primary: #6266F0; }');
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', 'layout.css'), ':root { --header-height: 64px; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);

      expect(loaded.tokens.map(t => t.name)).toEqual(['header-height']);

      expect(loaded.note).toContain('src/layout.css');
      expect(loaded.note).toMatch(/Style Dictionary/);
      expect(loaded.note).toMatch(/may be incomplete/);
      expect(loaded.note).toContain('build/variables.css');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('says nothing when tokenSource already points at the generated stylesheet', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-pointed-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { 'style-dictionary': '^5.5.1' } }),
      );
      await mkdir(join(dir, 'build'), { recursive: true });
      await writeFile(join(dir, 'build', 'variables.css'), ':root { --color-primary: #6266F0; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), 'build/variables.css');
      expect(loaded.tokens.map(t => t.name)).toEqual(['color-primary']);
      expect(loaded.note).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('says nothing when the tool emits no stylesheet and tokens were found anyway', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-nonweb-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { 'style-dictionary': '^5.5.1' } }),
      );
      await mkdir(join(dir, 'build', 'ios'), { recursive: true });
      await writeFile(join(dir, 'build', 'ios', 'Colors.swift'), '// generated');
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', 'app.css'), ':root { --brand: #6266F0; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.tokens.map(t => t.name)).toEqual(['brand']);
      expect(loaded.note).not.toMatch(/Style Dictionary/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('says the build has not run when the tool is there but the output is not', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-nobuild-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { '@tokens-studio/sd-transforms': '^1' } }),
      );
      await mkdir(join(dir, 'tokens'), { recursive: true });
      await writeFile(join(dir, 'tokens', 'color.json'), '{}');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.note).toMatch(/Tokens Studio/);
      expect(loaded.note).toMatch(/run its build|commit the generated stylesheet/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps the plain note when no token build tool is involved', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-plain-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18' } }),
      );
      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.note).toBe('no token source detected; pass tokenSource');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('caps the file list in a note instead of naming up to 200 paths', async () => {
    const many = await mkdtemp(join(tmpdir(), 'load-many-'));
    try {
      await writeFile(join(many, 'package.json'), '{}');
      await mkdir(join(many, 'src'), { recursive: true });
      for (let i = 0; i < 9; i += 1) {
        await writeFile(join(many, 'src', `t${i}.css`), `:root { --c${i}: #00000${i}; }`);
      }
      const loaded = await loadProjectTokens(many, await analyzeProject(many), undefined);
      expect(loaded.note).toMatch(/\(\+3 more\)/);

      expect(loaded.files).toHaveLength(9);
    } finally {
      await rm(many, { recursive: true, force: true });
    }
  });

  it('asks for a tokenSource when nothing was detected', () => {
    const { source, note } = resolveTokenSource(profileWith({}), undefined);
    expect(source).toBeNull();
    expect(note).toMatch(/tokenSource/);
  });

  it('declines a detected config in a form it has no reader for', () => {
    const { source, note } = resolveTokenSource(
      profileWith({ system: 'scss', configPath: 'src/tokens.scss' }),
      undefined,
    );
    expect(source).toBeNull();
    expect(note).toMatch(/src\/tokens\.scss/);
  });
});
