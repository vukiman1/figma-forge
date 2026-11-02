const HEX_LITERAL = /^#([0-9a-fA-F]{3,8})$/;
const SHORTHAND_LENGTH = 3;
const WITH_ALPHA_LENGTH = 8;
const RGB_LENGTH = 6;
const OPAQUE_ALPHA = 'FF';

const expandShorthand = (digits: string): string =>
  digits.length === SHORTHAND_LENGTH
    ? digits
        .split('')
        .map(c => c + c)
        .join('')
    : digits;

const dropOpaqueAlpha = (digits: string): string =>
  digits.length === WITH_ALPHA_LENGTH && digits.slice(RGB_LENGTH).toUpperCase() === OPAQUE_ALPHA
    ? digits.slice(0, RGB_LENGTH)
    : digits;

export const normHex = (raw: string): string | null => {
  const match = HEX_LITERAL.exec(raw.trim());
  if (match === null) return null;
  return `#${dropOpaqueAlpha(expandShorthand(match[1] ?? '')).toUpperCase()}`;
};
