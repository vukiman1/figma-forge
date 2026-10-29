import type { NodeMotion } from '@figma-forge/core';

export const toPlainJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const plainRecord = (value: unknown): Record<string, unknown> => {
  const plain = toPlainJson(value);
  return typeof plain === 'object' && plain !== null ? { ...plain } : {};
};

const plainList = (value: unknown): unknown[] => {
  const plain = toPlainJson(value);
  return Array.isArray(plain) ? plain : [];
};

export const readNodeMotion = (node: MotionNodeMixin): NodeMotion => ({
  animationStyles: plainList(node.animationStyles),
  animations: plainRecord(node.animations),
  manualKeyframeTracks: plainRecord(node.manualKeyframeTracks),
  timelines: node.timelines.map(timeline => ({
    ...plainRecord(timeline),
    id: timeline.id,
    duration: timeline.duration,
  })),
});

export const hasKeyframe = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  if ('keyframes' in value && Array.isArray(value.keyframes) && value.keyframes.length > 0) {
    return true;
  }
  return Object.values(value).some(hasKeyframe);
};
