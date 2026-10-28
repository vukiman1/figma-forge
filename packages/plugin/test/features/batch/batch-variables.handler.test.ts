import { describe, expect, it } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createRenameVariableHandler } from '../../../src/features/variables/rename-variable.handler.js';
import { createSetVariableCodeSyntaxHandler } from '../../../src/features/variables/set-variable-code-syntax.handler.js';
import { createSetVariableValueHandler } from '../../../src/features/variables/set-variable-value.handler.js';
import { createUpdateVariableCollectionHandler } from '../../../src/features/variables/update-variable-collection.handler.js';
import { makeFigma, realWrites, FAIL } from './batch-fake.js';
import { makeWide, failingFrame } from './batch-wide-fake.js';

describe('batch inverses for the newly batchable writes', () => {
  it('restores a variable value, name and code syntax', async () => {
    const { figmaCtx, store, variables, collections } = makeWide();
    failingFrame(store);
    collections.set('C:1', { id: 'C:1', modes: [{ modeId: 'm1', name: 'Mode 1' }] });
    const variable: Record<string, unknown> = {
      id: 'V:1',
      name: 'size',
      resolvedType: 'FLOAT',
      variableCollectionId: 'C:1',
      valuesByMode: { m1: 8 },
      codeSyntax: { WEB: '--size' },
      setValueForMode(mode: string, value: unknown) {
        variable.valuesByMode = { ...(variable.valuesByMode as object), [mode]: value };
      },
      setVariableCodeSyntax(platform: string, value: string) {
        variable.codeSyntax = { ...(variable.codeSyntax as object), [platform]: value };
      },
      removeVariableCodeSyntax(platform: string) {
        const { [platform]: _gone, ...rest } = variable.codeSyntax as Record<string, string>;
        variable.codeSyntax = rest;
      },
    };
    variables.set('V:1', variable);
    const handler = createBatchHandler(figmaCtx, {
      set_variable_value: createSetVariableValueHandler(figmaCtx),
      set_variable_code_syntax: createSetVariableCodeSyntaxHandler(figmaCtx),
      rename_variable: createRenameVariableHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          { tool: 'set_variable_value', params: { variableId: 'V:1', modeId: 'm1', value: 16 } },
          {
            tool: 'set_variable_code_syntax',
            params: { variableId: 'V:1', codeSyntax: { WEB: '--big', ANDROID: 'big' } },
          },
          { tool: 'rename_variable', params: { variableId: 'V:1', name: 'big' } },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 3/);
    expect(variable).toMatchObject({
      name: 'size',
      valuesByMode: { m1: 8 },
      codeSyntax: { WEB: '--size' },
    });
  });

  it('restores a composed colour value with both alias halves intact', async () => {
    const { figmaCtx, store, variables, collections } = makeWide();
    failingFrame(store);
    collections.set('C:1', { id: 'C:1', modes: [{ modeId: 'm1', name: 'Mode 1' }] });
    const composed = {
      color: { type: 'VARIABLE_ALIAS', id: 'V:base' },
      opacity: { type: 'VARIABLE_ALIAS', id: 'V:op' },
    };
    const variable: Record<string, unknown> = {
      id: 'V:1',
      name: 'overlay',
      resolvedType: 'COLOR',
      variableCollectionId: 'C:1',
      valuesByMode: { m1: composed },
      setValueForMode(mode: string, value: unknown) {
        variable.valuesByMode = { ...(variable.valuesByMode as object), [mode]: value };
      },
    };
    variables.set('V:1', variable);
    const handler = createBatchHandler(figmaCtx, {
      set_variable_value: createSetVariableValueHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'set_variable_value',
            params: { variableId: 'V:1', modeId: 'm1', value: { r: 0, g: 1, b: 0, a: 1 } },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect((variable.valuesByMode as Record<string, unknown>).m1).toEqual(composed);
  });

  it('restores a collection name and every mode name it renamed', async () => {
    const { figmaCtx, store, collections } = makeWide();
    failingFrame(store);
    const collection: Record<string, unknown> = {
      id: 'C:1',
      name: 'Colour',
      modes: [
        { modeId: 'm1', name: 'Light' },
        { modeId: 'm2', name: 'Dark' },
      ],
      renameMode(modeId: string, name: string) {
        const modes = collection.modes as { modeId: string; name: string }[];
        const mode = modes.find(m => m.modeId === modeId);
        if (mode !== undefined) mode.name = name;
      },
    };
    collections.set('C:1', collection);
    const handler = createBatchHandler(figmaCtx, {
      update_variable_collection: createUpdateVariableCollectionHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'update_variable_collection',
            params: {
              collectionId: 'C:1',
              name: 'Color',
              modes: [
                { modeId: 'm1', name: 'Day' },
                { modeId: 'm2', name: 'Night' },
              ],
            },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(collection).toMatchObject({ name: 'Colour' });
    expect(collection.modes).toEqual([
      { modeId: 'm1', name: 'Light' },
      { modeId: 'm2', name: 'Dark' },
    ]);
  });

  it('refuses delete_variable_mode, whose mode id cannot be minted again', async () => {
    const { figmaCtx, store } = makeFigma({ '1:1': { id: '1:1', name: 'A' } });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'delete_variable_mode', params: { collectionId: 'C:1', modeId: 'm1' } },
        ],
      }),
    ).rejects.toThrow(
      /'delete_variable_mode' \(index 1\) is not batchable — adding a mode back mints/,
    );
    expect(store.get('1:1')).toMatchObject({ name: 'A' });
  });

  it("refuses a value written to a mode outside the variable's own collection", async () => {
    const { figmaCtx, variables, collections } = makeWide();
    collections.set('C:1', { id: 'C:1', modes: [{ modeId: 'm1', name: 'Mode 1' }] });
    variables.set('V:1', {
      id: 'V:1',
      name: 'size',
      variableCollectionId: 'C:1',
      valuesByMode: { m1: 8 },
    });
    const handler = createBatchHandler(figmaCtx, {
      set_variable_value: createSetVariableValueHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          { tool: 'set_variable_value', params: { variableId: 'V:1', modeId: 'ext', value: 1 } },
        ],
      }),
    ).rejects.toThrow(/mode ext is not a mode of size's own collection/);
  });
});
