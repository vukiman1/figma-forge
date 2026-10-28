import type { SerializedNode } from '@figma-forge/core';

import { serializeTrees } from '../../src/serialize/serialize-runs.js';

export const serializeTree = async (node: SceneNode): Promise<SerializedNode> =>
  (await serializeTrees([node])).nodes[0]!;

export const fake = (overrides: Record<string, unknown> = {}): SceneNode =>
  ({
    id: '1:2',
    name: 'Node',
    type: 'RECTANGLE',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    parent: { id: '1:1' },
    ...overrides,
  }) as unknown as SceneNode;
