import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { TEXT_RESTORED_FIELDS } from '../../../src/features/batch/snapshot/text-fields.js';
import { createSetTextHandler } from '../../../src/features/text/set-text.handler.js';
import { createBindVariableToNodeHandler } from '../../../src/features/variables/bind-variable-to-node.handler.js';
import { makeFigma, realWrites, SOLID, INTER_BOLD, FAIL } from './batch-fake.js';
import { type Fn, fakeText, segmentsOf } from './batch-text-fake.js';

describe('batch handler', () => {
  it('restores every run of a text node on set_text_properties rollback, reloading its fonts', async () => {
    const text = fakeText('1:1', 'Hello World');
    (text.setRangeFontName as Fn as (s: number, e: number, v: unknown) => void)(6, 11, INTER_BOLD);
    (text.setRangeFontSize as Fn as (s: number, e: number, v: unknown) => void)(6, 11, 24);
    const before = segmentsOf(text);
    const { figmaCtx, store, loadFontAsync } = makeFigma({ F: { id: 'F', fills: [] } });
    store.set('1:1', text);
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          {
            tool: 'set_text_properties',
            params: {
              nodeId: '1:1',
              fontName: { family: 'Arial', style: 'Bold' },
              fontSize: 30,
              textCase: 'UPPER',
              textAutoResize: 'HEIGHT',
            },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(segmentsOf(text)).toEqual(before);
    expect(text.textAutoResize).toBe('WIDTH_AND_HEIGHT');
    expect(loadFontAsync).toHaveBeenCalledWith(INTER_BOLD);
  });

  it('brings back the runs a set_text restyled, which writing characters flattens to the first run’s style', async () => {
    const text = fakeText('1:1', 'Hello World');
    (text.setRangeFontName as (s: number, e: number, v: unknown) => void)(6, 11, INTER_BOLD);
    (text.setRangeFills as (s: number, e: number, v: unknown) => void)(0, 5, [SOLID(0.9)]);
    const before = segmentsOf(text);
    const { figmaCtx, store } = makeFigma({ F: { id: 'F', fills: [] } });
    store.set('1:1', text);
    const handler = createBatchHandler(figmaCtx, {
      ...realWrites(figmaCtx),
      set_text: createSetTextHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [{ tool: 'set_text', params: { nodeId: '1:1', characters: 'Changed' } }, FAIL],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(text.characters).toBe('Hello World');
    expect(segmentsOf(text)).toEqual(before);
  });

  it('re-attaches a run text style and re-binds a run variable after replaying raw values', async () => {
    const text = fakeText('1:1', 'Aaaa Bbbb');
    await (text.setRangeTextStyleIdAsync as (s: number, e: number, id: string) => Promise<void>)(
      0,
      4,
      'S:text',
    );
    (text.setRangeBoundVariable as (s: number, e: number, f: string, v: { id: string }) => void)(
      5,
      9,
      'fontSize',
      { id: 'V:size' },
    );
    const before = segmentsOf(text);
    const { figmaCtx, store } = makeFigma({ F: { id: 'F', fills: [] } });
    store.set('1:1', text);
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [{ tool: 'set_text_properties', params: { nodeId: '1:1', fontSize: 40 } }, FAIL],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(segmentsOf(text)).toEqual(before);
  });

  it('drops a node-level text binding the op added, which replaying the runs leaves behind', async () => {
    const text = fakeText('1:1', 'Hello World');
    (text.setRangeFontName as (s: number, e: number, v: unknown) => void)(6, 11, INTER_BOLD);
    const before = segmentsOf(text);
    const { figmaCtx, store } = makeFigma({ F: { id: 'F', fills: [] } });
    store.set('1:1', text);
    const handler = createBatchHandler(figmaCtx, {
      ...realWrites(figmaCtx),
      bind_variable_to_node: createBindVariableToNodeHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'bind_variable_to_node',
            params: { nodeId: '1:1', field: 'fontSize', variableId: 'V:24' },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(text.boundVariables).toEqual({});
    expect(segmentsOf(text)).toEqual(before);
  });

  it('re-binds text characters that set_text wrote over', async () => {
    const text = fakeText('1:1', 'from-var');
    (text.setBoundVariable as (f: string, v: { id: string }) => void)('characters', {
      id: 'V:str',
    });
    const { figmaCtx, store } = makeFigma({ F: { id: 'F', fills: [] } });
    store.set('1:1', text);
    const handler = createBatchHandler(figmaCtx, {
      ...realWrites(figmaCtx),
      set_text: createSetTextHandler(figmaCtx),
    });

    await expect(
      handler({ ops: [{ tool: 'set_text', params: { nodeId: '1:1', characters: 'raw' } }, FAIL] }),
    ).rejects.toThrow(/rolled back 1/);

    expect(text.characters).toBe('from-var');
    expect(text.boundVariables).toEqual({ characters: { type: 'VARIABLE_ALIAS', id: 'V:str' } });
  });

  it('restores every text field the text-writing handlers can touch (derived from their source)', () => {
    const source = (file: string): string =>
      readFileSync(new URL(`../../../src/features/text/${file}`, import.meta.url), 'utf8');
    const properties = source('set-text-properties.handler.ts');
    const plainList = /PLAIN_FIELDS = \[([^\]]*)\]/.exec(properties)?.[1] ?? '';
    const assigned = [
      ...[...properties.matchAll(/\btext\.([A-Za-z]+) = /g)].map(m => m[1]!),
      ...[...properties.matchAll(/Reflect\.set\(text, '([A-Za-z]+)'/g)].map(m => m[1]!),
      ...[...plainList.matchAll(/'([A-Za-z]+)'/g)].map(m => m[1]!),
    ];
    const ranged = [
      ...source('apply-text-range.ts').matchAll(/\btext\.setRange([A-Za-z]+?)(?:Async)?\(/g),
    ].map(m => {
      const field = m[1]![0]!.toLowerCase() + m[1]!.slice(1);
      return field === 'boundVariable' ? 'boundVariables' : field;
    });
    expect(assigned.length).toBeGreaterThan(10);
    expect(ranged.length).toBeGreaterThan(10);
    expect([...assigned, ...ranged].filter(f => !TEXT_RESTORED_FIELDS.has(f))).toEqual([]);
  });
});
