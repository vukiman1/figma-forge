import { describe, expect, it } from 'vitest';

import { parseTailwindConfig } from '../../../src/tokens/js-config/tailwind-config.js';
import { parse } from './js-config-fixtures.js';

describe('parseTailwindConfig', () => {
  describe('locating the config object', () => {
    const theme = "{ theme: { extend: { colors: { brand: '#6266F0' } } } }";
    const brand = (code: string, file?: string): string | undefined =>
      parse(code, file).byName.get('color-brand')?.value;

    it('reads `export default { … }`', () => {
      expect(brand(`export default ${theme};`)).toBe('#6266F0');
    });

    it('reads `module.exports = { … }`', () => {
      expect(brand(`module.exports = ${theme};`, 'tailwind.config.js')).toBe('#6266F0');
    });

    it('reads an identifier default export declared in the same file', () => {
      expect(
        brand(`import type { Config } from 'tailwindcss';
        const config: Config = ${theme};
        export default config;`),
      ).toBe('#6266F0');
    });

    it('reads through `satisfies` / `as` / a defineConfig-style wrapper', () => {
      expect(brand(`export default ${theme} satisfies Config;`)).toBe('#6266F0');
      expect(brand(`export default ${theme} as Config;`)).toBe('#6266F0');
      expect(brand(`export default defineConfig(${theme});`)).toBe('#6266F0');
    });

    it('reports themeFound: false for a config whose theme it cannot see, and never throws', () => {
      const unreachable = { tokens: [], skipped: 0, themeFound: false };
      expect(
        parseTailwindConfig('tailwind.config.js', "module.exports = require('./theme')"),
      ).toEqual(unreachable);
      expect(parseTailwindConfig('tailwind.config.ts', 'export default {};')).toEqual(unreachable);
      expect(parseTailwindConfig('tailwind.config.js', 'module.exports = { theme: {')).toEqual(
        unreachable,
      );
    });

    it('distinguishes an empty `extend: {}` theme from an unreachable one', () => {
      expect(
        parseTailwindConfig('tailwind.config.js', 'module.exports = { theme: { extend: {} } };'),
      ).toEqual({ tokens: [], skipped: 0, themeFound: true });
    });
  });

  describe('token shape', () => {
    it('emits the same name / utility / category vocabulary the v4 @theme path emits', () => {
      const { byName } = parse(`export default {
        theme: { extend: { colors: { primary: { 500: '#6266F0' } } } },
      };`);
      expect(byName.get('color-primary-500')).toEqual({
        name: 'color-primary-500',
        value: '#6266F0',
        utility: 'primary-500',
        category: 'color',
        utilityIsClass: true,
      });
    });

    it('carries no cssVar — v3 declares no custom properties', () => {
      const { tokens } = parse("export default { theme: { colors: { brand: '#fff' } } };");
      expect(tokens.every(t => t.cssVar === undefined)).toBe(true);
    });

    it('maps every scale that has an unambiguous v4 namespace', () => {
      const { byName } = parse(`export default {
        theme: { extend: {
          spacing: { 4.5: '1.125rem' },
          fontSize: { sm: '0.875rem' },
          fontFamily: { display: 'Inter' },
          fontWeight: { bold: 700 },
          letterSpacing: { tight: '-0.02em' },
          lineHeight: { snug: '1.375' },
          borderRadius: { lg: '0.5rem' },
          boxShadow: { card: '0 1px 2px rgb(0 0 0 / 0.05)' },
          screens: { tablet: '768px' },
          maxWidth: { prose: '65ch' },
          blur: { xs: '2px' },
          aspectRatio: { golden: '1.618' },
          transitionTimingFunction: { swift: 'cubic-bezier(0.4, 0, 0.2, 1)' },
          animation: { shimmer: 'shimmer 2s linear infinite' },
        } },
      };`);
      expect([...byName.keys()]).toEqual([
        'spacing-4.5',
        'text-sm',
        'font-display',
        'font-weight-bold',
        'tracking-tight',
        'leading-snug',
        'radius-lg',
        'shadow-card',
        'container-prose',
        'blur-xs',
        'breakpoint-tablet',
        'ease-swift',
        'aspect-golden',
        'animate-shimmer',
      ]);
      expect(byName.get('font-weight-bold')?.value).toBe('700');
    });

    it('drops scales with no bare-base utility, like zIndex, without counting them as skipped', () => {
      const { tokens, skipped } = parse(`export default {
        content: ['./src/**/*.tsx'],
        theme: { extend: { zIndex: { modal: '100' }, keyframes: { spin: { to: {} } } } },
      };`);
      expect(tokens).toEqual([]);
      expect(skipped).toBe(0);
    });
  });

  describe('Tailwind key semantics', () => {
    it('collapses a trailing DEFAULT to the parent name', () => {
      const { byName } = parse(`export default {
        theme: { colors: { primary: { DEFAULT: '#111', 500: '#6266F0' } } },
      };`);
      expect(byName.get('color-primary')?.value).toBe('#111');
      expect(byName.get('color-primary-500')?.value).toBe('#6266F0');
      expect(byName.has('color-primary-DEFAULT')).toBe(false);
    });

    it('flattens arbitrarily nested scales', () => {
      const { byName } = parse(`export default {
        theme: { colors: { brand: { accent: { subtle: '#eef' } } } },
      };`);
      expect(byName.get('color-brand-accent-subtle')?.utility).toBe('brand-accent-subtle');
    });

    it('lets theme.extend win a collision with the base theme, as Tailwind does, emitting the name once', () => {
      const { tokens, byName } = parse(`export default {
        theme: {
          colors: { brand: '#000000' },
          extend: { colors: { brand: '#6266F0' } },
        },
      };`);
      expect(byName.get('color-brand')?.value).toBe('#6266F0');
      expect(tokens.filter(t => t.name === 'color-brand')).toHaveLength(1);
    });

    it('reads a string key and a template literal without interpolation', () => {
      const { byName } = parse("export default { theme: { colors: { 'off-white': `#FAFAFA` } } };");
      expect(byName.get('color-off-white')?.value).toBe('#FAFAFA');
    });
  });

  describe('array values', () => {
    it('joins a font stack', () => {
      const { byName } = parse(
        "export default { theme: { fontFamily: { sans: ['Inter', 'ui-sans-serif'] } } };",
      );
      expect(byName.get('font-sans')?.value).toBe('Inter, ui-sans-serif');
    });

    it('joins an array-valued shadow, which Tailwind compiles to every layer', () => {
      const { byName } = parse(
        "export default { theme: { boxShadow: { multi: ['0 1px 2px #0001', '0 4px 8px #0002'] } } };",
      );
      expect(byName.get('shadow-multi')?.value).toBe('0 1px 2px #0001, 0 4px 8px #0002');
    });

    it('takes the size from a [size, lineHeight] pair, which is two plain strings', () => {
      const { byName } = parse(
        "export default { theme: { fontSize: { sm: ['0.875rem', '1.25rem'] } } };",
      );
      expect(byName.get('text-sm')?.value).toBe('0.875rem');
    });

    it('takes the size from a [size, options] font-size entry', () => {
      const { byName } = parse(
        "export default { theme: { fontSize: { sm: ['0.875rem', { lineHeight: '1.25rem' }] } } };",
      );
      expect(byName.get('text-sm')?.value).toBe('0.875rem');
    });
  });

  describe('real configs from upstream projects', () => {
    const nuxtUi = `import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

export default <Partial<Config>>{
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        green: {
          50: '#EFFDF5',
          400: '#00DC82',
          950: '#052e16'
        }
      },
      gridRow: {
        'span-8': 'span 8 / span 8'
      }
    }
  }
}`;

    it('reads the nuxt/ui config through its angle-bracket cast, keeping the primary family of a spread stack', () => {
      const { byName, skipped } = parse(nuxtUi);
      expect(byName.get('color-green-400')).toEqual({
        name: 'color-green-400',
        value: '#00DC82',
        utility: 'green-400',
        category: 'color',
        utilityIsClass: true,
      });
      expect(byName.get('color-green-50')?.value).toBe('#EFFDF5');
      expect(byName.get('font-sans')?.value).toBe('DM Sans');
      expect(byName.has('gridRow-span-8')).toBe(false);
      expect(skipped).toBe(0);
    });

    it('finds no theme in the shadcn-ui config, whose base is spread from a required file', () => {
      const shadcn = `const baseConfig = require("../../tailwind.config.cjs")
module.exports = {
  ...baseConfig,
  content: [
    ...baseConfig.content,
    "content/**/*.mdx",
  ],
}`;
      expect(parseTailwindConfig('tailwind.config.cjs', shadcn)).toEqual({
        tokens: [],
        skipped: 0,
        themeFound: false,
      });
    });
  });

  describe('what it refuses to guess', () => {
    it('skips and counts entries it cannot evaluate by reading them', () => {
      const { byName, skipped } = parse(`export default {
        theme: { extend: { colors: {
          ...require('tailwindcss/colors'),
          [dynamicKey]: '#123456',
          computed: makeColor('primary'),
          interpolated: \`#\${hex}\`,
          brand: '#6266F0',
        } } },
      };`);
      expect([...byName.keys()]).toEqual(['color-brand']);
      expect(skipped).toBe(4);
    });

    it('declines a scale wrapped in a function call, whose input is not the palette that ships', () => {
      const { tokens } = parse(`export default {
        theme: { colors: withOpacity({ primary: '#6266F0' }) },
      };`);
      expect(tokens).toEqual([]);
    });

    it('still unwraps a call at the config level, where it is the config itself', () => {
      for (const code of [
        "export default defineConfig({ theme: { colors: { a: '#111111' } } });",
        "module.exports = withTV({ theme: { colors: { a: '#111111' } } });",
      ]) {
        expect(parse(code).byName.get('color-a')?.value).toBe('#111111');
      }
    });

    it('resolves a scale held in a local const, which is not a guess', () => {
      const { byName } = parse(`const shared = { primary: '#111111' };
        export default { theme: { colors: shared } };`);
      expect(byName.get('color-primary')?.value).toBe('#111111');
    });

    it('counts a whole unreadable scale, without losing the readable ones beside it', () => {
      const { byName, skipped } = parse(`export default {
        theme: { extend: {
          colors: theme => ({ brand: theme('colors.blue.500') }),
          borderRadius: { lg: '0.5rem' },
        } },
      };`);
      expect([...byName.keys()]).toEqual(['radius-lg']);
      expect(skipped).toBe(1);
    });

    it('counts an unreadable extend, which is where most configs keep everything', () => {
      const { tokens, skipped, themeFound } = parseTailwindConfig(
        'tailwind.config.js',
        "module.exports = { theme: { extend: mkTheme({ colors: { a: '#111111' } }) } };",
      );
      expect(tokens).toEqual([]);
      expect(themeFound).toBe(true);
      expect(skipped).toBe(1);
    });

    it('counts one unreadable scale once, even when both theme and extend declare it', () => {
      const { skipped } = parse(
        "export default { theme: { colors: require('a'), extend: { colors: require('b') } } };",
      );
      expect(skipped).toBe(1);
    });

    it('does not count a scale the config never declared, since absent is not unreadable', () => {
      const { skipped } = parse("export default { theme: { borderRadius: { lg: '0.5rem' } } };");
      expect(skipped).toBe(0);
    });
  });
});
