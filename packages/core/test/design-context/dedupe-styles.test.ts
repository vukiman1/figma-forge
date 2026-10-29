import { describe, expect, it } from 'vitest';

import { dedupeStyles, type DesignContextNode } from '../../src/index.js';
import { solid, textNode } from './fixtures.js';

describe('dedupeStyles — sharing and tree walk', () => {
  it('deduplicates identical styles to one entry shared by many refs (the 100-buttons case)', () => {
    const items = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(id =>
      textNode(id, 'Noto Sans JP', 'Regular', 16),
    );
    const { nodes, globalVars } = dedupeStyles(items);

    expect(Object.keys(globalVars.styles)).toHaveLength(1);
    const refs = new Set(nodes.map(n => n.textStyle));
    expect(refs.size).toBe(1);
    expect(globalVars.styles[nodes[0]!.textStyle!]).toEqual({
      fontFamily: 'Noto Sans JP',
      fontStyle: 'Regular',
      fontSize: 16,
    });
  });

  it("emits a node's own style refs before its children (no shadow-on-child misattribution)", () => {
    const card: DesignContextNode = {
      id: 'card',
      name: 'card',
      type: 'FRAME',
      fills: [solid(1, 1, 1)],
      effects: [
        { type: 'DROP_SHADOW', visible: true, radius: 4, color: { r: 0, g: 0, b: 0, a: 0.25 } },
      ],
      children: [{ id: 'btn', name: 'btn', type: 'INSTANCE', fills: [solid(0.38, 0.4, 0.94)] }],
    };
    const { nodes } = dedupeStyles([card]);
    const keys = Object.keys(nodes[0]!);
    expect(keys.indexOf('children')).toBeGreaterThan(keys.indexOf('fill'));
    expect(keys.indexOf('children')).toBeGreaterThan(keys.indexOf('effect'));
    expect(keys[keys.length - 1]).toBe('children');
  });

  it('produces deterministic, content-derived ids (stable across runs, diffable)', () => {
    const make = (): DesignContextNode[] => [textNode('x', 'Inter', 'Bold', 14)];
    const a = dedupeStyles(make());
    const b = dedupeStyles(make());
    expect(a.nodes[0]?.textStyle).toBe(b.nodes[0]?.textStyle);
  });

  it('recurses into children and leaves MIXED / ref-less nodes untouched', () => {
    const tree: DesignContextNode = {
      id: 'root',
      name: 'root',
      type: 'FRAME',
      children: [textNode('t', 'Inter', 'Bold', 14), { id: 'plain', name: 'plain', type: 'FRAME' }],
    };
    const { nodes, globalVars } = dedupeStyles([tree]);
    expect(nodes[0]?.children?.[0]?.textStyle).toMatch(/^text_/);
    expect(nodes[0]?.children?.[1]).toEqual({ id: 'plain', name: 'plain', type: 'FRAME' });
    expect(Object.keys(globalVars.styles)).toHaveLength(1);
  });
});

describe('dedupeStyles — variable bindings stay out of the bundles', () => {
  const bound = (over: Record<string, unknown>): DesignContextNode => ({
    id: 'n',
    name: 'n',
    type: 'FRAME',
    ...over,
  });

  it('drops per-paint and per-effect bindings from the globalVars bundle', () => {
    const { globalVars } = dedupeStyles([
      bound({
        fills: [{ ...solid(1, 0, 0), boundVariables: { color: 'VariableID:1' } }],
        effects: [
          {
            type: 'DROP_SHADOW',
            visible: true,
            radius: 4,
            color: { r: 0, g: 0, b: 0, a: 0.2 },
            offset: { x: 0, y: 2 },
            spread: 0,
            boundVariables: { color: 'VariableID:1' },
          },
        ],
        boundVariables: { fills: ['VariableID:1'], effects: ['VariableID:1'] },
      }),
    ]);
    expect(JSON.stringify(globalVars.styles)).not.toContain('boundVariables');
    expect(JSON.stringify(globalVars.styles)).not.toContain('VariableID');
  });

  it('keeps the node-level binding list, which is what names the token', () => {
    const { nodes } = dedupeStyles([
      bound({
        fills: [{ ...solid(1, 0, 0), boundVariables: { color: 'VariableID:1' } }],
        boundVariables: { fills: ['VariableID:1'] },
      }),
    ]);
    expect(nodes[0]?.boundVariables).toEqual({ fills: ['VariableID:1'] });
  });

  it('does not let a binding split one shared bundle into two', () => {
    const { globalVars } = dedupeStyles([
      bound({ id: 'a', fills: [{ ...solid(1, 0, 0), boundVariables: { color: 'VariableID:1' } }] }),
      bound({ id: 'b', fills: [solid(1, 0, 0)] }),
    ]);
    expect(Object.keys(globalVars.styles)).toHaveLength(1);
  });
});
