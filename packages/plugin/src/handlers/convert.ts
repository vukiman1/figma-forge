import type {
  SerializedAction,
  SerializedLayoutGrid,
  SerializedLineHeight,
  SerializedReaction,
  SerializedTrigger,
} from '@figma-forge/core';

// Inverse of serializer.ts — turn the wire-format back into Figma API objects for write tools.
// (serializer.ts owns the Figma → wire direction; these are the matching wire → Figma helpers.)

/** The colour spaces a write may name its channels in. */
export const toFigmaLayoutGrid = (g: SerializedLayoutGrid): LayoutGrid => {
  if (g.pattern === 'GRID') {
    return { pattern: 'GRID', visible: g.visible, sectionSize: g.sectionSize ?? 10 };
  }
  if (g.pattern === 'ROWS' || g.pattern === 'COLUMNS') {
    const alignment = g.alignment ?? 'STRETCH';
    return {
      pattern: g.pattern,
      visible: g.visible,
      alignment,
      gutterSize: g.gutterSize ?? 0,
      count: g.count ?? 1,
      // Figma rejects `offset` on a CENTER grid at runtime (it's ignored there) — only MIN/MAX/STRETCH
      // accept it. Omit it for CENTER so a valid centered grid isn't rejected for carrying the key.
      ...(alignment === 'CENTER' ? {} : { offset: g.offset ?? 0 }),
      ...(g.sectionSize === undefined ? {} : { sectionSize: g.sectionSize }),
    } as LayoutGrid;
  }
  throw new TypeError(`unsupported layout grid pattern: ${g.pattern}`);
};

/**
 * Wire font → Figma `FontNameInput`. `style` is optional: Figma then resolves the named instance
 * closest to `variationSettings`, which is how a caller holding a CSS weight expresses itself
 * without knowing what the family calls that instance. Rebuilt field by field rather than passed
 * through, so nothing beyond the three known keys reaches `figma.*`.
 */
export const toFigmaFontName = (fn: {
  family?: unknown;
  style?: unknown;
  variationSettings?: unknown;
}): FontNameInput => {
  if (typeof fn.family !== 'string') throw new TypeError('fontName.family must be a string');
  // Built mutably — `FontNameInput`'s own fields are readonly, and the result is assignable to it.
  const out: { family: string; style?: string; variationSettings?: Record<string, number> } = {
    family: fn.family,
  };
  if (fn.style !== undefined) {
    if (typeof fn.style !== 'string') throw new TypeError('fontName.style must be a string');
    out.style = fn.style;
  }
  if (fn.variationSettings !== undefined) {
    if (typeof fn.variationSettings !== 'object' || fn.variationSettings === null) {
      throw new TypeError('fontName.variationSettings must be an object of axis tag → number');
    }
    const axes: Record<string, number> = {};
    for (const [tag, value] of Object.entries(fn.variationSettings)) {
      if (typeof value !== 'number') {
        throw new TypeError(`fontName.variationSettings.${tag} must be a number`);
      }
      axes[tag] = value;
    }
    out.variationSettings = axes;
  }
  return out;
};

/** Wire line height → Figma LineHeight (AUTO omits value). */
export const toFigmaLineHeight = (lh: SerializedLineHeight): LineHeight => {
  if (lh.unit === 'AUTO') return { unit: 'AUTO' };
  if (typeof lh.value !== 'number') {
    throw new TypeError(`lineHeight unit ${lh.unit} requires a numeric value`);
  }
  return { unit: lh.unit as 'PIXELS' | 'PERCENT', value: lh.value };
};

const toFigmaTrigger = (t: SerializedTrigger | null): Trigger | null =>
  t === null ? null : ({ ...t } as unknown as Trigger);

const toFigmaAction = (a: SerializedAction): Action => ({ ...a }) as unknown as Action;

/** Wire reaction → Figma Reaction (modern `actions` array form). */
export const toFigmaReaction = (r: SerializedReaction): Reaction =>
  ({
    trigger: toFigmaTrigger(r.trigger),
    actions: r.actions.map(toFigmaAction),
  }) as unknown as Reaction;
