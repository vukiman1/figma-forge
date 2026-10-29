import { describe, expect, it } from 'vitest';

import { serializeEffect } from '../../src/serialize/effect.js';

describe('serializeEffect', () => {
  it('serializes shadows with color / offset / spread', () => {
    const out = serializeEffect(
      {
        type: 'DROP_SHADOW',
        visible: true,
        radius: 4,
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 1, y: 2 },
        spread: 3,
        blendMode: 'NORMAL',
      } as unknown as Effect,
      null,
    );
    expect(out).toEqual({
      type: 'DROP_SHADOW',
      visible: true,
      radius: 4,
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 1, y: 2 },
      spread: 3,
    });
  });

  it('defaults shadow spread to 0 when absent', () => {
    const out = serializeEffect(
      {
        type: 'INNER_SHADOW',
        visible: true,
        radius: 2,
        color: { r: 1, g: 1, b: 1, a: 1 },
        offset: { x: 0, y: 0 },
        blendMode: 'NORMAL',
      } as unknown as Effect,
      null,
    );
    expect(out.spread).toBe(0);
  });

  it('serializes blurs with only type / visible / radius', () => {
    const out = serializeEffect(
      {
        type: 'LAYER_BLUR',
        visible: false,
        radius: 8,
      } as unknown as Effect,
      null,
    );
    expect(out).toEqual({ type: 'LAYER_BLUR', visible: false, radius: 8 });
  });

  it('serializes a SHADER effect with its id and named values', () => {
    const out = serializeEffect(
      {
        type: 'SHADER',
        visible: true,
        id: 'shader:glow',
        properties: { 'def:1': true },
        propertyMetadata: { 'def:1': { name: 'Animate', type: 'BOOLEAN' } },
      } as unknown as Effect,
      null,
    );
    expect(out).toEqual({
      type: 'SHADER',
      visible: true,
      shaderId: 'shader:glow',
      shaderProperties: [{ id: 'def:1', name: 'Animate', type: 'BOOLEAN', value: true }],
    });
  });

  describe('glass, texture, progressive blur and shadow flags', () => {
    it('reads a GLASS effect panel by panel, splay included though the typings omit it', () => {
      const out = serializeEffect(
        {
          type: 'GLASS',
          visible: true,
          radius: 4,
          boundVariables: {},
          refraction: 0.800000011920929,
          depth: 20,
          lightAngle: -45,
          lightIntensity: 0.6000000238418579,
          dispersion: 0.30000001192092896,
          splay: 0.5,
        } as unknown as Effect,
        null,
      );
      expect(out).toEqual({
        type: 'GLASS',
        visible: true,
        radius: 4,
        lightIntensity: 0.6000000238418579,
        lightAngle: -45,
        refraction: 0.800000011920929,
        depth: 20,
        dispersion: 0.30000001192092896,
        splay: 0.5,
      });
    });

    it('leaves splay out where Figma reports null (a glass never given one)', () => {
      const out = serializeEffect(
        {
          type: 'GLASS',
          visible: true,
          radius: 4,
          refraction: 0,
          depth: 1,
          lightAngle: 0,
          lightIntensity: 0,
          dispersion: 0,
          splay: null,
        } as unknown as Effect,
        null,
      );
      expect(out).not.toHaveProperty('splay');
    });

    it('reads a TEXTURE by its grain on each axis, its displacement and its clipping', () => {
      const out = serializeEffect(
        {
          type: 'TEXTURE',
          visible: true,
          radius: 3,
          boundVariables: {},
          noiseSize: 6,
          noiseSizeVector: { x: 6, y: 12 },
          clipToShape: true,
        } as unknown as Effect,
        null,
      );
      expect(out).toEqual({
        type: 'TEXTURE',
        visible: true,
        radius: 3,
        noiseSizeVector: { x: 6, y: 12 },
        clipToShape: true,
      });
    });

    it('reads a progressive blur ramp, with ready CSS when the node size is known', () => {
      const blur = {
        type: 'BACKGROUND_BLUR',
        visible: true,
        radius: 16,
        boundVariables: {},
        blurType: 'PROGRESSIVE',
        startRadius: 0,
        startOffset: { x: 0, y: 0.5 },
        endOffset: { x: 1, y: 0.5 },
      } as unknown as Effect;
      const out = serializeEffect(blur, { width: 200, height: 200 });
      expect(out).toMatchObject({
        type: 'BACKGROUND_BLUR',
        radius: 16,
        blurType: 'PROGRESSIVE',
        startRadius: 0,
        startOffset: { x: 0, y: 0.5 },
        endOffset: { x: 1, y: 0.5 },
      });
      expect(out.cssLayers).toHaveLength(4);
      const styled = serializeEffect(blur, null);
      expect(styled.blurType).toBe('PROGRESSIVE');
      expect(styled).not.toHaveProperty('cssLayers');
    });

    it.each(['LAYER_BLUR', 'BACKGROUND_BLUR'] as const)(
      'reads a normal %s exactly as before',
      type => {
        const out = serializeEffect(
          {
            type,
            visible: true,
            radius: 8,
            boundVariables: {},
            blurType: 'NORMAL',
          } as unknown as Effect,
          { width: 100, height: 100 },
        );
        expect(out).toStrictEqual({ type, visible: true, radius: 8 });
      },
    );

    it('marks a drop shadow that shows behind the node, and a blend that is not normal', () => {
      const out = serializeEffect(
        {
          type: 'DROP_SHADOW',
          visible: true,
          radius: 12,
          boundVariables: {},
          color: { r: 0, g: 0, b: 0, a: 0.5 },
          offset: { x: 0, y: 8 },
          spread: 0,
          blendMode: 'MULTIPLY',
          showShadowBehindNode: true,
        } as unknown as Effect,
        null,
      );
      expect(out).toMatchObject({ showShadowBehindNode: true, blendMode: 'MULTIPLY' });
    });

    it('reads a default shadow exactly as before', () => {
      const out = serializeEffect(
        {
          type: 'DROP_SHADOW',
          visible: true,
          radius: 4,
          boundVariables: {},
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 1, y: 2 },
          spread: 3,
          blendMode: 'NORMAL',
          showShadowBehindNode: false,
        } as unknown as Effect,
        null,
      );
      expect(out).toStrictEqual({
        type: 'DROP_SHADOW',
        visible: true,
        radius: 4,
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 1, y: 2 },
        spread: 3,
      });
    });
  });
});
