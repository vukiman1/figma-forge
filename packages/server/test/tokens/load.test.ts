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
  it('reads a detected CSS config as CSS', () => {
    expect(
      resolveTokenSource(profileWith({ system: 'tailwind', configPath: 'src/app.css' }), undefined),
    ).toEqual({ source: { path: 'src/app.css', kind: 'css' } });
  });

  it('reads a detected Tailwind config as a config, whatever extension it uses', () => {
    for (const path of [
      'tailwind.config.js',
      'tailwind.config.cjs',
      'tailwind.config.mjs',
      'tailwind.config.ts',
    ]) {
      expect(
        resolveTokenSource(profileWith({ system: 'tailwind', configPath: path }), undefined),
      ).toEqual({ source: { path, kind: 'tailwind-v3' } });
    }
  });

  it('reads a detected UnoCSS config with the UnoCSS reader', () => {
    expect(
      resolveTokenSource(profileWith({ system: 'unocss', configPath: 'uno.config.ts' }), undefined),
    ).toEqual({ source: { path: 'uno.config.ts', kind: 'unocss' } });
  });

  it('recognises a config basename written with Windows separators', () => {
    const tw = profileWith({ system: 'tailwind' });
    expect(resolveTokenSource(tw, 'packages\\ui\\uno.config.ts').source).toEqual({
      path: 'packages\\ui\\uno.config.ts',
      kind: 'unocss',
    });
    const uno = profileWith({ system: 'unocss' });
    expect(resolveTokenSource(uno, 'packages\\ui\\tailwind.config.js').source).toEqual({
      path: 'packages\\ui\\tailwind.config.js',
      kind: 'tailwind-v3',
    });
  });

  it('recognises both UnoCSS config basenames in an override', () => {
    const tw = profileWith({ system: 'tailwind', configPath: 'tailwind.config.ts' });
    for (const path of [
      'uno.config.ts',
      'unocss.config.ts',
      'uno.config.mjs',
      'app/uno.config.ts',
    ]) {
      expect(resolveTokenSource(tw, path).source).toEqual({ path, kind: 'unocss' });
    }
  });

  it('recognises a Tailwind config basename in an override even on an UnoCSS project', () => {
    expect(
      resolveTokenSource(profileWith({ system: 'unocss' }), 'packages/ui/tailwind.config.js')
        .source,
    ).toEqual({ path: 'packages/ui/tailwind.config.js', kind: 'tailwind-v3' });
  });

  it('falls back to the detected framework for a JS override whose name says nothing', () => {
    expect(resolveTokenSource(profileWith({ system: 'unocss' }), 'config/theme.ts').source).toEqual(
      { path: 'config/theme.ts', kind: 'unocss' },
    );
    expect(
      resolveTokenSource(profileWith({ system: 'tailwind' }), 'config/theme.ts').source,
    ).toEqual({ path: 'config/theme.ts', kind: 'tailwind-v3' });
  });

  it('picks the reader for an override from its extension, not from detection', () => {
    const v4 = profileWith({ system: 'tailwind', configPath: 'src/app.css' });
    expect(resolveTokenSource(v4, 'tailwind.config.ts').source).toEqual({
      path: 'tailwind.config.ts',
      kind: 'tailwind-v3',
    });
    const v3 = profileWith({ system: 'tailwind', configPath: 'tailwind.config.js' });
    expect(resolveTokenSource(v3, 'styles/tokens.css').source).toEqual({
      path: 'styles/tokens.css',
      kind: 'css',
    });
  });

  it('falls back to the repo pool when the detected CSS entry declares nothing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-split-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { tailwindcss: '^4.0.0' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(
        join(dir, 'src', 'app.css'),
        '@import "tailwindcss";\n@import "./theme.css";\n',
      );
      await writeFile(join(dir, 'src', 'theme.css'), '@theme { --color-primary-500: #6266F0; }');

      const profile = await analyzeProject(dir);
      expect(profile.styling.configPath).toBe('src/app.css');
      const loaded = await loadProjectTokens(dir, profile, undefined);
      const token = loaded.tokens.find(t => t.name === 'color-primary-500');
      expect(token?.value).toBe('#6266F0');

      expect(token?.utilityIsClass).toBe(true);
      expect(loaded.note).toMatch(/declares no custom properties/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps reading the detected entry when it does declare tokens', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-entry-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { tailwindcss: '^4.0.0' } }),
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(
        join(dir, 'src', 'app.css'),
        '@import "tailwindcss";\n@theme { --color-primary-500: #6266F0; }',
      );
      await writeFile(join(dir, 'src', 'misc.css'), ':root { --header-height: 64px; }');

      const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
      expect(loaded.source).toBe('src/app.css');
      expect(loaded.tokens.map(t => t.name)).toEqual(['color-primary-500']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it(
    'says so in the note when the CSS pool was capped',

    { timeout: 30_000 },
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'load-cap-'));
      try {
        await mkdir(join(dir, 'src'), { recursive: true });
        await Promise.all(
          Array.from({ length: 260 }, (_, i) =>
            writeFile(join(dir, 'src', `f${String(i).padStart(3, '0')}.css`), `:root{--c${i}:red}`),
          ),
        );
        const loaded = await loadProjectTokens(dir, await analyzeProject(dir), undefined);
        expect(loaded.note).toContain('file cap reached');
        expect(loaded.note).toContain('60 further stylesheets');
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it('keeps the utility ref on a real v4 @theme when the project also has a JS config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'load-v4config-'));
    try {
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({
          devDependencies: { tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.0.0' },
        }),
      );
      await writeFile(
        join(dir, 'tailwind.config.js'),
        "module.exports = { content: ['./src/**/*.tsx'] };",
      );
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(
        join(dir, 'src', 'app.css'),
        '@import "tailwindcss";\n@config "../tailwind.config.js";\n@theme { --color-primary-500: #6266F0; }\n',
      );

      const profile = await analyzeProject(dir);
      expect(profile.styling.tailwindVersion).toBe(4);
      const loaded = await loadProjectTokens(dir, profile, undefined);
      const token = loaded.tokens.find(t => t.name === 'color-primary-500');
      expect(token?.utilityIsClass).toBe(true);

      expect(loaded.note).not.toMatch(/declares no CSS custom properties/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
