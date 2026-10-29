import type { SerializedNode } from '@figma-forge/core';

import { renderBoundsOf } from '../render-bounds.js';
import { applyRepeat } from '../repeat-fields.js';
import { serializeTextPath } from '../text-path.js';

const canPaintPastBox = (node: SceneNode, out: SerializedNode): boolean =>
  out.complexStrokeProperties !== undefined ||
  out.variableWidthStrokeProperties !== undefined ||
  node.type === 'TEXT_PATH' ||
  node.type === 'TRANSFORM_GROUP';

const writeRenderBounds = (node: SceneNode, out: SerializedNode): void => {
  const at = 'absoluteTransform' in node ? node.absoluteTransform : undefined;
  const bounds = renderBoundsOf(
    'absoluteRenderBounds' in node ? node.absoluteRenderBounds : undefined,
    node.absoluteBoundingBox,
    at === undefined ? undefined : { x: at[0][2], y: at[1][2] },
  );
  if (bounds !== undefined) out.renderBounds = bounds;
};

export const writeDrawFields = (node: SceneNode, out: SerializedNode): void => {
  if (node.type === 'TRANSFORM_GROUP') applyRepeat(node, node.transformModifiers, out);
  if (node.type === 'TEXT_PATH') serializeTextPath(node, out);
  if (canPaintPastBox(node, out)) writeRenderBounds(node, out);
};
