const NUMERIC_SCALES: ReadonlyMap<string, string> = new Map([
  ['spacing', 'spacing'],
  ['lineheight', 'line-height'],
]);
const FONT_WEIGHT_STEPS: ReadonlyMap<string, string> = new Map([
  ['thin', 'thin'],
  ['hairline', 'thin'],
  ['extralight', 'extralight'],
  ['ultralight', 'extralight'],
  ['light', 'light'],
  ['regular', 'normal'],
  ['normal', 'normal'],
  ['book', 'normal'],
  ['medium', 'medium'],
  ['semibold', 'semibold'],
  ['demibold', 'semibold'],
  ['bold', 'bold'],
  ['extrabold', 'extrabold'],
  ['ultrabold', 'extrabold'],
  ['black', 'black'],
  ['heavy', 'black'],
]);

export interface BuiltinToken {
  scale: string;
  step: string;
}

const normalizeSegment = (raw: string): string => raw.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseNumericStep = (raw: string): string | null => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'px') return 'px';
  const step = normalized.replace(/^(\d+)-(\d+)$/, '$1.$2');
  return /^\d+(?:\.\d+)?$/.test(step) ? step : null;
};

const findNumericToken = (stem: string, rawStep: string): BuiltinToken | null => {
  const scale = NUMERIC_SCALES.get(stem);
  if (scale === undefined) return null;
  const step = parseNumericStep(rawStep);
  return step === null ? null : { scale, step };
};

const findFontWeightToken = (stem: string, rawStep: string): BuiltinToken | null => {
  if (stem !== 'weight' && stem !== 'fontweight') return null;
  const step = FONT_WEIGHT_STEPS.get(normalizeSegment(rawStep));
  return step === undefined ? null : { scale: 'font-weight', step };
};

export const findTailwindBuiltinToken = (figmaName: string): BuiltinToken | null => {
  const segments = figmaName.trim().split('/');
  const rawStep = segments.at(-1);
  if (segments.length < 2 || rawStep === undefined) return null;
  const stem = normalizeSegment(segments.slice(0, -1).join(''));
  return findNumericToken(stem, rawStep) ?? findFontWeightToken(stem, rawStep);
};
