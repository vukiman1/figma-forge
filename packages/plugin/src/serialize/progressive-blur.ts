export interface ProgressiveBlurInput {
  readonly type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  readonly radius: number;
  readonly startRadius: number;
  readonly startOffset: { readonly x: number; readonly y: number };
  readonly endOffset: { readonly x: number; readonly y: number };
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export const CSS_BLUR_PER_RADIUS = 0.43;

const RAMP_STEPS = 4;
const CSS_DECIMALS = 2;
const BOX_CENTRE = 0.5;
const PERCENT = 100;
const HALF_TURN_DEGREES = 180;

const fixed = (n: number): string => n.toFixed(CSS_DECIMALS);

export const progressiveMaskLine = (
  width: number,
  height: number,
  start: Point,
  end: Point,
): { angle: number; from: number; to: number } => {
  const angle = Math.atan2((end.x - start.x) * width, -(end.y - start.y) * height);
  const ux = Math.sin(angle);
  const uy = -Math.cos(angle);
  const length = Math.abs(width * ux) + Math.abs(height * uy);
  const at = (p: Point): number =>
    (((p.x - BOX_CENTRE) * width * ux + (p.y - BOX_CENTRE) * height * uy) / length + BOX_CENTRE) *
    PERCENT;
  return { angle: (angle * HALF_TURN_DEGREES) / Math.PI, from: at(start), to: at(end) };
};

const blurProperty = (blur: ProgressiveBlurInput): string =>
  blur.type === 'BACKGROUND_BLUR' ? 'backdrop-filter' : 'filter';

const baseLayer = (blur: ProgressiveBlurInput): string | undefined => {
  if (blur.startRadius > 0) {
    return `${blurProperty(blur)}: blur(${fixed(blur.startRadius * CSS_BLUR_PER_RADIUS)}px)`;
  }
  return blur.type === 'LAYER_BLUR' ? 'filter: none' : undefined;
};

const stepSigma = (blur: ProgressiveBlurInput, step: number): number => {
  const target = (k: number): number =>
    blur.startRadius + ((blur.radius - blur.startRadius) * k) / RAMP_STEPS;
  return blur.type === 'BACKGROUND_BLUR'
    ? Math.sqrt(Math.max(target(step) ** 2 - target(step - 1) ** 2, 0)) * CSS_BLUR_PER_RADIUS
    : target(step) * CSS_BLUR_PER_RADIUS;
};

const rampLayer = (
  blur: ProgressiveBlurInput,
  step: number,
  line: { angle: number; from: number; to: number },
): string => {
  const { angle, from, to } = line;
  const p0 = from + ((to - from) * (step - 1)) / RAMP_STEPS;
  const p1 = from + ((to - from) * step) / RAMP_STEPS;
  return (
    `${blurProperty(blur)}: blur(${fixed(stepSigma(blur, step))}px); mask-image: linear-gradient(` +
    `${fixed(angle)}deg, transparent ${fixed(p0)}%, black ${fixed(p1)}%)`
  );
};

export const cssProgressiveBlurLayers = (
  blur: ProgressiveBlurInput,
  ownerSize: { readonly width: number; readonly height: number } | null,
): string[] | undefined => {
  if (ownerSize === null || ownerSize.width <= 0 || ownerSize.height <= 0) return undefined;
  const { startOffset: start, endOffset: end } = blur;
  if (start.x === end.x && start.y === end.y) return undefined;
  const line = progressiveMaskLine(ownerSize.width, ownerSize.height, start, end);
  const base = baseLayer(blur);
  const layers: string[] = base === undefined ? [] : [base];
  for (let step = 1; step <= RAMP_STEPS; step++) layers.push(rampLayer(blur, step, line));
  return layers;
};
