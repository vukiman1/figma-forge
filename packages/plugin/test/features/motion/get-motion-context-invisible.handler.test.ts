import { type GetMotionContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetMotionContextHandler } from '../../../src/features/motion/get-motion-context.handler.js';
import {
  type FakeNode,
  animated,
  fakeFigma,
  ids,
  node,
  range,
  run,
} from './motion-context-fake.js';

describe('get_motion_context handler', () => {
  describe('with skipInvisibleInstanceChildren on (the Dev Mode default)', () => {
    const devMode = (
      roots: FakeNode[],
    ): typeof figma & { skipInvisibleInstanceChildren: boolean } =>
      Object.assign(fakeFigma(roots), { skipInvisibleInstanceChildren: true });
    const hiddenIn = (
      ctx: { skipInvisibleInstanceChildren: boolean },
      instance: FakeNode,
      child: FakeNode,
    ): void => {
      child.parent = instance;
      const guarded = new Proxy(child, {
        get(target, key, receiver) {
          if (ctx.skipInvisibleInstanceChildren)
            throw new Error(`node ${child.id} is not accessible`);
          return Reflect.get(target, key, receiver) as unknown;
        },
      });
      Object.defineProperty(instance, 'children', {
        get: () => (ctx.skipInvisibleInstanceChildren ? [] : [guarded]),
      });
    };

    it('still finds a hidden animated layer inside an instance, and restores the flag', async () => {
      const instance = node('1:2', { type: 'INSTANCE' });
      const root = node('1:1', { children: [instance] });
      const ctx = devMode([root]);
      hiddenIn(ctx, instance, { ...animated('I1:2;3:1'), visible: false } as FakeNode);

      const r = (await createGetMotionContextHandler(ctx)({
        nodeId: '1:1',
      })) as GetMotionContextResult;
      expect(ids(r)).toEqual(['I1:2;3:1']);
      expect(r.nodes[0]?.parentId).toBe('1:2');
      expect(r.coverage).toEqual({ status: 'complete', visitedNodes: 3, animatedNodes: 1 });
      expect(ctx.skipInvisibleInstanceChildren).toBe(true);
    });

    it('lists a hidden instance layer as pending before the flag goes back on', async () => {
      const big = (id: string): FakeNode =>
        animated(
          id,
          range(250).map(i => i / 100),
        );
      const instance = node('1:3', { type: 'INSTANCE' });
      const root = node('1:1', { children: [big('1:2'), instance] });
      const ctx = devMode([root]);
      hiddenIn(ctx, instance, { ...big('I1:3;3:1'), visible: false } as FakeNode);

      const r = (await createGetMotionContextHandler(ctx)({
        nodeId: '1:1',
      })) as GetMotionContextResult;
      expect(ids(r)).toEqual(['1:2']);
      expect(r.coverage).toMatchObject({
        reasons: ['payload-limit'],
        pendingNodeIds: ['I1:3;3:1'],
      });
      expect(ctx.skipInvisibleInstanceChildren).toBe(true);
    });

    it('restores the flag when the root read fails, and says why a lookup can miss', async () => {
      const root = node('1:1');
      Object.defineProperty(root, 'animationStyles', {
        get() {
          throw new Error('Motion unavailable');
        },
      });
      const ctx = devMode([root]);
      await expect(createGetMotionContextHandler(ctx)({ nodeId: '1:1' })).rejects.toThrow(
        'Motion unavailable',
      );
      expect(ctx.skipInvisibleInstanceChildren).toBe(true);
      await expect(createGetMotionContextHandler(ctx)({ nodeId: 'I1:2;3:1' })).rejects.toThrow(
        /hides invisible layers inside instances/,
      );
      await expect(run([], 'I1:2;3:1')).rejects.toThrow(/works too\)\.$/);
    });
  });
});
