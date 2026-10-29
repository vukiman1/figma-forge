import { DESIGN_CONTEXT_TOKEN_BUDGET, estimateResultTokens } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { MAX_VISITED_NODES } from '../../../src/features/motion/context/budget.js';
import { createGetMotionContextHandler } from '../../../src/features/motion/get-motion-context.handler.js';
import {
  animated,
  binding,
  fakeFigma,
  ids,
  node,
  range,
  run,
  type FakeNode,
} from './motion-context-fake.js';

describe('get_motion_context handler', () => {
  describe('edge cases', () => {
    it('walks through a layer without the Motion mixin to the animated child below it', async () => {
      const bare: FakeNode = { id: '1:2', name: 'bare', type: 'SLICE', parent: null };
      bare.children = [animated('1:3')];
      (bare.children[0] as FakeNode).parent = bare;
      const r = await run([node('1:1', { children: [bare] })], '1:1');
      expect(ids(r)).toEqual(['1:3']);
      expect(r.coverage).toEqual({ status: 'complete', visitedNodes: 3, animatedNodes: 1 });
    });

    it('counts keyframes that exist only in the manual tracks', async () => {
      const n = node('1:2');
      n.manualKeyframeTracks = { OPACITY: { id: 't', baseValue: 1, keyframes: [{ id: 'k' }] } };
      expect(ids(await run([n], '1:2'))).toEqual(['1:2']);
    });

    it('finds keyframes on component-property-bound paints and effects, flagging nothing', async () => {
      const n = node('1:2', {
        animations: {
          fills: { 0: { properties: { 'prop:1': binding([0, 1]) } } },
          effects: { 2: { properties: { 'prop:2': binding([0, 1]) } } },
        },
      });
      const r = await run([n], '1:2');
      expect(ids(r)).toEqual(['1:2']);
      expect(r.diagnostics).toBeUndefined();
    });

    it('leaves out a node whose only track has no keyframe', async () => {
      const n = node('1:2');
      n.manualKeyframeTracks = { OPACITY: { id: 't', keyframes: [] } };
      const r = await run([n], '1:2');
      expect(ids(r)).toEqual([]);
      expect(r.coverage.status).toBe('complete');
    });

    it('caps a long error message and survives a non-Error throw', async () => {
      const long = node('1:2');
      Object.defineProperty(long, 'animations', {
        get() {
          throw new Error('y'.repeat(5000));
        },
      });
      const odd = node('1:3');
      Object.defineProperty(odd, 'animations', {
        get() {
          // eslint-disable-next-line no-throw-literal -- the plugin API is not ours; it may throw anything
          throw 'plain string';
        },
      });
      const r = await run([node('1:1', { children: [long, odd] })], '1:1');
      expect(r.diagnostics?.map(d => d.message.length)).toEqual([300, 'plain string'.length]);
    });

    it('treats exactly the visit cap as complete and one more as partial', async () => {
      const tree = (n: number): FakeNode =>
        node('1:1', { children: range(n - 1).map(i => node(`7:${i}`)) });
      expect((await run([tree(MAX_VISITED_NODES)], '1:1')).coverage).toEqual({
        status: 'complete',
        visitedNodes: MAX_VISITED_NODES,
        animatedNodes: 0,
      });
      expect((await run([tree(MAX_VISITED_NODES + 1)], '1:1')).coverage).toMatchObject({
        status: 'partial',
        visitedNodes: MAX_VISITED_NODES,
        pendingNodeIds: [`7:${MAX_VISITED_NODES - 1}`],
      });
    });

    it('keeps exactly the diagnostic cap and counts the rest', async () => {
      const failing = (n: number): FakeNode =>
        node('1:1', {
          children: range(n).map(i => {
            const f = node(`8:${i}`);
            Object.defineProperty(f, 'animations', {
              get() {
                throw new Error('boom');
              },
            });
            return f;
          }),
        });
      const at = await run([failing(20)], '1:1');
      expect(at.diagnostics).toHaveLength(20);
      expect(at.diagnosticsOmitted).toBeUndefined();
      const over = await run([failing(21)], '1:1');
      expect(over.diagnostics).toHaveLength(20);
      expect(over.diagnosticsOmitted).toBe(1);
    });

    it('walks a chain deeper than any call stack would allow recursion for', async () => {
      let leaf = animated('9:1399');
      for (let i = 1398; i >= 0; i -= 1) leaf = node(`9:${i}`, { children: [leaf] });
      const r = await run([leaf], '9:0');
      expect(ids(r)).toEqual(['9:1399']);
      expect(r.coverage.status).toBe('complete');
    });

    it('stays inside the client budget when names and errors are CJK', async () => {
      const cjk = '動畫'.repeat(150);
      const heavy = range(30).map(i => {
        const n = animated(
          `4:${i}`,
          range(30).map(k => k / 10),
        );
        n.name = cjk;
        return n;
      });
      const failing = range(30).map(i => {
        const f = node(`8:${i}`);
        Object.defineProperty(f, 'animations', {
          get() {
            throw new Error(cjk);
          },
        });
        return f;
      });
      const tail = range(1000).map(i => node(`6:${i}`));
      const r = await run([node('1:1', { children: [...failing, ...heavy, ...tail] })], '1:1');
      expect(r.coverage.status).toBe('partial');
      expect((r.diagnostics?.length ?? 0) + (r.diagnosticsOmitted ?? 0)).toBe(30);
      expect(estimateResultTokens(JSON.stringify(r))).toBeLessThanOrEqual(
        DESIGN_CONTEXT_TOKEN_BUDGET,
      );
    });

    it('rejects a nodeId that is not a string', async () => {
      await expect(createGetMotionContextHandler(fakeFigma([]))({ nodeId: 7 })).rejects.toThrow(
        /nodeId: Invalid input/,
      );
    });
  });
});
