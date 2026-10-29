import type { SerializedNode } from '@figma-forge/core';

import { writeAppearanceFields } from './appearance.js';
import { writeAutoLayout } from './auto-layout.js';
import { writeDrawFields } from './draw.js';
import { writeEffects } from './effects.js';
import { ownerSizeOf, writeFills } from './fills.js';
import { writeFrameFields } from './frame.js';
import { writeMetadataFields } from './metadata.js';
import { writePlacementFields } from './placement.js';
import { writeStrokeFields } from './strokes.js';
import { writeTextFields } from './text.js';
import { writeTransformFields } from './transform.js';

export const enrichWithMixins = (
  node: SceneNode,
  base: SerializedNode,
  parent: BaseNode | null,
): SerializedNode => {
  const out: SerializedNode = { ...base };
  writeTransformFields(node, out);
  writeAppearanceFields(node, out);
  const ownerSize = ownerSizeOf(out);
  writeFills(node, out, ownerSize);
  writeStrokeFields(node, out, ownerSize);
  writeEffects(node, out, ownerSize);
  writeAutoLayout(node, out);
  writePlacementFields(node, parent, out);
  writeFrameFields(node, out);
  writeMetadataFields(node, out);
  writeDrawFields(node, out);
  if (node.type === 'TEXT') writeTextFields(node, out);
  return out;
};
