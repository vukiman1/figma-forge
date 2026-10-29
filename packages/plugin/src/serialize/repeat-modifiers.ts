import type { SerializedTransformModifier } from '@figma-forge/core';

import { type Affine, compose, translation } from '../geometry/affine.js';
import type { Box } from './repeat-box.js';

const FULL_TURN_DEG = 360;
const HALF_TURN_DEG = 180;

interface Repeat {
  readonly repeatType: SerializedTransformModifier['repeatType'];
  readonly axis: SerializedTransformModifier['axis'];
  readonly unitType: SerializedTransformModifier['unitType'];
  readonly offset: number;
  readonly count: number;
}

interface RepeatStep {
  readonly steps: readonly Affine[];
  readonly content: Box;
}

export const asRepeat = (m: SerializedTransformModifier): Repeat | undefined => {
  if (m.type !== 'REPEAT' || typeof m.count !== 'number' || typeof m.offset !== 'number') {
    return undefined;
  }
  if (m.count < 1) return undefined;
  return {
    repeatType: m.repeatType,
    axis: m.axis,
    unitType: m.unitType,
    offset: m.offset,
    count: m.count,
  };
};

const turnAbout = (deg: number, cx: number, cy: number): Affine => {
  const rad = (deg * Math.PI) / HALF_TURN_DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return compose(
    translation(cx, cy),
    compose(
      [
        [cos, -sin, 0],
        [sin, cos, 0],
      ],
      translation(-cx, -cy),
    ),
  );
};

const linearStep = (m: Repeat, content: Box): RepeatStep => {
  const isHorizontal = m.axis !== 'VERTICAL';
  const size = isHorizontal ? content.maxX - content.minX : content.maxY - content.minY;
  const step = m.unitType === 'RELATIVE' ? m.offset * size : m.offset;
  const steps = Array.from({ length: m.count }, (_, k) =>
    isHorizontal ? translation(k * step, 0) : translation(0, k * step),
  );
  if (step <= 0) return { steps, content };
  const reach = (m.count - 1) * step;
  return {
    steps,
    content: isHorizontal
      ? { ...content, maxX: content.maxX + reach }
      : { ...content, maxY: content.maxY + reach },
  };
};

const radialStep = (m: Repeat, content: Box): RepeatStep => {
  const height = content.maxY - content.minY;
  const radius = (m.unitType === 'RELATIVE' ? m.offset * height : m.offset) / 2;
  const cx = (content.minX + content.maxX) / 2;
  const cy = (content.minY + content.maxY) / 2 + radius;
  const steps = Array.from({ length: m.count }, (_, k) =>
    turnAbout((k * FULL_TURN_DEG) / m.count, cx, cy),
  );
  const reach = Math.max(
    Math.hypot(content.minX - cx, content.minY - cy),
    Math.hypot(content.maxX - cx, content.minY - cy),
    Math.hypot(content.minX - cx, content.maxY - cy),
    Math.hypot(content.maxX - cx, content.maxY - cy),
  );
  return {
    steps,
    content: { minX: cx - reach, minY: cy - reach, maxX: cx + reach, maxY: cy + reach },
  };
};

export const repeatStep = (m: Repeat, content: Box): RepeatStep | undefined => {
  if (m.repeatType === 'LINEAR') return linearStep(m, content);
  if (m.repeatType === 'RADIAL') return radialStep(m, content);
  return undefined;
};
