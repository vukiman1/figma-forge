import { MIXED } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat', () => {
  it('embeds Dev Mode annotations and the sticky/aspect dimensions only when meaningful', () => {
    const out = serializeFlatSync(
      fake({
        overflowDirection: 'VERTICAL',
        numberOfFixedChildren: 2,
        targetAspectRatio: { x: 16, y: 9 },
        annotations: [{ label: 'brand colour', properties: [{ type: 'fills' }] }],
      }),
    );
    expect(out.numberOfFixedChildren).toBe(2);
    expect(out.targetAspectRatio).toEqual({ x: 16, y: 9 });
    expect(out.annotations).toEqual([{ label: 'brand colour', properties: ['fills'] }]);

    const defaults = serializeFlatSync(
      fake({ numberOfFixedChildren: 0, targetAspectRatio: null, annotations: [] }),
    );
    expect(defaults.numberOfFixedChildren).toBeUndefined();
    expect(defaults.targetAspectRatio).toBeUndefined();
    expect(defaults.annotations).toBeUndefined();

    const degenerate = serializeFlatSync(fake({ targetAspectRatio: { x: 0, y: 9 } }));
    expect(degenerate.targetAspectRatio).toBeUndefined();
  });

  it('serializes a PATTERN paint with its tiling geometry (source node + repeat)', () => {
    const out = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'PATTERN',
            visible: false,
            opacity: 0.8,
            sourceNodeId: '12:34',
            tileType: 'RECTANGULAR',
            scalingFactor: 0.5,
            spacing: { x: 4, y: 8 },
            horizontalAlignment: 'CENTER',
          },
        ],
      }),
    );
    expect(out.fills).toEqual([
      {
        type: 'PATTERN',
        visible: false,
        opacity: 0.8,
        sourceNodeId: '12:34',
        tileType: 'RECTANGULAR',
        scalingFactor: 0.5,
        spacing: { x: 4, y: 8 },
        horizontalAlignment: 'CENTER',
      },
    ]);
  });

  it('omits the no-op pattern defaults (spacing 0,0 / alignment START)', () => {
    const out = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'PATTERN',
            visible: true,
            opacity: 1,
            sourceNodeId: '12:34',
            tileType: 'RECTANGULAR',
            scalingFactor: 1,
            spacing: { x: 0, y: 0 },
            horizontalAlignment: 'START',
            verticalAlignment: 'START',
          },
        ],
      }),
    );
    expect(out.fills).toEqual([
      {
        type: 'PATTERN',
        visible: true,
        opacity: 1,
        sourceNodeId: '12:34',
        tileType: 'RECTANGULAR',
        scalingFactor: 1,
      },
    ]);
  });

  it('carries a pattern’s vertical alignment, which the typings leave out', () => {
    const out = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'PATTERN',
            visible: true,
            opacity: 1,
            sourceNodeId: '12:34',
            tileType: 'RECTANGULAR',
            scalingFactor: 1,
            spacing: { x: 0, y: 0 },
            horizontalAlignment: 'START',
            verticalAlignment: 'END',
          },
        ],
      }),
    );
    expect(out.fills).toEqual([expect.objectContaining({ verticalAlignment: 'END' })]);
    expect(out.fills).toEqual([expect.not.objectContaining({ horizontalAlignment: 'START' })]);
  });

  it('serializes a SHADER paint with its id and each value named by its metadata', () => {
    const out = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'SHADER',
            id: 'shader:grain',
            visible: true,
            opacity: 0.9,
            properties: {
              'def:1': 0.35,
              'def:2': { r: 1, g: 0.5, b: 0, a: 1 },
              'def:3': { type: 'VARIABLE_ALIAS', id: 'VariableID:7:1' },
            },
            propertyMetadata: {
              'def:1': {
                name: 'Intensity',
                type: 'NUMBER',
                defaultValue: 0.5,
                description: 'Grain',
              },
              'def:2': { name: 'Tint', type: 'COLOR', description: '' },
              'def:3': { name: 'Glow', type: 'COLOR' },
            },
          },
        ],
      }),
    );
    expect(out.fills).toEqual([
      {
        type: 'SHADER',
        visible: true,
        opacity: 0.9,
        shaderId: 'shader:grain',
        shaderProperties: [
          { id: 'def:1', name: 'Intensity', type: 'NUMBER', value: 0.35, description: 'Grain' },
          { id: 'def:2', name: 'Tint', type: 'COLOR', value: { r: 1, g: 0.5, b: 0, a: 1 } },
          {
            id: 'def:3',
            name: 'Glow',
            type: 'COLOR',
            value: { type: 'VARIABLE_ALIAS', id: 'VariableID:7:1' },
          },
        ],
      },
    ]);
  });

  it('keeps a SHADER value under its bare id when Figma supplies no metadata for it', () => {
    const out = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'SHADER',
            id: 'shader:wave',
            properties: { 'def:1': { x: 0.2, y: 0.4, x2: 0.8, y2: 0.6 } },
          },
        ],
      }),
    );
    expect(out.fills).toEqual([
      {
        type: 'SHADER',
        visible: true,
        opacity: 1,
        shaderId: 'shader:wave',
        shaderProperties: [{ id: 'def:1', value: { x: 0.2, y: 0.4, x2: 0.8, y2: 0.6 } }],
      },
    ]);
  });

  it('omits shaderProperties for a shader that has none', () => {
    const out = serializeFlatSync(
      fake({ fills: [{ type: 'SHADER', id: 'shader:flat', visible: true, opacity: 1 }] }),
    );
    expect(out.fills).toEqual([
      { type: 'SHADER', visible: true, opacity: 1, shaderId: 'shader:flat' },
    ]);
  });

  it('falls back paint.visible/opacity to defaults when undefined', () => {
    const out = serializeFlatSync(
      fake({ fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] }),
    );
    expect(out.fills).toEqual([
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } },
    ]);
  });

  it('adds text mixin (characters / fontSize / fontName) for TEXT nodes', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Hello',
        fontSize: 16,
        fontName: { family: 'Inter', style: 'Bold' },
      }),
    );
    expect(out.characters).toBe('Hello');
    expect(out.fontSize).toBe(16);
    expect(out.fontName).toEqual({ family: 'Inter', style: 'Bold' });
  });

  it("carries a variable font's axis values on the node-level fontName", () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Hello',
        fontSize: 16,
        fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 650, slnt: -4 } },
      }),
    );
    expect(out.fontName).toEqual({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 650, slnt: -4 },
    });
  });

  it('omits variationSettings entirely for a static font (never an empty object)', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Hello',
        fontSize: 16,
        fontName: { family: 'Inter', style: 'Bold' },
      }),
    );
    expect(out.fontName).toEqual({ family: 'Inter', style: 'Bold' });
    expect(Object.hasOwn(out.fontName as object, 'variationSettings')).toBe(false);
  });

  it('marks fontSize/fontName mixed when figma.mixed', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Mixed',
        fontSize: Symbol('figma.mixed'),
        fontName: Symbol('figma.mixed'),
      }),
    );
    expect(out.fontSize).toBe(MIXED);
    expect(out.fontName).toBe(MIXED);
  });
});

describe('serializeFlat', () => {
  it('omits text mixin for non-TEXT nodes', () => {
    const out = serializeFlatSync(fake({ type: 'RECTANGLE' }));
    expect(out.characters).toBeUndefined();
    expect(out.fontSize).toBeUndefined();
    expect(out.fontName).toBeUndefined();
  });
});
