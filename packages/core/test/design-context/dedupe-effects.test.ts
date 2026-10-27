import { describe, expect, it } from 'vitest';

import { dedupeStyles, type DesignContextNode } from '../../src/index.js';
import { solid } from './fixtures.js';

describe('dedupeStyles — effects and strokes', () => {
  it('carries a SHADER effect through the effect ref', () => {
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'a',
        name: 'a',
        type: 'RECTANGLE',
        effects: [
          {
            type: 'SHADER',
            visible: true,
            shaderId: 'shader:glow',
            shaderProperties: [
              { id: 'd1', name: 'Glow', type: 'COLOR', value: { r: 0, g: 1, b: 0 } },
            ],
          },
        ],
      },
    ]);
    expect(globalVars.styles[nodes[0]!.effect!]).toEqual([
      {
        type: 'SHADER',
        shaderId: 'shader:glow',
        shaderProperties: [{ name: 'Glow', type: 'COLOR', value: '#00FF00' }],
      },
    ]);
  });

  it('hoists effects (drop-shadow) and strokes into refs, converting colors to hex', () => {
    const n: DesignContextNode = {
      id: 'card',
      name: 'card',
      type: 'FRAME',
      strokes: [solid(0.9, 0.9, 0.9)],
      strokeWeight: 1,
      effects: [
        {
          type: 'DROP_SHADOW',
          visible: true,
          radius: 8,
          spread: 0,
          offset: { x: 0, y: 2 },
          color: { r: 0, g: 0, b: 0, a: 0.25 },
        },
      ],
    };
    const { nodes, globalVars } = dedupeStyles([n]);

    expect(nodes[0]?.strokes).toBeUndefined();
    expect(nodes[0]?.effects).toBeUndefined();
    expect(nodes[0]?.strokeWeight).toBe(1);
    expect(globalVars.styles[nodes[0]!.stroke!]).toEqual([{ type: 'SOLID', color: '#E6E6E6' }]);
    expect(globalVars.styles[nodes[0]!.effect!]).toEqual([
      { type: 'DROP_SHADOW', color: '#00000040', offset: { x: 0, y: 2 }, radius: 8, spread: 0 },
    ]);
  });

  it('hoists noise effects with every setting, both colours as hex', () => {
    const n: DesignContextNode = {
      id: 'grain',
      name: 'grain',
      type: 'FRAME',
      effects: [
        {
          type: 'NOISE',
          visible: true,
          noiseType: 'DUOTONE',
          noiseSizeVector: { x: 0.5, y: 0.5 },
          density: 1,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          secondaryColor: { r: 1, g: 1, b: 1, a: 0.25 },
        },
        {
          type: 'NOISE',
          visible: true,
          noiseType: 'MULTITONE',
          noiseSizeVector: { x: 4.5, y: 4.5 },
          density: 1,
          opacity: 0.7,
        },
      ],
    };
    const { nodes, globalVars } = dedupeStyles([n]);

    expect(globalVars.styles[nodes[0]!.effect!]).toEqual([
      {
        type: 'NOISE',
        noiseType: 'DUOTONE',
        noiseSizeVector: { x: 0.5, y: 0.5 },
        density: 1,
        color: '#00000040',
        secondaryColor: '#FFFFFF40',
      },
      {
        type: 'NOISE',
        noiseType: 'MULTITONE',
        noiseSizeVector: { x: 4.5, y: 4.5 },
        density: 1,
        opacity: 0.7,
      },
    ]);
  });

  it('hoists glass, texture, progressive-blur and shadow-behind effects with every setting', () => {
    const effects = [
      {
        type: 'GLASS',
        visible: true,
        radius: 4,
        lightIntensity: 0.6,
        lightAngle: -45,
        refraction: 0.8,
        depth: 20,
        dispersion: 0.3,
        splay: 0.5,
      },
      {
        type: 'TEXTURE',
        visible: true,
        radius: 3,
        noiseSizeVector: { x: 6, y: 12 },
        clipToShape: true,
      },
      {
        type: 'BACKGROUND_BLUR',
        visible: true,
        radius: 16,
        blurType: 'PROGRESSIVE' as const,
        startRadius: 0,
        startOffset: { x: 0, y: 0.5 },
        endOffset: { x: 1, y: 0.5 },
        cssLayers: ['backdrop-filter: blur(1.80px)'],
      },
      {
        type: 'DROP_SHADOW',
        visible: true,
        radius: 12,
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        offset: { x: 0, y: 8 },
        spread: 0,
        showShadowBehindNode: true as const,
        blendMode: 'MULTIPLY',
      },
    ];
    const { nodes, globalVars } = dedupeStyles([{ id: 'n', name: 'n', type: 'FRAME', effects }]);
    const [glass, texture, blur, shadow] = globalVars.styles[nodes[0]!.effect!] as Record<
      string,
      unknown
    >[];
    const { visible: _g, ...glassRest } = effects[0]!;
    expect(glass).toEqual(glassRest);
    expect(texture).toEqual({
      type: 'TEXTURE',
      radius: 3,
      noiseSizeVector: { x: 6, y: 12 },
      clipToShape: true,
    });
    expect(blur).toMatchObject({
      blurType: 'PROGRESSIVE',
      startRadius: 0,
      cssLayers: ['backdrop-filter: blur(1.80px)'],
    });
    expect(shadow).toMatchObject({
      color: '#00000080',
      showShadowBehindNode: true,
      blendMode: 'MULTIPLY',
    });
  });

  it('keeps the mark on a background blur Figma does not draw', () => {
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'n',
        name: 'n',
        type: 'FRAME',
        effects: [{ type: 'BACKGROUND_BLUR', visible: true, radius: 16, drawn: false }],
      },
    ]);
    expect(globalVars.styles[nodes[0]!.effect!]).toEqual([
      { type: 'BACKGROUND_BLUR', radius: 16, drawn: false },
    ]);
  });

  it('keeps two noises that differ only in grain height apart', () => {
    const grain = (y: number): DesignContextNode => ({
      id: `g${y}`,
      name: `g${y}`,
      type: 'FRAME',
      effects: [
        {
          type: 'NOISE',
          visible: true,
          noiseType: 'MONOTONE',
          noiseSizeVector: { x: 5, y },
          density: 0.6,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
        },
      ],
    });
    const { nodes } = dedupeStyles([grain(5), grain(10)]);
    expect(nodes[0]?.effect).not.toBe(nodes[1]?.effect);
  });
});
