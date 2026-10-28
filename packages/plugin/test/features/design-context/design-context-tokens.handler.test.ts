import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context — tokens', () => {
  it('surfaces grounding fields (styleIds / boundVariables / componentProperties) at full detail only', async () => {
    const grounded = node({
      id: 'g',
      type: 'TEXT',
      characters: 'Hi',
      fillStyleId: 'S:fill1',
      textStyleId: 'S:text1',
      boundVariables: { fills: [{ id: 'VariableID:1' }], fontSize: { id: 'VariableID:2' } },
      componentProperties: {
        Size: { type: 'VARIANT', value: 'sm' },
        Disabled: { type: 'BOOLEAN', value: false },
      },
    });

    const full = (await createGetDesignContextHandler(fakeFigma({ selection: [grounded] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(full.nodes[0]).toMatchObject({
      styleIds: { fill: 'S:fill1', text: 'S:text1' },
      boundVariables: { fills: ['VariableID:1'], fontSize: ['VariableID:2'] },
      componentProperties: {
        Size: { type: 'VARIANT', value: 'sm' },
        Disabled: { type: 'BOOLEAN', value: false },
      },
    });

    const compact = (await createGetDesignContextHandler(fakeFigma({ selection: [grounded] }))({
      detail: 'compact',
    })) as GetDesignContextResult;
    expect(compact.nodes[0]?.styleIds).toBeUndefined();
    expect(compact.nodes[0]?.boundVariables).toBeUndefined();
    expect(compact.nodes[0]?.componentProperties).toBeUndefined();
  });

  it('resolves variable + style ids to a deduped top-level token map (full detail), stripping the styleId comma', async () => {
    const a = node({
      id: 'a',
      type: 'TEXT',
      fillStyleId: 'S:text1,',
      boundVariables: { fills: [{ id: 'VariableID:181:4147' }] },
    });
    const b = node({
      id: 'b',
      type: 'TEXT',
      boundVariables: { fills: [{ id: 'VariableID:181:4147' }] },
    });

    const handler = createGetDesignContextHandler(
      fakeFigma({
        selection: [a, b],
        variables: {
          'VariableID:181:4147': {
            name: 'Primary/500',
            resolvedType: 'COLOR',
            codeSyntax: { WEB: '--color-primary', ANDROID: '' },
          },
        },
        styles: { 'S:text1': { name: 'Body/Bold', type: 'TEXT' } },
      }),
    );
    const full = (await handler({ detail: 'full' })) as GetDesignContextResult;

    expect(full.nodes[0]?.styleIds).toEqual({ fill: 'S:text1' });
    expect(full.variables).toEqual({
      'VariableID:181:4147': {
        name: 'Primary/500',
        type: 'COLOR',
        codeSyntax: { WEB: '--color-primary' },
      },
    });
    expect(full.styles).toEqual({ 'S:text1': { name: 'Body/Bold', type: 'TEXT' } });
  });

  it("resolves a mixed TEXT run's per-segment token bindings into the top-level maps", async () => {
    const link = node({
      id: 'lt',
      type: 'TEXT',
      characters: 'Agree to Terms',
      fontName: Symbol('mixed'),
      getStyledTextSegments: () => [
        {
          characters: 'Agree to ',
          start: 0,
          end: 9,
          fontName: { family: 'Inter', style: 'Regular' },
          fontSize: 14,
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
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
          fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 }, visible: true, opacity: 1 }],
          textDecoration: 'UNDERLINE',
          textCase: 'ORIGINAL',
          textStyleId: 'S:linkstyle,',
          fillStyleId: '',
          boundVariables: { fills: { type: 'VARIABLE_ALIAS', id: 'VariableID:primary' } },
        },
      ],
    });

    const full = (await createGetDesignContextHandler(
      fakeFigma({
        selection: [link],
        variables: { 'VariableID:primary': { name: 'Primary/500', resolvedType: 'COLOR' } },
        styles: { 'S:linkstyle': { name: 'Link/Default', type: 'TEXT' } },
      }),
    )({ detail: 'full' })) as GetDesignContextResult;

    const seg = full.nodes[0]?.segments?.[1];
    expect(seg?.styleIds).toEqual({ text: 'S:linkstyle' });
    expect(seg?.boundVariables).toEqual({ fills: ['VariableID:primary'] });
    expect(full.styles).toEqual({ 'S:linkstyle': { name: 'Link/Default', type: 'TEXT' } });
    expect(full.variables).toEqual({
      'VariableID:primary': { name: 'Primary/500', type: 'COLOR' },
    });
  });

  it('omits token maps below full detail and when refs are unresolvable', async () => {
    const ref = node({
      id: 'r',
      type: 'TEXT',
      boundVariables: { fills: [{ id: 'VariableID:9:9' }] },
    });

    const compact = (await createGetDesignContextHandler(
      fakeFigma({
        selection: [ref],
        variables: { 'VariableID:9:9': { name: 'X', resolvedType: 'COLOR' } },
      }),
    )({ detail: 'compact' })) as GetDesignContextResult;
    expect(compact.variables).toBeUndefined();

    const full = (await createGetDesignContextHandler(
      fakeFigma({ selection: [ref], variables: {} }),
    )({ detail: 'full' })) as GetDesignContextResult;
    expect(full.variables).toBeUndefined();
    expect(full.nodes[0]?.boundVariables).toEqual({ fills: ['VariableID:9:9'] });
  });
});
