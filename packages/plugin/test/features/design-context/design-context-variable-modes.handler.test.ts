import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context — variable modes', () => {
  const color = {
    id: 'VariableCollectionId:1:2',
    name: 'color',
    defaultModeId: '1:0',
    modes: [
      { modeId: '1:0', name: 'Light' },
      { modeId: '9:0', name: 'Dark' },
    ],
  };
  const collections = { [color.id]: color };
  const read = async (
    roots: SceneNode[],
    extra: Partial<Parameters<typeof fakeFigma>[0]> = {},
    args: Record<string, unknown> = { detail: 'full' },
  ) =>
    (await createGetDesignContextHandler(fakeFigma({ selection: roots, collections, ...extra }))(
      args,
    )) as GetDesignContextResult;

  it('names a mode set on a node, and does not repeat it on its subtree', async () => {
    const child = node({
      id: 'c',
      explicitVariableModes: {},
      resolvedVariableModes: { [color.id]: '9:0' },
    });
    const frame = node({
      id: 'f',
      explicitVariableModes: { [color.id]: '9:0' },
      resolvedVariableModes: { [color.id]: '9:0' },
      children: [child],
    });
    const result = await read([frame]);
    expect(result.nodes[0]?.variableModes).toEqual({ color: 'Dark' });
    expect(result.nodes[0]?.children?.[0]?.variableModes).toBeUndefined();
  });

  it('gives a root the non-default mode it inherits from outside the read (an ancestor or the page)', async () => {
    const inside = node({
      id: 'i',
      explicitVariableModes: {},
      resolvedVariableModes: { [color.id]: '9:0' },
    });
    expect((await read([inside])).nodes[0]?.variableModes).toEqual({ color: 'Dark' });
  });

  it('leaves out an inherited mode whose collection it cannot read, since it cannot tell it from the default', async () => {
    const inside = node({
      id: 'i',
      explicitVariableModes: {},
      resolvedVariableModes: { 'VariableCollectionId:lib': 'm:1' },
    });
    expect('variableModes' in (await read([inside])).nodes[0]!).toBe(false);
  });

  it('says nothing when the mode in effect is the default', async () => {
    const plain = node({
      id: 'p',
      explicitVariableModes: {},
      resolvedVariableModes: { [color.id]: '1:0' },
    });
    expect('variableModes' in (await read([plain])).nodes[0]!).toBe(false);
  });

  it('keeps an explicit switch back to the default, which inside a Dark ancestor is a real change', async () => {
    const light = node({
      id: 'l',
      explicitVariableModes: { [color.id]: '1:0' },
      resolvedVariableModes: { [color.id]: '1:0' },
    });
    expect((await read([light])).nodes[0]?.variableModes).toEqual({ color: 'Light' });
  });

  it('qualifies two collections that share a name, and keeps ids for one it cannot read', async () => {
    const other = { ...color, id: 'VariableCollectionId:7:7' };
    const frame = node({
      id: 'f',
      explicitVariableModes: {
        [color.id]: '9:0',
        [other.id]: '9:0',
        'VariableCollectionId:x': 'm:1',
      },
      resolvedVariableModes: {},
    });
    const result = await read([frame], { collections: { [color.id]: color, [other.id]: other } });
    expect(result.nodes[0]?.variableModes).toEqual({
      [`color (${color.id})`]: 'Dark',
      [`color (${other.id})`]: 'Dark',
      'VariableCollectionId:x': 'm:1',
    });
  });

  it('keeps the mode set on a deduped instance, which is all that tells it apart from the first', async () => {
    const instance = (id: string, modes: Record<string, string>) =>
      node({
        id,
        type: 'INSTANCE',
        getMainComponentAsync: async () => ({ id: 'main', name: 'Card', key: 'k' }),
        explicitVariableModes: modes,
        resolvedVariableModes: modes,
        children: [node({ id: `${id}-c` })],
      });
    const result = await read(
      [instance('light', {}), instance('dark', { [color.id]: '9:0' })],
      {},
      {
        detail: 'full',
        dedupeComponents: true,
      },
    );
    expect(result.nodes[1]?.deduped).toBe(true);
    expect(result.nodes[1]?.variableModes).toEqual({ color: 'Dark' });
  });

  it('carries a layer switched to another mode inside a deduped instance, which Figma lists as an override', async () => {
    const instance = (id: string, label: Record<string, unknown>, overrides: unknown[]) =>
      node({
        id,
        type: 'INSTANCE',
        getMainComponentAsync: async () => ({ id: 'main', name: 'Card', key: 'k' }),
        overrides,
        children: [node({ id: `I${id};1`, name: 'Label', ...label })],
      });
    const result = await read(
      [
        instance('a', {}, []),
        instance('b', { explicitVariableModes: { [color.id]: '9:0' } }, [
          { id: 'Ib;1', overriddenFields: ['explicitVariableModes'] },
        ]),
        instance('c', { explicitVariableModes: {} }, [
          { id: 'Ic;1', overriddenFields: ['explicitVariableModes'] },
        ]),
      ],
      {},
      { detail: 'full', dedupeComponents: true },
    );
    expect(result.nodes[1]?.propertyOverrides).toEqual([
      { name: 'Label', variableModes: { color: 'Dark' } },
    ]);
    expect(result.nodes[2]?.propertyOverrides).toEqual([{ name: 'Label', variableModes: {} }]);
  });

  it('drops a mode deleted from its collection, on a root and below it', async () => {
    const child = node({ id: 'c', explicitVariableModes: { [color.id]: '7:7' } });
    const frame = node({
      id: 'f',
      explicitVariableModes: { [color.id]: '7:7' },
      resolvedVariableModes: { [color.id]: '7:7' },
      children: [child],
    });
    const result = await read([frame]);
    expect('variableModes' in result.nodes[0]!).toBe(false);
    expect('variableModes' in result.nodes[0]!.children![0]!).toBe(false);
  });

  it('reports what a root inherits when its own explicit mode was deleted', async () => {
    const frame = node({
      id: 'f',
      explicitVariableModes: { [color.id]: '7:7' },
      resolvedVariableModes: { [color.id]: '9:0' },
    });
    expect((await read([frame])).nodes[0]?.variableModes).toEqual({ color: 'Dark' });
  });

  it('turns a deleted mode in a deduped override into {}, which is what renders', async () => {
    const instance = (id: string, label: Record<string, unknown>, overrides: unknown[]) =>
      node({
        id,
        type: 'INSTANCE',
        getMainComponentAsync: async () => ({ id: 'main', name: 'Card', key: 'k' }),
        overrides,
        children: [node({ id: `I${id};1`, name: 'Label', ...label })],
      });
    const result = await read(
      [
        instance('a', {}, []),
        instance('b', { explicitVariableModes: { [color.id]: '7:7' } }, [
          { id: 'Ib;1', overriddenFields: ['explicitVariableModes'] },
        ]),
      ],
      {},
      { detail: 'full', dedupeComponents: true },
    );
    expect(result.nodes[1]?.propertyOverrides).toEqual([{ name: 'Label', variableModes: {} }]);
  });

  it('leaves the compact view alone', async () => {
    const frame = node({
      id: 'f',
      explicitVariableModes: { [color.id]: '9:0' },
      resolvedVariableModes: { [color.id]: '9:0' },
    });
    expect('variableModes' in (await read([frame], {}, { detail: 'compact' })).nodes[0]!).toBe(
      false,
    );
  });
});
