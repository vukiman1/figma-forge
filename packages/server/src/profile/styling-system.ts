const STYLING_SYSTEMS = [
  'tailwind',
  'unocss',
  'css-variables',
  'scss',
  'css-modules',
  'plain-css',
  'unknown',
] as const;
export type StylingSystem = (typeof STYLING_SYSTEMS)[number];

export const isUtilityFirst = (system: StylingSystem): boolean =>
  system === 'tailwind' || system === 'unocss';
