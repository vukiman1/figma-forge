import { describe, expect, it } from 'vitest';

import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat — typography', () => {
  it('expands segments when textWrapStyle alone is mixed, and drops the node-level value', () => {
    const uniform = {
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 14,
      fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
      textDecoration: 'NONE',
      textCase: 'ORIGINAL',
    };
    const segments = [
      { ...uniform, characters: 'One\n', start: 0, end: 4, textWrapStyle: 'AUTO' },
      { ...uniform, characters: 'Two', start: 4, end: 7, textWrapStyle: 'BALANCE' },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'One\nTwo',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        textWrapStyle: Symbol('figma.mixed'),
        getStyledTextSegments: () => segments,
      }),
    );
    expect(out.textWrapStyle).toBeUndefined();
    expect(out.segments).toHaveLength(2);
    expect(out.segments?.[0]?.textWrapStyle).toBeUndefined();
    expect(out.segments?.[1]?.textWrapStyle).toBe('BALANCE');
  });

  it('surfaces a node-level uniform hyperlink (whole text is one link)', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Docs',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        hyperlink: { type: 'URL', value: 'https://x.dev' },
        getStyledTextSegments: () => [],
      }),
    );
    expect(out.hyperlink).toEqual({ type: 'URL', value: 'https://x.dev' });
  });

  it('expands segments for a partial hyperlink even when the 5 style basics are uniform', () => {
    const segments = [
      {
        characters: 'Agree to ',
        start: 0,
        end: 9,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
      {
        characters: 'Terms',
        start: 9,
        end: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
        hyperlink: { type: 'URL', value: 'https://x.dev/terms' },
      },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Agree to Terms',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        hyperlink: Symbol('figma.mixed'),
        getStyledTextSegments: () => segments,
      }),
    );
    expect(out.hyperlink).toBeUndefined();
    expect(out.segments).toHaveLength(2);
    expect(out.segments?.[1]?.hyperlink).toEqual({ type: 'URL', value: 'https://x.dev/terms' });
    expect(out.segments?.[0]?.hyperlink).toBeUndefined();
  });

  it('expands segments for a uniform list (probed via getRangeListOptions) and carries listOptions', () => {
    const segments = [
      {
        characters: 'One\nTwo',
        start: 0,
        end: 7,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
        listOptions: { type: 'UNORDERED' },
        indentation: 1,
      },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'One\nTwo',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        getRangeListOptions: () => ({ type: 'UNORDERED' }),
        getStyledTextSegments: () => segments,
      }),
    );
    expect(out.segments).toHaveLength(1);
    expect(out.segments?.[0]?.listOptions).toBe('UNORDERED');
    expect(out.segments?.[0]?.indentation).toBe(1);
  });

  it('skips the list probe entirely for single-line text (the hot-path perf gate)', () => {
    let probed = false;
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Buy now',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        getRangeListOptions: () => {
          probed = true;
          return { type: 'UNORDERED' };
        },
        getStyledTextSegments: () => [],
      }),
    );
    expect(probed).toBe(false);
    expect(out.segments).toBeUndefined();
  });

  it('probes multi-line text but expands no segments when it is not a list (NONE)', () => {
    let probed = false;
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'line one\nline two',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        getRangeListOptions: () => {
          probed = true;
          return { type: 'NONE' };
        },
        getStyledTextSegments: () => [],
      }),
    );
    expect(probed).toBe(true);
    expect(out.segments).toBeUndefined();
  });

  it('carries per-run lineHeight only when non-default, never a mixed marker', () => {
    const segments = [
      {
        characters: 'A',
        start: 0,
        end: 1,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
        lineHeight: { unit: 'PIXELS', value: 22 },
      },
      {
        characters: 'B',
        start: 1,
        end: 2,
        fontName: { family: 'Inter', style: 'Bold' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
        lineHeight: { unit: 'AUTO' },
      },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'AB',
        fontName: Symbol('figma.mixed'),
        fontSize: 14,
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        getStyledTextSegments: () => segments,
      }),
    );
    expect(out.segments?.[0]?.lineHeight).toEqual({ unit: 'PIXELS', value: 22 });
    expect(out.segments?.[1]?.lineHeight).toBeUndefined();
  });

  it('carries per-run token bindings (styleIds + boundVariables) on a mixed run', () => {
    const segments = [
      {
        characters: 'Agree to ',
        start: 0,
        end: 9,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
        textStyleId: '',
        fillStyleId: '',
      },
      {
        characters: 'Terms',
        start: 9,
        end: 14,
        fontName: { family: 'Inter', style: 'Bold' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0.4, b: 1 } }],
        textDecoration: 'UNDERLINE',
        textCase: 'ORIGINAL',
        textStyleId: 'S:link,',
        fillStyleId: 'S:brandfill,',
        boundVariables: { fills: { type: 'VARIABLE_ALIAS', id: 'VariableID:primary' } },
      },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Agree to Terms',
        fontName: Symbol('figma.mixed'),
        fontSize: 14,
        textCase: 'ORIGINAL',
        textDecoration: Symbol('figma.mixed'),
        getStyledTextSegments: () => segments,
      }),
    );
    expect(out.segments?.[0]?.styleIds).toBeUndefined();
    expect(out.segments?.[0]?.boundVariables).toBeUndefined();
    expect(out.segments?.[1]?.styleIds).toEqual({ text: 'S:link,', fill: 'S:brandfill,' });
    expect(out.segments?.[1]?.boundVariables).toEqual({ fills: ['VariableID:primary'] });
  });
});
