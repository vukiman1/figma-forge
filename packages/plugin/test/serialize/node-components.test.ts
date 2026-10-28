import { describe, expect, it } from 'vitest';

import { serializeFlat, serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat — style links / component properties', () => {
  it('collects non-empty style ids and skips empty ones', () => {
    const out = serializeFlatSync(
      fake({ fillStyleId: 'S:abc', strokeStyleId: '', effectStyleId: 'S:def' }),
    );
    expect(out.styleIds).toEqual({ fill: 'S:abc', effect: 'S:def' });
  });

  it('collapses boundVariables to flat lists of variable ids', () => {
    const out = serializeFlatSync(
      fake({
        boundVariables: {
          fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:1' }],
          cornerRadius: { type: 'VARIABLE_ALIAS', id: 'VariableID:2' },
        },
      }),
    );
    expect(out.boundVariables).toEqual({ fills: ['VariableID:1'], cornerRadius: ['VariableID:2'] });
  });

  it('serializes instance component properties (variant / boolean / instance-swap)', () => {
    const out = serializeFlatSync(
      fake({
        type: 'INSTANCE',
        componentProperties: {
          Size: { type: 'VARIANT', value: 'lg' },
          Disabled: { type: 'BOOLEAN', value: false },
          Icon: { type: 'INSTANCE_SWAP', value: '123:456' },
        },
      }),
    );
    expect(out.componentProperties).toEqual({
      Size: { type: 'VARIANT', value: 'lg' },
      Disabled: { type: 'BOOLEAN', value: false },
      Icon: { type: 'INSTANCE_SWAP', value: '123:456' },
    });
  });

  it('serializes which property drives a sublayer, and only the fields that name one', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Hello',
        componentPropertyReferences: { characters: 'Caption#79:0', visible: 'Show#79:1' },
      }),
    );
    expect(out.componentPropertyReferences).toEqual({
      characters: 'Caption#79:0',
      visible: 'Show#79:1',
    });
  });

  it('omits property references for a node that has none', () => {
    expect(serializeFlatSync(fake({ type: 'FRAME' })).componentPropertyReferences).toBeUndefined();
    expect(
      serializeFlatSync(fake({ type: 'FRAME', componentPropertyReferences: null }))
        .componentPropertyReferences,
    ).toBeUndefined();
    expect(
      serializeFlatSync(fake({ type: 'FRAME', componentPropertyReferences: { visible: '' } }))
        .componentPropertyReferences,
    ).toBeUndefined();
  });
});

describe('serializeFlat (async) — mainComponent', () => {
  it('resolves the main component for an INSTANCE via getMainComponentAsync', async () => {
    const node = fake({
      type: 'INSTANCE',
      getMainComponentAsync: async () => ({ id: '10:1', name: 'Button', key: 'abc123' }),
    });
    const out = await serializeFlat(node);
    expect(out.mainComponent).toEqual({ id: '10:1', name: 'Button', key: 'abc123' });
  });

  it('carries the owning COMPONENT_SET id/name when the main component is a variant', async () => {
    const node = fake({
      type: 'INSTANCE',
      getMainComponentAsync: async () => ({
        id: '10:2',
        name: 'Size=Large, State=Hover',
        key: 'xyz',
        parent: { id: '9:1', type: 'COMPONENT_SET', name: 'Button' },
      }),
    });
    const out = await serializeFlat(node);
    expect(out.mainComponent).toEqual({
      id: '10:2',
      name: 'Size=Large, State=Hover',
      key: 'xyz',
      componentSetId: '9:1',
      componentSetName: 'Button',
    });
  });

  it('omits mainComponent for non-instances and when resolution fails', async () => {
    expect((await serializeFlat(fake({ type: 'FRAME' }))).mainComponent).toBeUndefined();
    const broken = fake({
      type: 'INSTANCE',
      getMainComponentAsync: async () => {
        throw new Error('not loaded');
      },
    });
    expect((await serializeFlat(broken)).mainComponent).toBeUndefined();
  });
});
