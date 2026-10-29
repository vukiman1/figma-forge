const EXPONENT_FORM_THRESHOLD = 1e15;
const DECIMAL_SCALE = 1e6;

export const formatNumber = (value: number): string => {
  if (!(Math.abs(value) < EXPONENT_FORM_THRESHOLD)) {
    throw new RangeError(`coordinate ${value} is out of range`);
  }
  const rounded = Math.round(value * DECIMAL_SCALE) / DECIMAL_SCALE;
  return rounded === 0 ? '0' : String(rounded);
};
