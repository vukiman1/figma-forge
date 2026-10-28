import { vi } from 'vitest';

import type { SandboxHandlers } from '../../../src/dispatcher.js';
import { createApplyAnimationStyleHandler } from '../../../src/features/motion/apply-animation-style.handler.js';
import { createApplyManualKeyframeTrackHandler } from '../../../src/features/motion/apply-manual-keyframe-track.handler.js';
import { createSetTimelineDurationHandler } from '../../../src/features/motion/set-timeline-duration.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';

export const makeMotionFigma = (editorType = 'figma') => {
  const store = new Map<string, Record<string, unknown>>();

  const addMotionNode = (
    id: string,
    init: { tracks?: Record<string, unknown>; timelines?: { id: string; duration: number }[] } = {},
  ) => {
    const applied: { id: string; styleId: string }[] = [];
    const tracks: Record<string, unknown> = { ...init.tracks };
    const timelines = init.timelines ?? [];
    let seq = 0;
    const node = {
      id,
      get animationStyles() {
        return applied.slice();
      },
      get manualKeyframeTracks() {
        return tracks;
      },
      get timelines() {
        return timelines;
      },
      applyAnimationStyle: vi.fn<(styleId: string) => string>((styleId: string) => {
        const appliedId = `${id}:as:${(seq += 1)}`;
        applied.push({ id: appliedId, styleId });
        return appliedId;
      }),
      removeAnimationStyle: vi.fn<(appliedId: string) => void>((appliedId: string) => {
        const i = applied.findIndex(a => a.id === appliedId);
        if (i >= 0) applied.splice(i, 1);
      }),
      applyManualKeyframeTrack: vi.fn<
        (field: { type: string; name?: string }, track: unknown) => void
      >((field: { type: string; name?: string }, track: unknown) => {
        if (field.type === 'PROPERTY' && field.name !== undefined) tracks[field.name] = track;
      }),
      removeManualKeyframeTrack: vi.fn<(field: { type: string; name?: string }) => void>(
        (field: { type: string; name?: string }) => {
          if (field.type === 'PROPERTY' && field.name !== undefined) delete tracks[field.name];
        },
      ),
      setTimelineDuration: vi.fn<(tid: string, d: number) => void>((tid: string, d: number) => {
        const t = timelines.find(x => x.id === tid);
        if (t !== undefined) t.duration = d;
      }),
    };
    store.set(id, node);
    return node;
  };

  const figmaCtx = {
    editorType,
    root: { children: [] },
    getNodeByIdAsync: async (id: string) => store.get(id) ?? null,
  } as unknown as typeof figma;

  return { figmaCtx, store, addMotionNode };
};

export const motionWrites = (figmaCtx: typeof figma): SandboxHandlers => ({
  apply_animation_style: createApplyAnimationStyleHandler(figmaCtx),
  apply_manual_keyframe_track: createApplyManualKeyframeTrackHandler(figmaCtx),
  set_timeline_duration: createSetTimelineDurationHandler(figmaCtx),
  set_fills: createSetFillsHandler(figmaCtx),
});

export const FAILING_FILL = {
  tool: 'set_fills',
  params: { nodeId: 'F', fills: [{ type: 'GRADIENT_LINEAR' }] },
};
