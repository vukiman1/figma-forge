import type { NodeMotion } from '@figma-forge/core';

interface Track {
  id: unknown;
  keyframes: unknown[];
}

const isTrack = (value: unknown): value is Track =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'keyframes' in value &&
  Array.isArray(value.keyframes);

const collectTrackIds = (value: unknown, into: Set<unknown>): Set<unknown> => {
  if (isTrack(value)) into.add(value.id);
  else if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) collectTrackIds(child, into);
  }
  return into;
};

const withoutTracks = (value: unknown, drop: (track: Track) => boolean): unknown => {
  if (isTrack(value)) return drop(value) ? undefined : value;
  if (typeof value !== 'object' || value === null) return value;
  const kept = Object.entries(value)
    .map(([key, child]: [string, unknown]) => [key, withoutTracks(child, drop)] as const)
    .filter(([, child]) => child !== undefined);
  return kept.length > 0 ? Object.fromEntries(kept) : undefined;
};

const isBoundToVariable = (track: Track): boolean =>
  JSON.stringify(track).includes('"VARIABLE_ALIAS"');

export const withoutPlayedManualTracks = (motion: NodeMotion): NodeMotion => {
  const played = collectTrackIds(motion.animations, new Set());
  const manual = withoutTracks(
    motion.manualKeyframeTracks,
    track => played.has(track.id) && !isBoundToVariable(track),
  );
  const tracks = typeof manual === 'object' && manual !== null ? { ...manual } : {};
  return { ...motion, manualKeyframeTracks: tracks };
};
