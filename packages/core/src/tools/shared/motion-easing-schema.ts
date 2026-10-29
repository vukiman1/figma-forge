import { z } from 'zod';

export const MOTION_EASING_TYPES = [
  'EASE_IN',
  'EASE_OUT',
  'EASE_IN_AND_OUT',
  'LINEAR',
  'EASE_IN_BACK',
  'EASE_OUT_BACK',
  'EASE_IN_AND_OUT_BACK',
  'CUSTOM_CUBIC_BEZIER',
  'GENTLE',
  'QUICK',
  'BOUNCY',
  'SLOW',
  'CUSTOM_SPRING',
  'HOLD',
] as const;

const CUSTOM_EASING_PARAMS = {
  CUSTOM_CUBIC_BEZIER: ['easingFunctionCubicBezier', '{ x1, y1, x2, y2 }'],
  CUSTOM_SPRING: ['easingFunctionSpring', '{ bounce } (0–1)'],
} as const;

const requireCustomEasingParams = (
  easing: { type: string; easingFunctionCubicBezier?: unknown; easingFunctionSpring?: unknown },
  ctx: z.RefinementCtx,
): void => {
  if (easing.type !== 'CUSTOM_CUBIC_BEZIER' && easing.type !== 'CUSTOM_SPRING') return;
  const [param, shape] = CUSTOM_EASING_PARAMS[easing.type];
  if (easing[param] === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: [param],
      message: `${easing.type} needs ${param}: ${shape}`,
    });
  }
};

const easingParams = {
  easingFunctionCubicBezier: z
    .object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() })
    .describe('Bezier control points; required for type "CUSTOM_CUBIC_BEZIER"')
    .optional(),
  easingFunctionSpring: z
    .object({ bounce: z.number().min(0).max(1) })
    .describe('Normalized bounce 0–1; required for type "CUSTOM_SPRING"')
    .optional(),
};

export const motionEasingSchema = z
  .object({ type: z.enum(MOTION_EASING_TYPES), ...easingParams })
  .superRefine(requireCustomEasingParams)
  .describe(
    'Motion easing: a named preset, or CUSTOM_CUBIC_BEZIER / CUSTOM_SPRING with its parameters',
  );

export const variableEasingSchema = z
  .looseObject({ type: z.enum(MOTION_EASING_TYPES), ...easingParams })
  .superRefine(requireCustomEasingParams);
