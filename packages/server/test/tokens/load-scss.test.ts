import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeProject } from '../../src/profile/project-profile.js';
import { loadProjectTokens } from '../../src/tokens/load.js';

describe('resolveTokenSource', () => {
  it('does not let a foreign @theme block claim to generate a class', async () => {
    for (const [configName, config, dep] of [
      [
        'uno.config.ts',
        "import { defineConfig, presetUno } from 'unocss'\nexport default defineConfig({ presets: [presetUno()], theme: { colors: { brand: '#111111' } } })",
        { unocss: '^66.0.0' },
      ],
      [
        'tailwind.config.js',
        "module.exports = { theme: { colors: { brand: '#111111' } } };",
        { tailwindcss: '^3.4.0' },
      ],
    ] as const) {
      const dir = await mkdtemp(join(tmpdir(), 'load-residue-'));
      try {
        await writeFile(join(dir, 'package.json'), JSON.stringify({ devDependencies: dep }));
        await writeFile(join(dir, configName), config);
        await mkdir(join(dir, 'src'), { recursive: true });
        await writeFile(join(dir, 'src', 'legacy.css'), '@theme { --color-leftover: #6266F0; }');

        const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
        const byName = new Map(loaded.tokens.map(t => [t.name, t]));

        expect(byName.get('color-brand')?.utilityIsClass).toBe(true);

        expect(byName.get('color-leftover')?.utilityIsClass).toBeUndefined();
        expect(byName.get('color-leftover')?.cssVar).toBe('var(--color-leftover)');
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  });

  it('reads a SCSS project, which previously joined against an empty pool', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-scss-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1.102.0' } }),
      );
      await mkdir(join(dir, 'src', 'styles'), { recursive: true });
      await writeFile(
        join(dir, 'src', 'styles', '_tokens.scss'),
        [
          '$color-primary-500: #6266F0;',
          '$radius-lg: 8px !default;',

          ':root { --color-legacy: #1F304D; }',

          '.card { $scoped: 99px; padding: $scoped; }',
        ].join('\n'),
      );

      const profile = await analyzeProject(dir);
      expect(profile.styling.system).toBe('scss');
      const loaded = await loadProjectTokens(dir, profile, undefined);
      const byName = new Map(loaded.tokens.map(t => [t.name, t]));

      expect(byName.get('color-primary-500')).toMatchObject({
        scssVar: '$color-primary-500',
        from: 'src/styles/_tokens.scss',
      });
      expect(byName.get('radius-lg')?.value).toBe('8px');
      expect(byName.get('color-legacy')?.cssVar).toBe('var(--color-legacy)');
      expect(byName.has('scoped')).toBe(false);

      expect(loaded.note).toMatch(/@use/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("pools a SCSS project's .css alongside its .scss", async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-scss-css-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_tokens.scss'), '$color-primary-500: #6266F0;');
      await writeFile(join(dir, 'src', 'global.css'), ':root { --color-legacy: #1F304D; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      const byName = new Map(loaded.tokens.map(t => [t.name, t]));
      expect(byName.get('color-primary-500')?.scssVar).toBe('$color-primary-500');
      expect(byName.get('color-legacy')?.cssVar).toBe('var(--color-legacy)');
      expect(loaded.files).toEqual(['src/_tokens.scss', 'src/global.css']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('collapses a mirror split across two files, not just within one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-xfile-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_vars.scss'), '$primary: #6266F0;');
      await writeFile(join(dir, 'src', 'global.css'), ':root { --primary: #6266F0; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.tokens).toHaveLength(1);
      expect(loaded.tokens[0]?.cssVar).toBe('var(--primary)');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not attach the @use instruction to a pool that needs no import', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-nouse-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', 'g.css'), ':root { --a: 1px; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.note).not.toMatch(/@use/);

      expect(loaded.note).not.toMatch(/0 \.scss/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reports a refused override even when nothing else was found', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-onlysass-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_v.sass'), '$a: 1px');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), 'src/_v.sass');
      expect(loaded.tokens).toEqual([]);
      expect(loaded.note).toMatch(/indented \.sass syntax/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('collapses the mirror layout into one token with the import-free ref', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-mirror-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(
        join(dir, 'src', '_tokens.scss'),
        '$brand: #6266F0;\n$only-scss: #FF0000;\n:root { --brand: #6266F0; }',
      );

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      const byName = new Map(loaded.tokens.map(t => [t.name, t]));
      expect(loaded.tokens.filter(t => t.name === 'brand')).toHaveLength(1);
      expect(byName.get('brand')?.cssVar).toBe('var(--brand)');
      expect(byName.get('brand')?.scssVar).toBeUndefined();

      expect(byName.get('only-scss')?.scssVar).toBe('$only-scss');
      expect(byName.get('only-scss')?.from).toBe('src/_tokens.scss');

      expect(loaded.note).toMatch(/aggregated 2 token\(s\)/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('collapses the mirror on the explicit tokenSource path too', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-mirror-one-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_t.scss'), '$brand: #6266F0;\n:root { --brand: #6266F0; }');
      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), 'src/_t.scss');
      expect(loaded.tokens).toHaveLength(1);
      expect(loaded.tokens[0]?.cssVar).toBe('var(--brand)');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps a mirror whose two forms hold different values', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-mirror-diff-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_t.scss'), '$brand: #6266F0;\n:root { --brand: #FF0000; }');
      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.tokens.map(t => t.value).toSorted()).toEqual(['#6266F0', '#FF0000']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('falls back when an explicitly named .scss declares nothing itself', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-barrel-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src', 'styles'), { recursive: true });
      await writeFile(join(dir, 'src', 'styles', '_tokens.scss'), '$brand: #6266F0;');
      await writeFile(join(dir, 'src', 'styles', 'main.scss'), "@use './tokens';");

      const loaded = await loadProjectTokens(
        dir,
        await analyzeProject(dir),
        'src/styles/main.scss',
      );
      expect(loaded.tokens.map(t => t.name)).toEqual(['brand']);
      expect(loaded.note).toMatch(/declares no tokens of its own/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not tell a SCSS project that no token source was detected', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-note-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_t.scss'), '$brand: #6266F0;');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.tokens).toHaveLength(1);
      expect(loaded.note).not.toMatch(/no token source detected/);
      expect(loaded.note).toMatch(/^aggregated 1 token/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('carries a refused override into the note of whatever it fell back to', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-sassnote-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { sass: '^1' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', '_v.sass'), '$a: 1px');
      await writeFile(join(dir, 'src', '_t.scss'), '$brand: #6266F0;');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), 'src/_v.sass');
      expect(loaded.note).toMatch(/indented \.sass syntax/);
      expect(loaded.tokens.map(t => t.name)).toEqual(['brand']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
