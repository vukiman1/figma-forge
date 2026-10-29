import type { SerializedGridTrack } from '@figma-forge/core';

interface RawGridTrack {
  readonly type: unknown;
  readonly value: unknown;
}

const isRawGridTrack = (track: unknown): track is RawGridTrack =>
  typeof track === 'object' && track !== null && 'type' in track && 'value' in track;

export const serializeGridTracks = (tracks: unknown): SerializedGridTrack[] | undefined => {
  if (!Array.isArray(tracks)) return undefined;
  return tracks
    .filter(isRawGridTrack)
    .map(track => ({ type: String(track.type), value: Number(track.value) }));
};
