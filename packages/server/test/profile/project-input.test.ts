import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { gatherProjectInput } from '../../src/profile/project-input.js';
import { analyzeProject } from '../../src/profile/project-profile.js';

describe('gathering project input from a real directory', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'profile-test-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^19.0.0' },
        devDependencies: { tailwindcss: '^4.0.0' },
      }),
    );
    await writeFile(join(dir, 'tsconfig.json'), '{}');
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(
      join(dir, 'src', 'app.css'),
      '@import "tailwindcss";\n@theme { --color-primary-500: #6266F0; }\n',
    );
    await mkdir(join(dir, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(join(dir, 'node_modules', 'pkg', 'x.css'), '@import "tailwindcss";');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('gathers manifest + tsconfig + the v4 CSS entry, skipping a vendored CSS in node_modules', async () => {
    const input = await gatherProjectInput(dir);
    expect(input.hasTsconfig).toBe(true);
    expect(input.tailwindCssEntry).toBe('src/app.css');
  });

  it('reports present config files in declared probe order, not stat-completion order', async () => {
    const multi = await mkdtemp(join(tmpdir(), 'profile-order-'));
    try {
      await writeFile(join(multi, 'package.json'), '{}');
      for (const name of ['tailwind.config.ts', 'tailwind.config.js', 'uno.config.ts']) {
        await writeFile(join(multi, name), 'module.exports = {};');
      }
      const input = await gatherProjectInput(multi);
      expect(input.presentConfigFiles).toEqual([
        'tailwind.config.js',
        'tailwind.config.ts',
        'uno.config.ts',
      ]);
    } finally {
      await rm(multi, { recursive: true, force: true });
    }
  });

  it('treats a package.json that is not an object as no manifest', async () => {
    const broken = await mkdtemp(join(tmpdir(), 'profile-manifest-'));
    try {
      await writeFile(join(broken, 'package.json'), '[1, 2]');
      expect((await gatherProjectInput(broken)).packageJson).toBeNull();
    } finally {
      await rm(broken, { recursive: true, force: true });
    }
  });

  it('analyzeProject end-to-end yields a react + tailwind-v4 + ts profile', async () => {
    const p = await analyzeProject(dir);
    expect(p.framework).toBe('react');
    expect(p.language).toBe('ts');
    expect(p.styling.system).toBe('tailwind');
    expect(p.styling.tailwindVersion).toBe(4);
    expect(p.styling.configPath).toBe('src/app.css');
  });
});
