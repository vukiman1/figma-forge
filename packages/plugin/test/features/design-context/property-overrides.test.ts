import { DesignContextNodeSchema } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { collectPropertyOverrides } from '../../../src/features/design-context/property-overrides.js';

const SOLID = { type: 'SOLID', color: { r: 1, g: 0, b: 0 } };

const base = (over: Record<string, unknown>): SceneNode =>
  ({
    id: 'x',
    name: 'x',
    type: 'FRAME',
    visible: true,
    locked: false,
    x: 1,
    y: 2,
    width: 10,
    height: 20,
    parent: null,
    ...over,
  }) as unknown as SceneNode;

describe('deduped-instance override entries', () => {
  it('emits only fields the override schema declares, so design_diff records every one', () => {
    const child = base({
      id: 'c',
      name: 'Label',
      visible: false,
      opacity: 0.5,
      cornerRadius: 4,
      cornerSmoothing: 0.6,
      blendMode: 'MULTIPLY',
      fills: [SOLID],
      strokes: [SOLID],
      strokeWeight: 2,
      strokeAlign: 'INSIDE',
      effects: [],
      explicitVariableModes: {},
    });
    const overriddenFields = [
      'visible',
      'fills',
      'strokes',
      'opacity',
      'cornerSmoothing',
      'explicitVariableModes',
    ];
    const instance = {
      id: 'i',
      type: 'INSTANCE',
      children: [child],
      overrides: [{ id: 'c', overriddenFields }],
    } as unknown as InstanceNode;
    const entrySchema = DesignContextNodeSchema.shape.propertyOverrides.unwrap().element.strict();

    const entries = collectPropertyOverrides(instance);

    expect(entries).toHaveLength(1);
    expect(entries.map(entry => entrySchema.safeParse(entry).success)).toEqual([true]);
  });
});
