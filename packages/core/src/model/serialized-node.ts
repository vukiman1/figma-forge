import { z } from 'zod';

import {
  nodeAppearanceFields,
  nodeLayoutFields,
  nodeMetadataFields,
  nodeRepeatFields,
  nodeStrokeFields,
  nodeTextFields,
  nodeTransformFields,
} from './node-fields.js';
import { SerializedTextSegmentSchema } from './text.js';

const SerializedNodeBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  visible: z.boolean(),
  locked: z.boolean(),
  parentId: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  ...nodeTransformFields,
  ...nodeAppearanceFields,
  ...nodeStrokeFields,
  ...nodeLayoutFields,
  ...nodeMetadataFields,
  explicitVariableModes: z.record(z.string(), z.string()).optional(),
  ...nodeTextFields,
  segments: z.array(SerializedTextSegmentSchema).optional(),
  ...nodeRepeatFields,
});
export type SerializedNode = z.infer<typeof SerializedNodeBaseSchema> & {
  children?: SerializedNode[] | undefined;
};

const childrenSchema: z.ZodType<SerializedNode[]> = z.lazy(() => z.array(SerializedNodeSchema));

export const SerializedNodeSchema = SerializedNodeBaseSchema.extend({
  children: childrenSchema.optional(),
});

export interface SceneNodeLike {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: { id: string } | null;
}

export const serializeNode = (node: SceneNodeLike): SerializedNode => ({
  id: node.id,
  name: node.name,
  type: node.type,
  visible: node.visible,
  locked: node.locked,
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
  parentId: node.parent === null ? null : node.parent.id,
});
