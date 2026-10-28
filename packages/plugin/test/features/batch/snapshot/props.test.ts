import { describe, expect, it } from 'vitest';

import { captureProps, restoreProps } from '../../../../src/features/batch/snapshot/props.js';
import { ctxFor, type Node } from './snapshot-fake.js';

describe('restoreProps', () => {
  const fakeNode = (): { node: Node; log: string[] } => {
    const log: string[] = [];
    let fills: unknown = ['red'];
    let fillStyleId = 'S:red';
    let opacity = 0.5;
    let bound: Record<string, { type: string; id: string }> = {
      opacity: { type: 'VARIABLE_ALIAS', id: 'V:half' },
    };
    const node: Node = {
      id: '1:1',
      get fills() {
        return fills;
      },
      set fills(v: unknown) {
        log.push('fills');
        fills = v;
        fillStyleId = '';
      },
      get fillStyleId() {
        return fillStyleId;
      },
      setFillStyleIdAsync: async (id: string) => {
        log.push(`style ${id}`);
        fillStyleId = id;
      },
      get opacity() {
        return opacity;
      },
      set opacity(v: number) {
        log.push('opacity');
        opacity = v;
        const { opacity: _dropped, ...rest } = bound;
        bound = rest;
      },
      get boundVariables() {
        return bound;
      },
      setBoundVariable: (field: string, v: { id: string } | null) => {
        log.push(`bind ${field}=${v === null ? 'null' : v.id}`);
        const { [field]: _old, ...rest } = bound;
        bound = v === null ? rest : { ...rest, [field]: { type: 'VARIABLE_ALIAS', id: v.id } };
      },
    };
    return { node, log };
  };

  it('puts the value back, then the style link the write detached, then the binding it dropped', async () => {
    const { node, log } = fakeNode();
    const ctx = ctxFor(new Map([[node.id, node]]));
    const snapshot = await captureProps(ctx, node as unknown as BaseNode, ['fills', 'opacity']);
    node.fills = ['blue'];
    node.opacity = 0.2;
    log.length = 0;

    await restoreProps(node as unknown as BaseNode, snapshot);

    expect(node.fills).toEqual(['red']);
    expect(node.fillStyleId).toBe('S:red');
    expect(node.boundVariables).toEqual({ opacity: { type: 'VARIABLE_ALIAS', id: 'V:half' } });
    expect(log).toEqual(['fills', 'opacity', 'style S:red', 'bind opacity=V:half']);
  });

  it('re-attaches the style even when the op wrote back an identical value', async () => {
    const { node } = fakeNode();
    const ctx = ctxFor(new Map([[node.id, node]]));
    const snapshot = await captureProps(ctx, node as unknown as BaseNode, ['fills']);
    node.fills = ['red'];
    await restoreProps(node as unknown as BaseNode, snapshot);
    expect(node.fillStyleId).toBe('S:red');
  });

  it('unbinds what the op bound before the raw value goes back', async () => {
    const { node, log } = fakeNode();
    const ctx = ctxFor(new Map([[node.id, node]]));
    (node.setBoundVariable as (f: string, v: null) => void)('opacity', null);
    const snapshot = await captureProps(ctx, node as unknown as BaseNode, ['opacity']);
    (node.setBoundVariable as (f: string, v: { id: string }) => void)('opacity', { id: 'V:new' });
    log.length = 0;

    await restoreProps(node as unknown as BaseNode, snapshot);

    expect(node.boundVariables).toEqual({});
    expect(log[0]).toBe('bind opacity=null');
  });
});
