import { describe, expect, it } from 'vitest';

import type { ProjectInput } from '../../src/profile/project-input.js';
import { detectProfile, type ProfileStyling } from '../../src/profile/project-profile.js';
import { isUtilityFirst } from '../../src/profile/styling-system.js';

interface Signals {
  readonly v3?: boolean;
  readonly uno?: boolean;
  readonly css?: boolean;
  readonly deps?: Record<string, string>;
  readonly unoVocab?: boolean;
}

const detect = ({ v3, uno, css, deps, unoVocab }: Signals): ProfileStyling => {
  const presentConfigFiles: string[] = [];
  if (v3 === true) presentConfigFiles.push('tailwind.config.ts');
  if (uno === true) presentConfigFiles.push('uno.config.ts');
  const input: ProjectInput = {
    rootDir: '/x',
    packageJson: { devDependencies: deps ?? {} },
    hasTsconfig: true,
    presentConfigFiles,
    cssScanOmitted: 0,
    ...(css === true ? { tailwindCssEntry: 'src/app.css' } : {}),
    ...(unoVocab === undefined ? {} : { unoConfigDeclaresVocabulary: unoVocab }),
  };
  return detectProfile(input).styling;
};

const TW3 = { tailwindcss: '^3.4.0' };
const TW4 = { tailwindcss: '^4.0.0', '@tailwindcss/vite': '^4.0.0' };
const UNO = { unocss: '^66.0.0' };

describe('styling cascade matrix', () => {
  const cases: [name: string, signals: Signals, system: string, configPath: string | undefined][] =
    [
      ['v3 config alone', { v3: true, deps: TW3 }, 'tailwind', 'tailwind.config.ts'],
      ['uno config alone', { uno: true, deps: UNO }, 'unocss', 'uno.config.ts'],
      ['v4 CSS marker + dep', { css: true, deps: TW4 }, 'tailwind', 'src/app.css'],
      ['tailwind dep alone', { deps: TW3 }, 'tailwind', undefined],
      ['unocss dep alone', { deps: UNO }, 'unocss', undefined],
      ['nothing', {}, 'unknown', undefined],

      [
        'uno config vs tailwind dep',
        { uno: true, deps: { ...UNO, ...TW3 } },
        'unocss',
        'uno.config.ts',
      ],
      [
        'v3 config vs unocss dep',
        { v3: true, deps: { ...TW3, ...UNO } },
        'tailwind',
        'tailwind.config.ts',
      ],

      [
        'both config files',
        { v3: true, uno: true, deps: { ...TW3, ...UNO } },
        'tailwind',
        'tailwind.config.ts',
      ],

      [
        'uno config vs live v4',
        { uno: true, css: true, deps: { ...UNO, ...TW4 } },
        'tailwind',
        'src/app.css',
      ],
      [
        'uno config vs orphan CSS marker left by a migration',
        { uno: true, css: true, deps: UNO },
        'unocss',
        'uno.config.ts',
      ],
      [
        'uno config vs CSS marker backed only by a v3 dep',
        { uno: true, css: true, deps: { ...UNO, ...TW3 } },
        'unocss',
        'uno.config.ts',
      ],

      [
        'icons-only uno config overrules the umbrella dep it still installs',
        { uno: true, deps: UNO, unoVocab: false },
        'unknown',
        undefined,
      ],
      [
        'uno config loading a wind preset',
        { uno: true, deps: UNO, unoVocab: true },
        'unocss',
        'uno.config.ts',
      ],
      [
        'uno config with unreadable presets, assumed to load a wind preset',
        { uno: true, deps: UNO },
        'unocss',
        'uno.config.ts',
      ],
      [
        'icons-only uno config beside sass',
        { uno: true, deps: { ...UNO, sass: '^1.0.0' }, unoVocab: false },
        'scss',
        undefined,
      ],

      ['@unocss/reset only', { deps: { '@unocss/reset': '^66.0.0' } }, 'unknown', undefined],
      ['icons-only UnoCSS', { deps: { '@unocss/preset-icons': '^66.0.0' } }, 'unknown', undefined],
      ['@unocss/nuxt', { deps: { '@unocss/nuxt': '^66.0.0' } }, 'unocss', undefined],

      ['v3 config, no dep', { v3: true }, 'tailwind', 'tailwind.config.ts'],

      ['sass alone', { deps: { sass: '^1.0.0' } }, 'scss', undefined],
      ['sass loses to unocss', { deps: { sass: '^1.0.0', ...UNO } }, 'unocss', undefined],
    ];

  for (const [name, signals, system, configPath] of cases) {
    it(`${name} → ${system}${configPath === undefined ? '' : ` (${configPath})`}`, () => {
      const styling = detect(signals);
      expect(styling.system).toBe(system);
      expect(styling.configPath).toBe(configPath);
    });
  }

  it('every row that resolves to a utility framework reports utility-first, and no other row does', () => {
    for (const [name, signals, system] of cases) {
      const styling = detect(signals);
      expect(
        { name, utilityFirst: isUtilityFirst(styling.system) },
        `${name}: utility-first must track the framework, since it decides whether a token's utility base is emitted as a class`,
      ).toEqual({ name, utilityFirst: system === 'tailwind' || system === 'unocss' });
    }
  });
});
