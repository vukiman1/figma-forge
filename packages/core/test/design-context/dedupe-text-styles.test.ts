import { describe, expect, it } from 'vitest';

import { dedupeStyles, type DesignContextNode } from '../../src/index.js';
import { textNode } from './fixtures.js';

describe('dedupeStyles — text styles', () => {
  it('keeps two weights of one variable font apart instead of folding them onto a single ref', () => {
    const heading: DesignContextNode = {
      ...textNode('heading', 'Inter', 'Regular', 16),
      fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 700 } },
    };
    const body: DesignContextNode = {
      ...textNode('body', 'Inter', 'Regular', 16),
      fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 400 } },
    };
    const { nodes, globalVars } = dedupeStyles([heading, body]);

    expect(nodes[0]?.textStyle).not.toBe(nodes[1]?.textStyle);
    expect(Object.keys(globalVars.styles)).toHaveLength(2);
    expect(globalVars.styles[nodes[0]!.textStyle!]).toEqual({
      fontFamily: 'Inter',
      fontStyle: 'Regular',
      fontVariationSettings: { wght: 700 },
      fontSize: 16,
    });
  });

  it('still shares one entry when the axis values match', () => {
    const make = (id: string): DesignContextNode => ({
      ...textNode(id, 'Inter', 'Regular', 16),
      fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 550 } },
    });
    const { nodes, globalVars } = dedupeStyles([make('a'), make('b')]);
    expect(Object.keys(globalVars.styles)).toHaveLength(1);
    expect(nodes[0]?.textStyle).toBe(nodes[1]?.textStyle);
  });

  it("leaves a static font's bundle exactly as it was (no empty axis key)", () => {
    const { nodes, globalVars } = dedupeStyles([textNode('s', 'Inter', 'Regular', 16)]);
    expect(globalVars.styles[nodes[0]!.textStyle!]).toEqual({
      fontFamily: 'Inter',
      fontStyle: 'Regular',
      fontSize: 16,
    });
  });

  it('folds paragraphSpacing / paragraphIndent / textWrapStyle into the textStyle bundle (style-level, like lineHeight)', () => {
    const body: DesignContextNode = {
      ...textNode('body', 'Inter', 'Regular', 16),
      paragraphSpacing: 12,
      paragraphIndent: 24,
      textWrapStyle: 'PRETTY',
    };
    const { nodes, globalVars } = dedupeStyles([body]);

    expect(nodes[0]?.paragraphSpacing).toBeUndefined();
    expect(nodes[0]?.paragraphIndent).toBeUndefined();
    expect(nodes[0]?.textWrapStyle).toBeUndefined();
    expect(globalVars.styles[nodes[0]!.textStyle!]).toEqual({
      fontFamily: 'Inter',
      fontStyle: 'Regular',
      fontSize: 16,
      paragraphSpacing: 12,
      paragraphIndent: 24,
      textWrapStyle: 'PRETTY',
    });
  });
});
