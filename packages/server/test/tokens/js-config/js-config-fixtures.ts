import { parseTailwindConfig } from '../../../src/tokens/js-config/tailwind-config.js';
import type { JsConfigTokens } from '../../../src/tokens/js-config/theme-tokens.js';
import { parseUnoConfig } from '../../../src/tokens/js-config/uno-config.js';
import type { ProjectToken } from '../../../src/tokens/tokens.js';

interface IndexedTokens extends JsConfigTokens {
  readonly byName: ReadonlyMap<string, ProjectToken>;
}

const indexed = (result: JsConfigTokens): IndexedTokens => ({
  ...result,
  byName: new Map(result.tokens.map(token => [token.name, token])),
});

export const parse = (code: string, file = 'tailwind.config.ts'): IndexedTokens =>
  indexed(parseTailwindConfig(file, code));

export const parseUno = (code: string, file = 'uno.config.ts'): IndexedTokens =>
  indexed(parseUnoConfig(file, code));

export const unoConfig = (presets: string, theme: string): string => {
  const wind4 = presets.includes('presetWind4');
  const imports = wind4
    ? "import { defineConfig } from 'unocss'\nimport presetWind4 from '@unocss/preset-wind4'"
    : "import { defineConfig, presetUno } from 'unocss'";
  return `${imports}
   export default defineConfig({ presets: [${presets}], theme: { ${theme} } })`;
};
