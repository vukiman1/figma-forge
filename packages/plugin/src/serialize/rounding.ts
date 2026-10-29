const HUNDREDTHS = 100;
const TEN_THOUSANDTHS = 1e4;
const MILLIONTHS = 1e6;

export const round2 = (value: number): number => {
  const rounded = Math.round(value * HUNDREDTHS) / HUNDREDTHS;
  return Object.is(rounded, -0) ? 0 : rounded;
};

export const round4 = (value: number): number =>
  Math.round(value * TEN_THOUSANDTHS) / TEN_THOUSANDTHS;

export const round6 = (value: number): number => Math.round(value * MILLIONTHS) / MILLIONTHS;
