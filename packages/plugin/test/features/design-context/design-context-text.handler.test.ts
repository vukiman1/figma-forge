import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context — text and layout projection', () => {
  it('surfaces non-default typography — style attrs fold into the textStyle bundle, align/truncation inline', async () => {
    const text = node({
      id: 't',
      type: 'TEXT',
      characters: 'BUY NOW',
      fontSize: 14,
      fontName: { family: 'Inter', style: 'Bold' },
      lineHeight: { unit: 'PIXELS', value: 20 },
      letterSpacing: { unit: 'PERCENT', value: 5 },
      textCase: 'UPPER',
      textDecoration: 'UNDERLINE',
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'TOP',
      textTruncation: 'ENDING',
      maxLines: 2,
      paragraphSpacing: 12,
      paragraphIndent: 24,
      textWrapStyle: 'BALANCE',
      textAutoResize: 'HEIGHT',
    });
    const full = (await createGetDesignContextHandler(fakeFigma({ selection: [text] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    const n = full.nodes[0];

    expect(n?.lineHeight).toBeUndefined();
    expect(n?.textCase).toBeUndefined();
    expect(n?.paragraphSpacing).toBeUndefined();
    expect(full.globalVars?.styles[n!.textStyle!]).toEqual({
      fontFamily: 'Inter',
      fontStyle: 'Bold',
      fontSize: 14,
      lineHeight: { unit: 'PIXELS', value: 20 },
      letterSpacing: { unit: 'PERCENT', value: 5 },
      textCase: 'UPPER',
      textDecoration: 'UNDERLINE',
      paragraphSpacing: 12,
      paragraphIndent: 24,
      textWrapStyle: 'BALANCE',
    });
    expect(n?.textAlignHorizontal).toBe('CENTER');
    expect(n?.textAlignVertical).toBeUndefined();
    expect(n?.textTruncation).toBe('ENDING');
    expect(n?.maxLines).toBe(2);
    expect(n?.textAutoResize).toBe('HEIGHT');
  });

  it('omits no-op default typography (plain left-aligned body text stays clean)', async () => {
    const text = node({
      id: 't',
      type: 'TEXT',
      characters: 'hello',
      fontSize: 16,
      fontName: { family: 'Inter', style: 'Regular' },
      lineHeight: { unit: 'AUTO' },
      letterSpacing: { unit: 'PERCENT', value: 0 },
      textCase: 'ORIGINAL',
      textDecoration: 'NONE',
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'TOP',
      textTruncation: 'DISABLED',
      maxLines: null,
      paragraphSpacing: 0,
      paragraphIndent: 0,
      textWrapStyle: 'AUTO',
      textAutoResize: 'WIDTH_AND_HEIGHT',
    });
    const full = (await createGetDesignContextHandler(fakeFigma({ selection: [text] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    const n = full.nodes[0];

    expect(n?.lineHeight).toBeUndefined();
    expect(n?.letterSpacing).toBeUndefined();
    expect(n?.textCase).toBeUndefined();
    expect(n?.textDecoration).toBeUndefined();
    expect(n?.textAlignHorizontal).toBeUndefined();
    expect(n?.textTruncation).toBeUndefined();
    expect(n?.maxLines).toBeUndefined();
    expect(n?.paragraphSpacing).toBeUndefined();
    expect(n?.paragraphIndent).toBeUndefined();
    expect(n?.textWrapStyle).toBeUndefined();
    expect(n?.textAutoResize).toBeUndefined();
    expect(full.globalVars?.styles[n!.textStyle!]).toEqual({
      fontFamily: 'Inter',
      fontStyle: 'Regular',
      fontSize: 16,
    });
  });

  it('omits no-op layout defaults (visible=true / rotation=0 / opacity=1 / cornerRadius=0) but keeps real values', async () => {
    const clean = node({ id: 'clean', rotation: 0, opacity: 1, cornerRadius: 0 });
    const cleanFull = (await createGetDesignContextHandler(fakeFigma({ selection: [clean] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(cleanFull.nodes[0]?.visible).toBeUndefined();
    expect(cleanFull.nodes[0]?.rotation).toBeUndefined();
    expect(cleanFull.nodes[0]?.opacity).toBeUndefined();
    expect(cleanFull.nodes[0]?.cornerRadius).toBeUndefined();

    const real = node({ id: 'real', visible: false, rotation: 90, opacity: 0.5, cornerRadius: 8 });
    const realFull = (await createGetDesignContextHandler(fakeFigma({ selection: [real] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(realFull.nodes[0]).toMatchObject({
      visible: false,
      rotation: 90,
      opacity: 0.5,
      cornerRadius: 8,
    });
  });

  it('surfaces per-run segments for a mixed-style TEXT node (fills simplified to hex), full detail only', async () => {
    const mixed = node({
      id: 'mt',
      type: 'TEXT',
      characters: 'Terms and Privacy Policy',
      fontSize: Symbol('mixed'),
      fontName: { family: 'Inter', style: 'Regular' },
      getStyledTextSegments: () => [
        {
          characters: 'Terms and ',
          start: 0,
          end: 10,
          fontName: { family: 'Inter', style: 'Regular' },
          fontSize: 14,
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
          textDecoration: 'NONE',
          textCase: 'ORIGINAL',
        },
        {
          characters: 'Privacy Policy',
          start: 10,
          end: 24,
          fontName: { family: 'Inter', style: 'Bold' },
          fontSize: 14,
          fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 }, visible: true, opacity: 1 }],
          textDecoration: 'UNDERLINE',
          textCase: 'ORIGINAL',
        },
      ],
    });

    const full = (await createGetDesignContextHandler(fakeFigma({ selection: [mixed] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(full.nodes[0]?.segments).toEqual([
      {
        characters: 'Terms and ',
        start: 0,
        end: 10,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 14,
        fills: [{ type: 'SOLID', color: '#000000' }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
      {
        characters: 'Privacy Policy',
        start: 10,
        end: 24,
        fontName: { family: 'Inter', style: 'Bold' },
        fontSize: 14,
        fills: [{ type: 'SOLID', color: '#0066FF' }],
        textDecoration: 'UNDERLINE',
        textCase: 'ORIGINAL',
      },
    ]);

    const compact = (await createGetDesignContextHandler(fakeFigma({ selection: [mixed] }))({
      detail: 'compact',
    })) as GetDesignContextResult;
    expect(compact.nodes[0]?.segments).toBeUndefined();
  });

  it("surfaces a frame's layoutGrids + overflowDirection at full detail (breakpoint ground truth)", async () => {
    const frame = node({
      id: 'fr',
      type: 'FRAME',
      layoutGrids: [
        { pattern: 'COLUMNS', visible: true, count: 12, gutterSize: 24, alignment: 'STRETCH' },
      ],
      overflowDirection: 'VERTICAL',
    });
    const full = (await createGetDesignContextHandler(fakeFigma({ selection: [frame] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(full.nodes[0]?.layoutGrids).toEqual([
      { pattern: 'COLUMNS', visible: true, count: 12, gutterSize: 24, alignment: 'STRETCH' },
    ]);
    expect(full.nodes[0]?.overflowDirection).toBe('VERTICAL');

    const compact = (await createGetDesignContextHandler(fakeFigma({ selection: [frame] }))({
      detail: 'compact',
    })) as GetDesignContextResult;
    expect(compact.nodes[0]?.layoutGrids).toBeUndefined();
  });

  it('carries per-run hyperlink / listOptions / indentation through to the segments (structure survives)', async () => {
    const list = node({
      id: 'lt',
      type: 'TEXT',
      characters: 'Read the docs\nStar the repo',
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 14,
      textCase: 'ORIGINAL',
      textDecoration: 'NONE',
      getRangeListOptions: () => ({ type: 'ORDERED' }),
      getStyledTextSegments: () => [
        {
          characters: 'Read the docs\n',
          start: 0,
          end: 14,
          fontName: { family: 'Inter', style: 'Regular' },
          fontSize: 14,
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
          textDecoration: 'NONE',
          textCase: 'ORIGINAL',
          listOptions: { type: 'ORDERED' },
          indentation: 1,
          hyperlink: { type: 'URL', value: 'https://x.dev/docs' },
        },
        {
          characters: 'Star the repo',
          start: 14,
          end: 27,
          fontName: { family: 'Inter', style: 'Regular' },
          fontSize: 14,
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
          textDecoration: 'NONE',
          textCase: 'ORIGINAL',
          listOptions: { type: 'ORDERED' },
          indentation: 1,
        },
      ],
    });
    const full = (await createGetDesignContextHandler(fakeFigma({ selection: [list] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(full.nodes[0]?.segments?.[0]).toMatchObject({
      listOptions: 'ORDERED',
      indentation: 1,
      hyperlink: { type: 'URL', value: 'https://x.dev/docs' },
    });
    expect(full.nodes[0]?.segments?.[1]?.listOptions).toBe('ORDERED');
    expect(full.nodes[0]?.segments?.[1]?.hyperlink).toBeUndefined();
  });
});
