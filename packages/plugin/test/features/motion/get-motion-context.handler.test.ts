import { DESIGN_CONTEXT_TOKEN_BUDGET, estimateResultTokens } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { MAX_VISITED_NODES } from '../../../src/features/motion/context/budget.js';
import {
  type FakeNode,
  animated,
  binding,
  drain,
  ids,
  node,
  range,
  run,
} from './motion-context-fake.js';

const WIDE_TREE_TIMEOUT_MS = 30_000;

describe('get_motion_context handler', () => {
  it('reports complete with no nodes for a static subtree', async () => {
    const root = node('1:1', { children: [node('1:2'), node('1:3', { children: [node('1:4')] })] });
    const r = await run([root], '1:1');
    expect(r).toEqual({
      rootNodeId: '1:1',
      coverage: { status: 'complete', visitedNodes: 4, animatedNodes: 0 },
      nodes: [],
    });
  });

  it('lists each instance of one component separately, under its own qualified id', async () => {
    const a = node('1:10', { type: 'INSTANCE', children: [animated('I1:10;2:1', [0, 1])] });
    const b = node('1:11', { type: 'INSTANCE', children: [animated('I1:11;2:1', [0.5, 3])] });
    const r = await run([node('1:1', { children: [a, b] })], '1:1');
    expect(ids(r)).toEqual(['I1:10;2:1', 'I1:11;2:1']);
    expect(r.nodes[1]).toMatchObject({
      parentId: '1:11',
      motion: { animations: { OPACITY: binding([0.5, 3]) } },
    });
  });

  it('finds a hidden, deep descendant under a static parent, in document order', async () => {
    const hidden = { ...animated('1:5'), visible: false };
    const root = node('1:1', {
      children: [node('1:2', { children: [node('1:3', { children: [hidden] })] }), animated('1:6')],
    });
    const r = await run([root], '1:1');
    expect(ids(r)).toEqual(['1:5', '1:6']);
    expect(r.coverage).toEqual({ status: 'complete', visitedNodes: 5, animatedNodes: 2 });
  });

  it('counts an applied style without keyframes, but not empty bindings', async () => {
    const styled = node('1:2', { animationStyles: [{ id: 'A:1', styleId: 'Opacity' }] });
    const empty = node('1:3', {
      animations: {
        fills: {},
        OPACITY: { baseValue: { type: 'FLOAT', value: 1 }, timelineDuration: 4, tracks: [] },
        TRANSLATION_X: { tracks: [{ id: 't', keyframeOperation: 'SET', keyframes: [] }] },
      },
    });
    const r = await run([node('1:1', { children: [styled, empty] })], '1:1');
    expect(ids(r)).toEqual(['1:2']);
  });

  it('passes raw Motion through untouched, future fields included', async () => {
    const future = {
      ...binding([0, 1]),
      loopMode: 'PING_PONG',
    };
    const n = node('1:2', {
      animations: { OPACITY: future, effects: { 0: { RADIUS: binding([0, 1]) } } },
      timelines: [{ id: 'T:1', duration: 4, trigger: 'ON_LOAD' }],
    });
    const r = await run([n], '1:2');
    expect(r.nodes[0]?.motion.animations).toEqual({
      OPACITY: future,
      effects: { 0: { RADIUS: binding([0, 1]) } },
    });
    expect(r.nodes[0]?.motion.timelines).toEqual([{ id: 'T:1', duration: 4, trigger: 'ON_LOAD' }]);
    expect(r.diagnostics).toBeUndefined();
  });

  it('carries a field the typings do not define through as read', async () => {
    const n = node('1:2', {
      animations: {
        BLUR_AMOUNT: binding([0, 1]),
        effects: { 1: { GLOW: binding([0, 1]) } },
      },
    });
    const r = await run([n], '1:2');
    expect(r.coverage.status).toBe('complete');
    expect(r.nodes[0]?.motion.animations).toEqual(n.animations);
    expect(r.diagnostics).toBeUndefined();
  });

  it('leaves out manual tracks animations already carries, keeping those that bind a variable', async () => {
    const played = binding([0, 1]).tracks[0]!;
    const aliased = {
      id: 'aliased',
      keyframes: [
        {
          id: 'a0',
          timelinePosition: 1,
          value: { type: 'FLOAT', value: 1 },
          easing: { type: 'VARIABLE_ALIAS', id: 'V:ease' },
        },
      ],
    };
    const unplayed = { id: 'not-in-animations', keyframes: played.keyframes };
    const n = node('1:2', {
      animations: {
        OPACITY: binding([0, 1]),
        ROTATION: { tracks: [{ ...aliased, keyframeOperation: 'SET' }] },
        effects: { 0: { RADIUS: binding([0, 1]) } },
      },
    });
    n.manualKeyframeTracks = {
      OPACITY: { ...played, baseValue: { type: 'FLOAT', value: 0 } },
      ROTATION: aliased,
      SCALE_X: unplayed,
      effects: { 0: { RADIUS: { ...played, baseValue: { type: 'FLOAT', value: 0 } } } },
    };
    const r = await run([n], '1:2');
    expect(r.nodes[0]?.motion.manualKeyframeTracks).toEqual({
      ROTATION: aliased,
      SCALE_X: unplayed,
    });
    expect(r.nodes[0]?.motion.animations).toEqual(n.animations);
  });

  it('reads a node that exposes Motion state without the write methods (Dev Mode)', async () => {
    const readOnly = (n: FakeNode): FakeNode => {
      delete n.applyAnimationStyle;
      return n;
    };
    const root = readOnly(node('1:1', { children: [readOnly(animated('1:2'))] }));
    const r = await run([root], '1:1');
    expect(ids(r)).toEqual(['1:2']);
    expect(r.coverage.status).toBe('complete');
  });

  it('turns a descendant read failure into a diagnostic, not an absence', async () => {
    const broken = node('1:3');
    Object.defineProperty(broken, 'animations', {
      get() {
        throw new Error('getter exploded');
      },
    });
    const r = await run([node('1:1', { children: [broken, animated('1:4')] })], '1:1');
    expect(ids(r)).toEqual(['1:4']);
    expect(r.coverage).toMatchObject({ status: 'partial', reasons: ['read-error'] });
    expect(r.diagnostics).toEqual([
      { nodeId: '1:3', code: 'read-error', message: 'getter exploded' },
    ]);
  });

  it('fails the call when the root itself cannot be read', async () => {
    const root = node('1:1');
    Object.defineProperty(root, 'animationStyles', {
      get() {
        throw new Error('Motion unavailable');
      },
    });
    await expect(run([root], '1:1')).rejects.toThrow('Motion unavailable');
  });

  it('rejects an unknown id and a node without Motion', async () => {
    await expect(run([], '9:9')).rejects.toThrow(/not found/);
    const page = { id: '0:1', name: 'Page', type: 'PAGE', parent: null } as FakeNode;
    await expect(run([page], '0:1')).rejects.toThrow(/PAGE, which carries no Figma Motion/);
  });

  it('stops at the node limit with disjoint pending roots that together cover the rest', async () => {
    const count = Math.ceil((MAX_VISITED_NODES + 500) / 51);
    const sections = range(count).map(s =>
      node(`2:${s}`, {
        children: range(50).map(l =>
          l === 25 && s % 10 === 0 ? animated(`3:${s}-${l}`) : node(`3:${s}-${l}`),
        ),
      }),
    );
    const root = node('1:1', { children: sections });

    const first = await run([root], '1:1');
    expect(first.coverage).toMatchObject({
      status: 'partial',
      visitedNodes: MAX_VISITED_NODES,
      reasons: ['node-limit'],
    });

    const all = (await drain([root], '1:1')).flatMap(ids);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(Math.ceil(count / 10));
  });

  it(
    'lists every pending root of a wide tree while the output has room for them',
    async () => {
      const children = MAX_VISITED_NODES + 1500;
      const root = node('1:1', {
        children: range(children).map(i => (i % 500 === 499 ? animated(`6:${i}`) : node(`6:${i}`))),
      });
      const first = await run([root], '1:1');
      expect(first.coverage.pendingNodeIds).toHaveLength(1501);
      expect(first.coverage.pendingOmitted).toBeUndefined();

      const all = (await drain([root], '1:1')).flatMap(ids);
      expect(all).toEqual(range(children / 500).map(k => `6:${k * 500 + 499}`));
    },
    WIDE_TREE_TIMEOUT_MS,
  );

  it('hands back the node that no longer fits, and reads it on its own call', async () => {
    const heavy = (id: string): FakeNode =>
      animated(
        id,
        range(30).map(i => i / 10),
      );
    const root = node('1:1', {
      children: range(30).map(i => heavy(`4:${i}`)),
    });

    const first = await run([root], '1:1');
    expect(first.coverage).toMatchObject({ status: 'partial', reasons: ['payload-limit'] });
    const next = first.coverage.pendingNodeIds?.[0];
    expect(next).toBe(`4:${first.nodes.length}`);

    const all = (await drain([root], '1:1')).flatMap(ids);
    expect(all).toEqual(range(30).map(i => `4:${i}`));
  });

  it('reports a node too large for any call instead of pending it forever', async () => {
    const giant = animated(
      '5:1',
      range(2000).map(i => i / 100),
    );
    giant.children = [animated('5:2')];
    (giant.children[0] as FakeNode).parent = giant;
    const r = await run([giant], '5:1');
    expect(ids(r)).toEqual(['5:2']);
    expect(r.coverage).toMatchObject({ status: 'partial', reasons: ['payload-limit'] });
    expect(r.coverage.pendingNodeIds).toBeUndefined();
    expect(r.diagnostics?.[0]).toMatchObject({ nodeId: '5:1', code: 'node-over-budget' });
  });

  it('stays inside the client budget with every cap saturated', async () => {
    const longId = (p: string, i: number): string => `I${p}${'9'.repeat(20)}:${i};123456:${i}`;
    const failing = range(40).map(i => {
      const n = node(longId('7', i));
      Object.defineProperty(n, 'animations', {
        get() {
          throw new Error('x'.repeat(2000));
        },
      });
      return n;
    });
    const heavy = range(30).map(i =>
      animated(
        longId('8', i),
        range(30).map(k => k / 10),
      ),
    );
    const tail = range(2000).map(i => node(longId('6', i)));
    const root = node('1:1', { children: [...failing, ...heavy, ...tail] });

    const r = await run([root], '1:1');
    expect(r.coverage.reasons).toEqual(['read-error', 'payload-limit']);
    expect(r.diagnosticsOmitted).toBe(20);
    expect(r.coverage.pendingOmitted).toBeGreaterThan(0);
    expect(estimateResultTokens(JSON.stringify(r))).toBeLessThanOrEqual(
      DESIGN_CONTEXT_TOKEN_BUDGET,
    );
  });
});
