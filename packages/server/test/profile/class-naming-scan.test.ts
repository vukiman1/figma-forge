import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { gatherProjectInput } from '../../src/profile/project-input.js';
import { analyzeProject, detectProfile } from '../../src/profile/project-profile.js';

const BEM_SCSS = `.card {
  &__title { font-weight: 700; }
  &__body { padding: 16px; }
  &__footer { border-top: 1px solid; }
  &__action { cursor: pointer; }
  &--wide { width: 100%; }
  &--muted { opacity: 0.6; }
}
`;

const withProject = async (
  files: Record<string, string>,
  assert: (dir: string) => Promise<void>,
): Promise<void> => {
  const dir = await mkdtemp(join(tmpdir(), 'profile-naming-'));
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ devDependencies: { sass: '^1' } }));
    for (const [rel, body] of Object.entries(files)) {
      const abs = join(dir, rel);
      await mkdir(join(abs, '..'), { recursive: true });
      await writeFile(abs, body);
    }
    await assert(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

describe('class naming scan over a real project', () => {
  it("learns the `&` habit from the project's own .scss once it passes the floor", async () => {
    await withProject({ 'src/card.scss': BEM_SCSS }, async dir => {
      const p = await analyzeProject(dir);
      expect(p.styling.system).toBe('scss');
      expect(p.styling.classNaming).toBe('ampersand');
    });
  });

  it('learns the flat habit the same way', async () => {
    await withProject(
      { 'src/card.scss': '.card { color: red; }\n.card__title { font-weight: 700; }\n' },
      async dir => {
        expect((await analyzeProject(dir)).styling.classNaming).toBe('flat');
      },
    );
  });

  it('reads an SFC <style lang="scss"> block, which is the only stylesheet many Vue repos have', async () => {
    await withProject(
      {
        'src/Card.vue':
          '<template><div class="card" /></template>\n' +
          `<style lang="scss" scoped>\n${BEM_SCSS}</style>\n`,
      },
      async dir => {
        expect((await analyzeProject(dir)).styling.classNaming).toBe('ampersand');
      },
    );
  });

  it('ignores a plain SFC <style> block — CSS nesting cannot concatenate, so it holds no vote', async () => {
    await withProject(
      { 'src/Card.vue': '<style>\n.card { color: red; }\n</style>\n' },
      async dir => {
        const p = await analyzeProject(dir);
        expect(p.styling.classNaming).toBeUndefined();
        expect(p.evidence).toContain('classNaming=none: no preprocessor stylesheet found');
      },
    );
  });

  it('ignores .css entirely, so a big stylesheet cannot outvote the preprocessor files', async () => {
    await withProject(
      {
        'src/legacy.css': Array.from(
          { length: 50 },
          (_, i) => `.legacy__row-${i} { color: red; }`,
        ).join('\n'),
        'src/card.scss': BEM_SCSS,
      },
      async dir => {
        expect((await analyzeProject(dir)).styling.classNaming).toBe('ampersand');
      },
    );
  });

  it('counts .pcss / <style lang="postcss">, since postcss-nested concatenates the same way', async () => {
    await withProject(
      {
        'src/card.pcss': BEM_SCSS,
        'src/Row.vue': `<style lang="postcss">\n${BEM_SCSS}</style>\n`,
      },
      async dir => {
        const input = await gatherProjectInput(dir);
        expect(input.classNamingTally).toEqual({
          ampersand: 12,
          flat: 0,
          filesScanned: 2,
          omitted: 0,
        });
        expect(detectProfile(input).styling.classNaming).toBe('ampersand');
      },
    );
  });

  it('does not let a vendored stylesheet cast a vote', async () => {
    await withProject(
      {
        'src/card.scss': '.card__title { color: red; }\n',
        'node_modules/ui-kit/theme.scss': Array.from(
          { length: 40 },
          () => '.x {\n  &__y { color: red; }\n}',
        ).join('\n'),
      },
      async dir => {
        const input = await gatherProjectInput(dir);
        expect(input.classNamingTally).toEqual({
          ampersand: 0,
          flat: 1,
          filesScanned: 1,
          omitted: 0,
        });
        expect(detectProfile(input).styling.classNaming).toBe('flat');
      },
    );
  });
});
