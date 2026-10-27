import type { SerializedAction, SerializedReaction, SerializedTrigger } from '@figma-forge/core';

// Inverse of serializer.ts — turn the wire-format back into Figma API objects for write tools.
// (serializer.ts owns the Figma → wire direction; these are the matching wire → Figma helpers.)

/** The colour spaces a write may name its channels in. */
const toFigmaTrigger = (t: SerializedTrigger | null): Trigger | null =>
  t === null ? null : ({ ...t } as unknown as Trigger);

const toFigmaAction = (a: SerializedAction): Action => ({ ...a }) as unknown as Action;

/** Wire reaction → Figma Reaction (modern `actions` array form). */
export const toFigmaReaction = (r: SerializedReaction): Reaction =>
  ({
    trigger: toFigmaTrigger(r.trigger),
    actions: r.actions.map(toFigmaAction),
  }) as unknown as Reaction;
