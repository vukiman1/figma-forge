import { TAILWIND_V3_SCALES } from './scale-tables.js';
import { type JsConfigTokens, readThemeScales } from './theme-tokens.js';

export const parseTailwindConfig = (filePath: string, code: string): JsConfigTokens =>
  readThemeScales(filePath, code, () => TAILWIND_V3_SCALES);
