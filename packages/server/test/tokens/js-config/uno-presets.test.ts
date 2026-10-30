import { describe, expect, it } from 'vitest';

import { declaresVocabularyPreset } from '../../../src/tokens/js-config/uno-presets.js';

describe('declaresVocabularyPreset', () => {
  const check = (code: string): boolean | null => declaresVocabularyPreset('uno.config.ts', code);

  it('is false for a config that loads only non-vocabulary presets, as an icons-only install does', () => {
    expect(
      check(
        "import { defineConfig } from 'unocss'\nimport presetIcons from '@unocss/preset-icons'\nexport default defineConfig({ presets: [presetIcons()] })",
      ),
    ).toBe(false);
  });

  it('is true when any loaded preset carries a vocabulary', () => {
    for (const presets of ['presetUno()', 'presetWind3()', 'presetIcons(), presetUno()']) {
      expect(
        check(
          `import { defineConfig, presetUno, presetWind3 } from 'unocss'\nimport presetIcons from '@unocss/preset-icons'\nexport default defineConfig({ presets: [${presets}] })`,
        ),
      ).toBe(true);
    }
  });

  it('is true when there is no presets key, which inherits the default wind preset', () => {
    expect(check("export default { theme: { colors: { a: '#111111' } } }")).toBe(true);
  });

  it('is null when the presets cannot be read, which is not the same as "no"', () => {
    expect(check('export default { presets: shared, theme: {} }')).toBeNull();
    expect(check('export default { presets: [...shared], theme: {} }')).toBeNull();
    expect(check('module.exports = require("./base")')).toBeNull();
    expect(check('export default { presets: [')).toBeNull();
  });
});
