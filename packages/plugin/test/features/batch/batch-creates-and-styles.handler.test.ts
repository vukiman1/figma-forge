import { describe, expect, it, vi } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createAddComponentPropertyHandler } from '../../../src/features/components/add-component-property.handler.js';
import { createEditComponentPropertyHandler } from '../../../src/features/components/edit-component-property.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createCreatePaintStyleHandler } from '../../../src/features/styles/create-paint-style.handler.js';
import { createUpdatePaintStyleHandler } from '../../../src/features/styles/update-paint-style.handler.js';
import { createAddVariableModeHandler } from '../../../src/features/variables/add-variable-mode.handler.js';
import { SOLID, FAIL } from './batch-fake.js';
import { makeWide, failingFrame } from './batch-wide-fake.js';

describe('batch inverses for the newly batchable writes', () => {
  it('removes what a create made — a style, a mode, a component property', async () => {
    const { figmaCtx, store, styles, collections } = makeWide();
    failingFrame(store);
    const collection: Record<string, unknown> = {
      id: 'C:1',
      name: 'c',
      modes: [{ modeId: 'm1', name: 'Mode 1' }],
      addMode(name: string) {
        (collection.modes as unknown[]).push({ modeId: 'm2', name });
        return 'm2';
      },
      removeMode: vi.fn<(id: string) => void>(id => {
        collection.modes = (collection.modes as { modeId: string }[]).filter(m => m.modeId !== id);
      }),
    };
    collections.set('C:1', collection);
    const definitions: Record<string, unknown> = {};
    const component = {
      id: '1:1',
      type: 'COMPONENT',
      parent: null,
      componentPropertyDefinitions: definitions,
      addComponentProperty: (name: string, type: string, defaultValue: unknown) => {
        definitions[`${name}#9:9`] = { type, defaultValue };
        return `${name}#9:9`;
      },
      deleteComponentProperty: vi.fn<(id: string) => void>(id => {
        delete definitions[id];
      }),
    };
    store.set('1:1', component);
    const handler = createBatchHandler(figmaCtx, {
      create_paint_style: createCreatePaintStyleHandler(figmaCtx),
      add_variable_mode: createAddVariableModeHandler(figmaCtx),
      add_component_property: createAddComponentPropertyHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          { tool: 'create_paint_style', params: { name: 'new', paints: [] } },
          { tool: 'add_variable_mode', params: { collectionId: 'C:1', name: 'Dark' } },
          {
            tool: 'add_component_property',
            params: { componentId: '1:1', name: 'Show', type: 'BOOLEAN', defaultValue: true },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 3/);
    expect(styles.size).toBe(0);
    expect(collection.modes).toEqual([{ modeId: 'm1', name: 'Mode 1' }]);
    expect(definitions).toEqual({});
  });

  it('edits a component property back through the id the rename minted', async () => {
    const { figmaCtx, store } = makeWide();
    failingFrame(store);
    const definitions: Record<string, Record<string, unknown>> = {
      'Title#1:0': { type: 'TEXT', defaultValue: 'Hello' },
    };
    const edits: [string, unknown][] = [];
    const component = {
      id: '1:1',
      type: 'COMPONENT',
      parent: null,
      componentPropertyDefinitions: definitions,
      editComponentProperty: (id: string, value: { name?: string; defaultValue?: unknown }) => {
        edits.push([id, value]);
        const def = {
          ...definitions[id]!,
          ...('defaultValue' in value && { defaultValue: value.defaultValue }),
        };
        delete definitions[id];
        const next = `${value.name ?? id.split('#')[0]}#1:0`;
        definitions[next] = def;
        return next;
      },
    };
    store.set('1:1', component);
    const handler = createBatchHandler(figmaCtx, {
      edit_component_property: createEditComponentPropertyHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'edit_component_property',
            params: {
              componentId: '1:1',
              propertyId: 'Title#1:0',
              name: 'Heading',
              defaultValue: 'Hi',
            },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(edits.at(-1)).toEqual(['Heading#1:0', { name: 'Title', defaultValue: 'Hello' }]);
    expect(definitions).toEqual({ 'Title#1:0': { type: 'TEXT', defaultValue: 'Hello' } });
  });

  it('restores a paint style it updated', async () => {
    const { figmaCtx, store, styles } = makeWide();
    failingFrame(store);
    const style = {
      id: 'S:1',
      type: 'PAINT',
      name: 'brand',
      description: 'd',
      paints: [SOLID(0.2)],
    };
    styles.set('S:1', style);
    const handler = createBatchHandler(figmaCtx, {
      update_paint_style: createUpdatePaintStyleHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'update_paint_style',
            params: { styleId: 'S:1', name: 'x', description: 'y', paints: [SOLID(0.9)] },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(style).toEqual({
      id: 'S:1',
      type: 'PAINT',
      name: 'brand',
      description: 'd',
      paints: [SOLID(0.2)],
    });
  });
});
