import { describe, expect, it } from 'vitest';

import { parseUno, unoConfig } from './js-config-fixtures.js';

describe('parseUnoConfig', () => {
  describe('wind3-era vocabulary (presetUno / presetWind3 / presetMini)', () => {
    it('emits the same token vocabulary as the equivalent Tailwind config', () => {
      const { byName } = parseUno(
        unoConfig('presetUno()', "colors: { primary: { 500: '#6266F0' } }"),
      );
      expect(byName.get('color-primary-500')).toEqual({
        name: 'color-primary-500',
        value: '#6266F0',
        utility: 'primary-500',
        category: 'color',
        utilityIsClass: true,
      });
    });

    it('reads breakpoints and easing, which Tailwind calls screens and transitionTimingFunction', () => {
      const { byName } = parseUno(
        unoConfig(
          'presetUno()',
          `breakpoints: { tablet: '768px' },
           easing: { swift: 'cubic-bezier(0.4,0,0.2,1)' },`,
        ),
      );
      expect(byName.get('breakpoint-tablet')?.value).toBe('768px');
      expect(byName.get('ease-swift')?.utility).toBe('swift');
    });

    it("ignores the Tailwind spellings, which UnoCSS's own theme has no keys for", () => {
      const { tokens } = parseUno(
        unoConfig(
          'presetUno()',
          `screens: { desktop: '1400px' },
           transitionTimingFunction: { swifty: 'linear' },
           aspectRatio: { golden: '1.618' },`,
        ),
      );
      expect(tokens).toEqual([]);
    });

    it('leaves the structured animation and container options objects alone', () => {
      const { tokens } = parseUno(
        unoConfig(
          'presetUno()',
          `animation: { keyframes: { spin: 'from{}' }, durations: { spin: '1s' } },
           container: { center: true, padding: '1rem' },`,
        ),
      );
      expect(tokens).toEqual([]);
    });
  });

  describe('wind4 vocabulary', () => {
    const wind4Theme = `colors: { primary: { 500: '#6266F0', DEFAULT: '#111' } },
       text: { huge: { fontSize: '48px', lineHeight: '1.1' } },
       font: { display: 'Inter' },
       tracking: { loose2: '0.1em' },
       leading: { tall2: '2.5' },
       radius: { blob: '14px' },
       shadow: { card: '0 1px 2px #0001' },
       breakpoint: { tablet: '768px' },
       container: { prose2: '65ch' },
       ease: { swift: 'linear' },`;

    it('switches vocabulary when the presets name wind4', () => {
      const { byName } = parseUno(unoConfig('presetWind4()', wind4Theme));
      expect([...byName.keys()].toSorted()).toEqual([
        'breakpoint-tablet',
        'color-primary',
        'color-primary-500',
        'container-prose2',
        'ease-swift',
        'font-display',
        'leading-tall2',
        'radius-blob',
        'shadow-card',
        'text-huge',
        'tracking-loose2',
      ]);
    });

    it('takes fontSize out of a text entry rather than descending into it', () => {
      const { byName } = parseUno(unoConfig('presetWind4()', wind4Theme));
      expect(byName.get('text-huge')?.value).toBe('48px');
      expect(byName.has('text-huge-fontSize')).toBe(false);
      expect(byName.has('text-huge-lineHeight')).toBe(false);
    });

    it('skips a text entry with no fontSize, which UnoCSS allows, instead of flattening its other options', () => {
      const { tokens, skipped } = parseUno(
        unoConfig('presetWind4()', "text: { huge: { lineHeight: '1.1', letterSpacing: '0.1em' } }"),
      );
      expect(tokens).toEqual([]);
      expect(skipped).toBe(1);
    });

    it('still reads a text entry written as a bare size string', () => {
      const { byName } = parseUno(unoConfig('presetWind4()', "text: { huge: '48px' }"));
      expect(byName.get('text-huge')?.value).toBe('48px');
    });

    it('reads container as a scale here, unlike in wind3 where it is an options object', () => {
      expect(
        parseUno(unoConfig('presetWind4()', wind4Theme)).byName.get('container-prose2')?.value,
      ).toBe('65ch');
      expect(parseUno(unoConfig('presetUno()', "container: { prose2: '65ch' }")).tokens).toEqual(
        [],
      );
    });

    it('identifies a named preset import through any alias, not just a wind-shaped one', () => {
      const theme =
        "colors: { primary: '#111' }, spacing: { xs: '4px' }, container: { prose: '65ch' }";
      for (const alias of ['p', 'x', 'wind']) {
        const { byName } = parseUno(
          `import { presetWind4 as ${alias} } from 'unocss'
           export default { presets: [${alias}()], theme: { ${theme} } }`,
        );
        expect([...byName.keys()].toSorted()).toEqual([
          'color-primary',
          'container-prose',
          'spacing-xs',
        ]);
      }
    });

    it('switches on the import source, so a renamed binding still resolves', () => {
      const theme = `theme: { radius: { blob: '14px' }, text: { huge: { fontSize: '48px' } } }`;
      for (const code of [
        `import w4 from '@unocss/preset-wind4'\nexport default { presets: [w4()], ${theme} }`,
        `import { presetWind4 as wind } from 'unocss'\nexport default { presets: [wind()], ${theme} }`,
        `import presetWind4 from '@unocss/preset-wind4'\nexport default { presets: [presetWind4], ${theme} }`,
      ]) {
        expect([...parseUno(code).byName.keys()].toSorted()).toEqual(['radius-blob', 'text-huge']);
      }
    });

    it("lets the theme's own keys decide when the presets cannot be read", () => {
      const wind4ish = parseUno(
        `export default { presets: [...sharedPresets], theme: { radius: { blob: '14px' }, shadow: { card: '0 0 1px #000' } } }`,
      );
      expect([...wind4ish.byName.keys()].toSorted()).toEqual(['radius-blob', 'shadow-card']);

      const wind3ish = parseUno(
        `export default { presets: sharedPresets, theme: { fontSize: { huge: '48px' }, borderRadius: { blob: '14px' } } }`,
      );
      expect([...wind3ish.byName.keys()].toSorted()).toEqual(['radius-blob', 'text-huge']);
    });

    it('does not let `container` discriminate, since both vocabularies have it', () => {
      const { tokens } = parseUno(
        `export default { presets: sharedPresets, theme: { container: { center: true, padding: '1rem' } } }`,
      );
      expect(tokens).toEqual([]);
    });

    it('matches preset names whole, so a lookalike does not pin the vocabulary', () => {
      const theme = "radius: { lg: '8px' }, text: { sm: '14px' }";
      for (const [local, from] of [
        ['presetMinimal', './presets/minimal'],
        ['acmeUnoPreset', './presets/acme'],
      ] as const) {
        const { byName } = parseUno(
          `import ${local} from '${from}'
           export default { presets: [${local}(), ...shared], theme: { ${theme} } }`,
        );
        expect([...byName.keys()].toSorted()).toEqual(['radius-lg', 'text-sm']);
      }
      for (const name of ['presetUno', 'presetWind', 'presetWind3', 'presetMini']) {
        const { byName } = parseUno(
          `import { ${name} } from 'unocss'
           export default { presets: [${name}()], theme: { ${theme} } }`,
        );
        expect([...byName.keys()]).toEqual([]);
      }
    });

    it('ignores presets that carry no theme vocabulary when reading the presets array', () => {
      const { byName } = parseUno(
        `import presetIcons from '@unocss/preset-icons'
         export default { presets: [presetIcons(), ...sharedPresets],
           theme: { radius: { lg: '8px' }, text: { sm: { fontSize: '14px' } } } }`,
      );
      expect([...byName.keys()].toSorted()).toEqual(['radius-lg', 'text-sm']);
    });

    it('keeps a readable presets array authoritative over the theme shape', () => {
      const { tokens } = parseUno(
        unoConfig('presetUno()', "container: { center: true, padding: '1rem' }"),
      );
      expect(tokens).toEqual([]);
    });

    it('falls to wind3, which presetUno re-exports, when neither the presets nor the theme identify a vocabulary', () => {
      const { byName } = parseUno(
        `export default { presets: [...sharedPresets], theme: { colors: { brand: '#6266F0' } } }`,
      );
      expect(byName.get('color-brand')?.value).toBe('#6266F0');
    });
  });
});
