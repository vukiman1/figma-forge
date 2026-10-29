import { describe, expect, it, vi } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createSetInstancePropertiesHandler } from '../../../src/features/components/set-instance-properties.handler.js';
import { createSwapComponentHandler } from '../../../src/features/components/swap-component.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createUpdateTextStyleHandler } from '../../../src/features/styles/update-text-style.handler.js';
import { makeFigma, FAIL } from './batch-fake.js';

describe('batch inverses for instances and text styles', () => {
  const makeInstance = () => {
    const mains: Record<string, { id: string; type: string }> = {
      A: { id: 'M:A', type: 'COMPONENT' },
      B: { id: 'M:B', type: 'COMPONENT' },
    };
    let main = mains.A!;
    let props: Record<string, Record<string, unknown>> = {
      State: { type: 'VARIANT', value: 'A' },
      'Title#1:0': {
        type: 'TEXT',
        value: 'from-var',
        boundVariables: { value: { type: 'VARIABLE_ALIAS', id: 'V:s' } },
      },
    };
    const instance: Record<string, unknown> = {
      id: 'I:1',
      type: 'INSTANCE',
      parent: null,
      removed: false,
      overrides: [],
      findAllWithCriteria: () => [],
      get componentProperties() {
        return props;
      },
      getMainComponentAsync: async () => main,
      swapComponent: vi.fn<(c: { id: string; type: string }) => void>(c => {
        main = c;
      }),
      setProperties: vi.fn<(p: Record<string, unknown>) => void>(p => {
        const next = { ...props };
        for (const [key, value] of Object.entries(p)) {
          const alias = typeof value === 'object' && value !== null ? value : undefined;
          next[key] = {
            type: props[key]!.type,
            value: alias === undefined ? value : 'from-var',
            ...(alias !== undefined && { boundVariables: { value: alias } }),
          };
          if (key === 'State') main = mains[value as string]!;
        }
        props = next;
      }),
    };
    const { figmaCtx, store } = makeFigma({ F: { id: 'F', fills: [] } });
    store.set('I:1', instance);
    store.set('M:A', mains.A!);
    store.set('M:B', mains.B!);
    return { instance, figmaCtx, mains, current: () => ({ main, props }) };
  };

  it('puts instance properties back — a bound one as its alias — and the main they chose', async () => {
    const { instance, figmaCtx, mains, current } = makeInstance();
    const before = current().props;
    const handler = createBatchHandler(figmaCtx, {
      set_instance_properties: createSetInstancePropertiesHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'set_instance_properties',
            params: { instanceId: 'I:1', properties: { State: 'B', 'Title#1:0': 'plain' } },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(instance.setProperties).toHaveBeenLastCalledWith({
      State: 'A',
      'Title#1:0': { type: 'VARIABLE_ALIAS', id: 'V:s' },
    });
    expect(current().props).toEqual(before);
    expect(current().main).toBe(mains.A);
  });

  it('swaps an instance back to the main it had', async () => {
    const { figmaCtx, mains, current } = makeInstance();
    const handler = createBatchHandler(figmaCtx, {
      swap_component: createSwapComponentHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [{ tool: 'swap_component', params: { instanceId: 'I:1', componentId: 'M:B' } }, FAIL],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(current().main).toBe(mains.A);
  });

  it('restores a text style: unbinds what the op bound, reloads the old face, writes the old values', async () => {
    const log: string[] = [];
    let bound: Record<string, { type: string; id: string }> = {};
    const style: Record<string, unknown> = {
      id: 'S:t',
      type: 'TEXT',
      name: 'body',
      description: '',
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 14,
      lineHeight: { unit: 'AUTO' },
      letterSpacing: { unit: 'PIXELS', value: 0 },
      paragraphSpacing: 0,
      paragraphIndent: 0,
      textWrapStyle: 'AUTO',
      get boundVariables() {
        return bound;
      },
      setBoundVariable: (field: string, v: { id: string } | null) => {
        log.push(`bind ${field}=${v === null ? 'null' : v.id}`);
        const { [field]: _old, ...rest } = bound;
        bound = v === null ? rest : { ...rest, [field]: { type: 'VARIABLE_ALIAS', id: v.id } };
      },
      getStyleConsumersAsync: async () => [],
    };
    const loadFontAsync = vi.fn<(f: unknown) => Promise<void>>(async () => {});
    const { figmaCtx } = makeFigma({ F: { id: 'F', fills: [] } });
    Object.assign(figmaCtx, {
      loadFontAsync,
      getStyleByIdAsync: async (id: string) => (id === 'S:t' ? style : null),
      variables: {
        getVariableByIdAsync: async (id: string) => ({
          id,
          resolvedType: 'FLOAT',
          valuesByMode: { m: 24 },
        }),
      },
    });
    const handler = createBatchHandler(figmaCtx, {
      update_text_style: createUpdateTextStyleHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'update_text_style',
            params: {
              styleId: 'S:t',
              fontName: { family: 'Inter', style: 'Bold' },
              fontSize: 32,
              boundVariables: { fontSize: 'V:24' },
            },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(style).toMatchObject({ fontName: { family: 'Inter', style: 'Regular' }, fontSize: 14 });
    expect(bound).toEqual({});
    expect(log.at(-1)).toBe('bind fontSize=null');
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
  });
});
