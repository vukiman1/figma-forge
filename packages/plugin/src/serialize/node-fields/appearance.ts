import type { SerializedNode } from '@figma-forge/core';

import { fieldOf, numberFieldOf, stringFieldOf } from '../field-of.js';
import { writeCornerFields } from './corners.js';

const DEFAULT_BLEND_MODE = 'PASS_THROUGH';
const FULL_TURN_RAD = Math.PI * 2;
const FULL_DISC_TOLERANCE_RAD = 1e-4;

const writeMask = (node: SceneNode, out: SerializedNode): void => {
  if (fieldOf(node, 'isMask') !== true) return;
  out.isMask = true;
  const maskType = stringFieldOf(node, 'maskType');
  if (maskType !== undefined) out.maskType = maskType;
};

const writeArcData = (node: SceneNode, out: SerializedNode): void => {
  if (!('arcData' in node)) return;
  const arc = node.arcData;
  const sweep = arc.endingAngle - arc.startingAngle;
  const isFullDisc = arc.innerRadius === 0 && sweep >= FULL_TURN_RAD - FULL_DISC_TOLERANCE_RAD;
  if (isFullDisc) return;
  out.arcData = {
    startingAngle: arc.startingAngle,
    endingAngle: arc.endingAngle,
    innerRadius: arc.innerRadius,
  };
};

export const writeAppearanceFields = (node: SceneNode, out: SerializedNode): void => {
  const opacity = numberFieldOf(node, 'opacity');
  if (opacity !== undefined) out.opacity = opacity;
  writeCornerFields(node, out);
  const blendMode = stringFieldOf(node, 'blendMode');
  if (blendMode !== undefined && blendMode !== DEFAULT_BLEND_MODE) out.blendMode = blendMode;
  writeMask(node, out);
  writeArcData(node, out);
};
