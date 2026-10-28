import { describe, expect, it } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { makeMotionFigma, motionWrites, FAILING_FILL } from './batch-motion-fake.js';

describe('batch Motion inverses', () => {
  it('rolls back apply_animation_style by removing the applied style instance', async () => {
    const { figmaCtx, store, addMotionNode } = makeMotionFigma();
    const a = addMotionNode('1:1');
    store.set('F', { id: 'F', fills: [] });
    const handler = createBatchHandler(figmaCtx, motionWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'apply_animation_style', params: { nodeId: '1:1', styleId: 's1' } },
          FAILING_FILL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(a.removeAnimationStyle).toHaveBeenCalledWith('1:1:as:1');
    expect(a.animationStyles).toHaveLength(0);
  });

  it('restores a prior PROPERTY keyframe track on rollback, which keeps that track’s ids', async () => {
    const OLD = {
      baseValue: { type: 'FLOAT', value: 0 },
      keyframes: [{ timelinePosition: 0, value: { type: 'FLOAT', value: 0 } }],
    };
    const { figmaCtx, store, addMotionNode } = makeMotionFigma();
    const a = addMotionNode('1:1', { tracks: { TRANSLATION_X: OLD } });
    store.set('F', { id: 'F', fills: [] });
    const handler = createBatchHandler(figmaCtx, motionWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          {
            tool: 'apply_manual_keyframe_track',
            params: {
              nodeId: '1:1',
              field: { type: 'PROPERTY', name: 'TRANSLATION_X' },
              track: {
                keyframes: [{ timelinePosition: 0.3, value: { type: 'FLOAT', value: 120 } }],
              },
            },
          },
          FAILING_FILL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(a.manualKeyframeTracks.TRANSLATION_X).toEqual(OLD);
  });

  it('removes a PROPERTY keyframe track on rollback when there was none before', async () => {
    const { figmaCtx, store, addMotionNode } = makeMotionFigma();
    const a = addMotionNode('1:1');
    store.set('F', { id: 'F', fills: [] });
    const handler = createBatchHandler(figmaCtx, motionWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          {
            tool: 'apply_manual_keyframe_track',
            params: {
              nodeId: '1:1',
              field: { type: 'PROPERTY', name: 'OPACITY' },
              track: { keyframes: [{ timelinePosition: 0, value: { type: 'FLOAT', value: 1 } }] },
            },
          },
          FAILING_FILL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(a.removeManualKeyframeTrack).toHaveBeenCalledWith({ type: 'PROPERTY', name: 'OPACITY' });
    expect(a.manualKeyframeTracks.OPACITY).toBeUndefined();
  });

  it('rejects an indexed (effects) keyframe track as not batchable, before any op runs', async () => {
    const { figmaCtx, addMotionNode } = makeMotionFigma();
    addMotionNode('1:1');
    const handler = createBatchHandler(figmaCtx, motionWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          {
            tool: 'apply_manual_keyframe_track',
            params: {
              nodeId: '1:1',
              field: { type: 'INDEXED_ITEM', collection: 'effects', index: 0, field: 'RADIUS' },
              track: { keyframes: [{ timelinePosition: 0, value: { type: 'FLOAT', value: 1 } }] },
            },
          },
        ],
      }),
    ).rejects.toThrow(/only PROPERTY fields are batchable/);
  });

  it('restores a timeline duration on rollback', async () => {
    const { figmaCtx, store, addMotionNode } = makeMotionFigma();
    const a = addMotionNode('1:1', { timelines: [{ id: 't1', duration: 1 }] });
    store.set('F', { id: 'F', fills: [] });
    const handler = createBatchHandler(figmaCtx, motionWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          {
            tool: 'set_timeline_duration',
            params: { nodeId: '1:1', timelineId: 't1', duration: 5 },
          },
          FAILING_FILL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(a.timelines[0]!.duration).toBe(1);
  });

  it('rejects Motion ops outside the Figma Design editor at capture time', async () => {
    const { figmaCtx, addMotionNode } = makeMotionFigma('figjam');
    addMotionNode('1:1');
    const handler = createBatchHandler(figmaCtx, motionWrites(figmaCtx));

    await expect(
      handler({
        ops: [{ tool: 'apply_animation_style', params: { nodeId: '1:1', styleId: 's1' } }],
      }),
    ).rejects.toThrow(/Figma Design editor/);
  });

  it.each([
    { tool: 'apply_animation_style', params: { nodeId: '1:1', styleId: 's1' } },
    {
      tool: 'apply_manual_keyframe_track',
      params: {
        nodeId: '1:1',
        field: { type: 'PROPERTY', name: 'OPACITY' },
        track: { keyframes: [{ timelinePosition: 0, value: { type: 'FLOAT', value: 1 } }] },
      },
    },
    { tool: 'set_timeline_duration', params: { nodeId: '1:1', timelineId: 't1', duration: 5 } },
  ])('rejects $tool in Dev Mode before any mutation', async op => {
    const { figmaCtx, addMotionNode } = makeMotionFigma('dev');
    const a = addMotionNode('1:1', { timelines: [{ id: 't1', duration: 1 }] });
    const handler = createBatchHandler(figmaCtx, motionWrites(figmaCtx));

    await expect(handler({ ops: [op] })).rejects.toThrow(/Figma Design editor/);

    expect(a.applyAnimationStyle).not.toHaveBeenCalled();
    expect(a.removeAnimationStyle).not.toHaveBeenCalled();
    expect(a.applyManualKeyframeTrack).not.toHaveBeenCalled();
    expect(a.removeManualKeyframeTrack).not.toHaveBeenCalled();
    expect(a.setTimelineDuration).not.toHaveBeenCalled();
  });
});
