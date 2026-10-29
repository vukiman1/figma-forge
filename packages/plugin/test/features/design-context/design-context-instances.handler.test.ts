import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context — component instances', () => {
  it.each([0, 0.6])(
    'keeps corner smoothing %s on a deduped instance child override',
    async value => {
      const instance = (id: string, smoothing: number, overridden: boolean) =>
        node({
          id,
          type: 'INSTANCE',
          getMainComponentAsync: async () => ({ id: 'main' }),
          children: [
            node({ id: `${id}-card`, name: 'Card', cornerRadius: 12, cornerSmoothing: smoothing }),
          ],
          overrides: overridden
            ? [{ id: `${id}-card`, overriddenFields: ['cornerSmoothing'] }]
            : [],
        });
      const result = (await createGetDesignContextHandler(
        fakeFigma({
          selection: [instance('first', 1, false), instance('second', value, true)],
        }),
      )({ detail: 'full', dedupeComponents: true })) as GetDesignContextResult;
      expect(result.nodes[1]?.deduped).toBe(true);
      expect(result.nodes[1]?.propertyOverrides).toContainEqual({
        name: 'Card',
        cornerRadius: 12,
        cornerSmoothing: value,
      });
    },
  );

  it('leaves an override that is not about smoothing exactly as it was, with no smoothing 0', async () => {
    const instance = (id: string, opacity: number, overridden: boolean) =>
      node({
        id,
        type: 'INSTANCE',
        getMainComponentAsync: async () => ({ id: 'main' }),
        children: [node({ id: `${id}-card`, name: 'Card', opacity, cornerSmoothing: 0 })],
        overrides: overridden ? [{ id: `${id}-card`, overriddenFields: ['opacity'] }] : [],
      });
    const result = (await createGetDesignContextHandler(
      fakeFigma({ selection: [instance('first', 1, false), instance('second', 0.5, true)] }),
    )({ detail: 'full', dedupeComponents: true })) as GetDesignContextResult;
    expect(result.nodes[1]?.deduped).toBe(true);
    expect(result.nodes[1]?.propertyOverrides).toEqual([{ name: 'Card', opacity: 0.5 }]);
  });

  it.each([
    [
      'a custom brush',
      {
        complexStrokeProperties: {
          type: 'BRUSH',
          brushType: 'STRETCH',
          brushName: 'CUSTOM',
          direction: 'FORWARD',
        },
      },
      false,
    ],
    [
      'a width profile',
      { variableWidthStrokeProperties: { widthProfile: 'TAPER', variableWidthPoints: [] } },
      false,
    ],
    [
      'a plain stroke',
      { complexStrokeProperties: { type: 'BASIC' }, variableWidthStrokeProperties: null },
      true,
    ],
    [
      'a brush on a hidden layer',
      { visible: false, complexStrokeProperties: { type: 'DYNAMIC' } },
      true,
    ],
  ])(
    'with %s inside, a repeated instance is deduped: %s — Figma lists no override for a changed brush',
    async (_label, stroke, deduped) => {
      const instance = (id: string) =>
        node({
          id,
          type: 'INSTANCE',
          getMainComponentAsync: async () => ({ id: 'main' }),
          children: [
            node({
              id: `${id}-frame`,
              children: [node({ id: `${id}-line`, type: 'VECTOR', ...stroke })],
            }),
          ],
          overrides: [],
        });
      const result = (await createGetDesignContextHandler(
        fakeFigma({ selection: [instance('first'), instance('second')] }),
      )({ detail: 'full', dedupeComponents: true })) as GetDesignContextResult;
      expect(result.nodes[1]?.deduped === true).toBe(deduped);
      expect(result.nodes[1]?.children === undefined).toBe(deduped);
    },
  );

  it('dedupes repeated component instances', async () => {
    const main = { id: 'M:1' };
    const mkInstance = (id: string): SceneNode =>
      node({
        id,
        type: 'INSTANCE',
        children: [node({ id: `${id}-child`, type: 'TEXT' })],
        getMainComponentAsync: async () => main,
      });
    const handler = createGetDesignContextHandler(
      fakeFigma({ selection: [mkInstance('i1'), mkInstance('i2')] }),
    );
    const result = (await handler({
      dedupeComponents: true,
      detail: 'minimal',
    })) as GetDesignContextResult;

    expect(result.nodes[0]?.mainComponentId).toBe('M:1');
    expect(result.nodes[0]?.deduped).toBeUndefined();
    expect(result.nodes[0]?.children?.[0]?.id).toBe('i1-child');
    expect(result.nodes[1]?.deduped).toBe(true);
    expect(result.nodes[1]?.children).toBeUndefined();
  });

  it('carries per-instance textOverrides on a deduped instance (text-only, nested, skipping hidden/empty)', async () => {
    const main = { id: 'M:1' };
    const mkInstance = (id: string, title: string, desc: string): SceneNode =>
      node({
        id,
        type: 'INSTANCE',
        children: [
          node({ id: `${id}-title`, name: 'Title', type: 'TEXT', characters: title }),
          node({
            id: `${id}-wrap`,
            type: 'FRAME',
            children: [node({ id: `${id}-desc`, name: 'Desc', type: 'TEXT', characters: desc })],
          }),
          node({ id: `${id}-hid`, name: 'Hidden', type: 'TEXT', characters: 'x', visible: false }),
          node({ id: `${id}-empty`, name: 'Empty', type: 'TEXT', characters: '' }),
        ],
        getMainComponentAsync: async () => main,
      });
    const result = (await createGetDesignContextHandler(
      fakeFigma({
        selection: [mkInstance('i1', 'First', 'Alpha'), mkInstance('i2', 'Second', 'Beta')],
      }),
    )({ dedupeComponents: true, detail: 'minimal' })) as GetDesignContextResult;

    expect(result.nodes[0]?.deduped).toBeUndefined();
    expect(result.nodes[0]?.textOverrides).toBeUndefined();

    expect(result.nodes[1]?.deduped).toBe(true);
    expect(result.nodes[1]?.children).toBeUndefined();
    expect(result.nodes[1]?.textOverrides).toEqual([
      { name: 'Title', characters: 'Second' },
      { name: 'Desc', characters: 'Beta' },
    ]);
  });

  it('carries non-text propertyOverrides on a deduped instance (recoloured / hidden child)', async () => {
    const main = { id: 'M:2' };
    const mkInstance = (id: string, titleFill: unknown, overrides: unknown[]): SceneNode =>
      node({
        id,
        type: 'INSTANCE',
        children: [
          node({
            id: `${id}-title`,
            name: 'Title',
            type: 'TEXT',
            characters: 'Plan',
            fills: titleFill,
          }),
          node({ id: `${id}-badge`, name: 'Badge', type: 'RECTANGLE', visible: id === 'p1' }),
        ],
        overrides,
        getMainComponentAsync: async () => main,
      });
    const blackFill = [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }];
    const blueFill = [
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.145, g: 0.388, b: 0.922 } },
    ];
    const result = (await createGetDesignContextHandler(
      fakeFigma({
        selection: [
          mkInstance('p1', blackFill, []),
          mkInstance('p2', blueFill, [
            { id: 'p2-title', overriddenFields: ['fills'] },
            { id: 'p2-badge', overriddenFields: ['visible'] },
          ]),
        ],
      }),
    )({ dedupeComponents: true, detail: 'full' })) as GetDesignContextResult;

    expect(result.nodes[0]?.deduped).toBeUndefined();
    expect(result.nodes[0]?.propertyOverrides).toBeUndefined();

    expect(result.nodes[1]?.deduped).toBe(true);
    const overrides = result.nodes[1]?.propertyOverrides;
    const title = overrides?.find(o => o.name === 'Title');
    const badge = overrides?.find(o => o.name === 'Badge');
    expect((title?.fills as { color: string }[] | undefined)?.[0]?.color).toBe('#2563EB');
    expect(badge?.visible).toBe(false);
  });

  it('surfaces mainComponent name/key at full detail and preserves instance componentProperties through dedup', async () => {
    const main = {
      id: 'M:1',
      name: 'Type=primary',
      key: 'abc123',
      parent: { id: 'CS:1', type: 'COMPONENT_SET', name: 'Button' },
    };
    const mkInstance = (id: string, variant: string): SceneNode =>
      node({
        id,
        type: 'INSTANCE',
        componentProperties: { Variant: { type: 'VARIANT', value: variant } },
        children: [node({ id: `${id}-child`, type: 'TEXT' })],
        getMainComponentAsync: async () => main,
      });
    const result = (await createGetDesignContextHandler(
      fakeFigma({ selection: [mkInstance('i1', 'primary'), mkInstance('i2', 'outline')] }),
    )({ dedupeComponents: true, detail: 'full' })) as GetDesignContextResult;

    expect(result.nodes[0]?.mainComponent).toEqual({
      id: 'M:1',
      name: 'Type=primary',
      key: 'abc123',
      componentSetId: 'CS:1',
      componentSetName: 'Button',
    });
    expect(result.nodes[0]?.componentProperties).toEqual({
      Variant: { type: 'VARIANT', value: 'primary' },
    });
    expect(result.nodes[1]?.deduped).toBe(true);
    expect(result.nodes[1]?.children).toBeUndefined();
    expect(result.nodes[1]?.componentProperties).toEqual({
      Variant: { type: 'VARIANT', value: 'outline' },
    });
    expect(result.nodes[1]?.mainComponent).toEqual({
      id: 'M:1',
      name: 'Type=primary',
      key: 'abc123',
      componentSetId: 'CS:1',
      componentSetName: 'Button',
    });
  });
});
