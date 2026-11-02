import { describe, expect, it } from 'vitest';

import { detectProfile } from '../../src/profile/project-profile.js';
import { isUtilityFirst } from '../../src/profile/styling-system.js';
import { baseInput } from './profile-fixtures.js';

describe('styling detection', () => {
  it('detects Tailwind v3 from a config file and reports version 3', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { tailwindcss: '^3.4.0' } },
        presentConfigFiles: ['tailwind.config.ts'],
      }),
    );
    expect(p.styling.system).toBe('tailwind');
    expect(p.styling.configPath).toBe('tailwind.config.ts');
    expect(p.styling.tailwindVersion).toBe(3);
  });

  it('detects Tailwind v4 CSS-first config (no JS config file) and points configPath at the CSS', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { tailwindcss: '^4.0.0', '@tailwindcss/vite': '^4.0.0' } },
        tailwindCssEntry: 'src/app.css',
      }),
    );
    expect(p.styling.system).toBe('tailwind');
    expect(p.styling.configPath).toBe('src/app.css');
    expect(p.styling.tailwindVersion).toBe(4);
  });

  it('detects Tailwind from the v4-only package even with no config located, defaulting to v4', () => {
    const p = detectProfile(
      baseInput({ packageJson: { devDependencies: { '@tailwindcss/postcss': '^4.0.0' } } }),
    );
    expect(p.styling.system).toBe('tailwind');
    expect(p.styling.tailwindVersion).toBe(4);
    expect(p.styling.configPath).toBeUndefined();
  });

  it('detects UnoCSS from its config file and points configPath at it', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { unocss: '^66.0.0' } },
        presentConfigFiles: ['uno.config.ts'],
      }),
    );
    expect(p.styling.system).toBe('unocss');
    expect(p.styling.configPath).toBe('uno.config.ts');
  });

  it('detects UnoCSS from a scoped package, since the Nuxt and Vite integrations skip the umbrella one', () => {
    const p = detectProfile(
      baseInput({ packageJson: { devDependencies: { '@unocss/nuxt': '^66.0.0' } } }),
    );
    expect(p.styling.system).toBe('unocss');
    expect(p.styling.configPath).toBeUndefined();
  });

  it('lets a root UnoCSS config beat a Tailwind CSS marker left anywhere in a half-migrated repo', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { unocss: '^66.0.0' } },
        presentConfigFiles: ['uno.config.ts'],
        tailwindCssEntry: 'src/legacy.css',
      }),
    );
    expect(p.styling.system).toBe('unocss');
    expect(p.styling.configPath).toBe('uno.config.ts');
  });

  it('still detects Tailwind v4 from its CSS marker when no root config file exists', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { tailwindcss: '^4.0.0' } },
        tailwindCssEntry: 'src/app.css',
      }),
    );
    expect(p.styling.system).toBe('tailwind');
    expect(p.styling.configPath).toBe('src/app.css');
    expect(p.styling.tailwindVersion).toBe(4);
  });

  it('keeps a dependency-backed Tailwind v4 marker over a uno config, as in UnoCSS-for-icons beside v4', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { tailwindcss: '^4.0.0', unocss: '^66.0.0' } },
        presentConfigFiles: ['uno.config.ts'],
        tailwindCssEntry: 'src/app.css',
      }),
    );
    expect(p.styling.system).toBe('tailwind');
    expect(p.styling.configPath).toBe('src/app.css');
    expect(p.styling.tailwindVersion).toBe(4);
  });

  it('does not treat an icons-only UnoCSS install, which generates no scale, as utility-first', () => {
    const p = detectProfile(
      baseInput({ packageJson: { devDependencies: { '@unocss/preset-icons': '^66.0.0' } } }),
    );
    expect(p.styling.system).toBe('unknown');
    expect(isUtilityFirst(p.styling.system)).toBe(false);
  });

  it('does not treat @unocss/reset, a bundle of reset stylesheets any project can import, as UnoCSS', () => {
    const p = detectProfile(
      baseInput({ packageJson: { devDependencies: { '@unocss/reset': '^66.0.0' } } }),
    );
    expect(p.styling.system).toBe('unknown');
  });

  it('lets an UnoCSS config file beat a bare tailwindcss dependency kept for editor tooling', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { tailwindcss: '^3.4.0', unocss: '^66.0.0' } },
        presentConfigFiles: ['uno.config.ts'],
      }),
    );
    expect(p.styling.system).toBe('unocss');
    expect(p.styling.configPath).toBe('uno.config.ts');
  });

  it('keeps Tailwind ahead of UnoCSS when a mid-migration project carries both configs', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { tailwindcss: '^3.4.0', unocss: '^66.0.0' } },
        presentConfigFiles: ['tailwind.config.ts', 'uno.config.ts'],
      }),
    );
    expect(p.styling.system).toBe('tailwind');
    expect(p.styling.configPath).toBe('tailwind.config.ts');
  });

  it('detects SCSS from any sass compiler, including the sass-embedded modern Vite projects use', () => {
    for (const dep of ['sass', 'sass-embedded', 'node-sass']) {
      expect(
        detectProfile(baseInput({ packageJson: { devDependencies: { [dep]: '^1.80.0' } } })).styling
          .system,
      ).toBe('scss');
    }
  });

  it('falls back to scss / unknown styling', () => {
    expect(
      detectProfile(baseInput({ packageJson: { dependencies: { sass: '^1' } } })).styling.system,
    ).toBe('scss');
    expect(detectProfile(baseInput()).styling.system).toBe('unknown');
  });

  it('flags a verdict that rests on a missing Tailwind v4 entry when the CSS scan hit its cap', () => {
    const p = detectProfile(
      baseInput({ packageJson: { devDependencies: { unocss: '^66' } }, cssScanOmitted: 1400 }),
    );
    expect(p.evidence.some(e => e.includes('1400 .css file(s) unread'))).toBe(true);
    expect(p.evidence.some(e => e.includes('a v4 entry cannot be ruled out'))).toBe(true);
  });

  it('says nothing about the CSS scan cap once the Tailwind v4 entry was found', () => {
    const p = detectProfile(
      baseInput({
        packageJson: { devDependencies: { tailwindcss: '^4.0.0' } },
        tailwindCssEntry: 'src/app.css',
        cssScanOmitted: 1400,
      }),
    );
    expect(p.styling.configPath).toBe('src/app.css');
    expect(p.evidence.some(e => e.includes('cannot be ruled out'))).toBe(false);
  });
});
