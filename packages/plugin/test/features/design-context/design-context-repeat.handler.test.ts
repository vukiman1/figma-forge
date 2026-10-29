import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context — repeat groups', () => {
  it('reads a repeat group inside an instance off its main component’s node', async () => {
    const modifiers = [
      {
        type: 'REPEAT',
        repeatType: 'LINEAR',
        axis: 'VERTICAL',
        unitType: 'PIXELS',
        offset: 10,
        count: 2,
      },
    ];
    const at = (x: number, y: number) => [
      [1, 0, x],
      [0, 1, y],
    ];
    const group = node({
      id: 'I1:1;2:2',
      type: 'TRANSFORM_GROUP',
      absoluteTransform: at(0, 0),
      absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
      absoluteRenderBounds: { x: 0, y: 0, width: 10, height: 20 },
      transformModifiers: [],
      children: [],
    });
    (group as unknown as { children: unknown[] }).children.push(
      node({ id: 'I1:1;3:3', absoluteTransform: at(0, 0), parent: group }),
    );
    const figmaCtx = fakeFigma({
      selection: [group],
      lookup: {
        '2:2': { type: 'TRANSFORM_GROUP', transformModifiers: modifiers } as unknown as BaseNode,
      },
    });
    const result = (await createGetDesignContextHandler(figmaCtx)({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(result.nodes[0]?.transformModifiers).toEqual(modifiers);
    expect(result.nodes[0]?.repeatTransforms).toEqual(['translate(0px, 10px)']);
  });
});
