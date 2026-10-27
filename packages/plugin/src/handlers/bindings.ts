import {
  resolveVariables,
  type VariableTable,
  variableFor,
} from '../features/variables/resolve-variables.js';

/** Serialized layout grids → Figma layout grids, with each grid's per-field bindings applied. */
export type TextStyleBindings = Record<string, string | null>;

/**
 * Resolve a text style's bindings without touching a style. Split out so create_text_style can do
 * it BEFORE `createTextStyle()` — an id that matches nothing then fails with no style to clean up.
 */
export const resolveTextStyleBindings = async (
  figmaCtx: typeof figma,
  bindings: TextStyleBindings,
  where: string,
): Promise<VariableTable> =>
  resolveVariables(
    figmaCtx,
    Object.values(bindings).filter((id): id is string => typeof id === 'string'),
    where,
  );

/** Fields whose binding changes which font face the style resolves to. */
const FONT_FIELDS = new Set(['fontFamily', 'fontStyle', 'fontWeight']);

/**
 * Sort key that orders a style's bindings family → style → the remaining font-affecting fields →
 * everything else, so each font-affecting swap lands on a face the preload already asked for.
 */
const fieldRank = (field: string): number =>
  field === 'fontFamily' ? 0 : field === 'fontStyle' ? 1 : FONT_FIELDS.has(field) ? 2 : 3;

/** Every string a variable can resolve to, across its modes — the font names a binding may need. */
const stringValues = (variable: Variable): string[] => {
  const out = new Set<string>();
  for (const value of Object.values(variable.valuesByMode)) {
    if (typeof value === 'string') out.add(value);
  }
  return [...out];
};

/**
 * Load every face a set of bindings could resolve to, best effort.
 *
 * Binding `fontFamily` throws `unloaded font "<family> <style>"` unless that face is already loaded
 * — measured; the numeric fields (fontSize / lineHeight / letterSpacing / paragraph*) need no load
 * at all. The set is walked as a chain in the order the bindings are applied below, so a family
 * swap followed by a style swap loads the face each step lands on.
 *
 * Swallowing the failures is load-bearing, not defensive. Measured on a multi-mode collection: only
 * the face the style actually RESOLVES to has to be loadable — a variable whose non-default mode
 * names a font nobody has installed still binds fine. So a face that fails to load here is usually
 * one no mode will ever resolve (a family from one mode paired with a style from another), and
 * treating that as an error would reject a binding Figma accepts. Anything genuinely missing still
 * surfaces from `setBoundVariable`, naming the exact face — a better error than one this could
 * invent.
 *
 * Every mode's value is loaded rather than just the resolved one: which mode resolves is a property
 * of the collection, not of the variable this can see, and the extra loads are parallel,
 * deduplicated and cached.
 */
const preloadFaces = async (
  figmaCtx: typeof figma,
  current: FontName,
  bindings: TextStyleBindings,
  table: VariableTable,
): Promise<void> => {
  const familyId = bindings.fontFamily;
  const styleId = bindings.fontStyle;
  const families =
    typeof familyId === 'string' ? stringValues(variableFor(table, familyId)) : [current.family];
  const styles =
    typeof styleId === 'string' ? stringValues(variableFor(table, styleId)) : [current.style];
  // Keyed so the common case — a family binding with no style binding, where the intermediate and
  // final faces are the same — asks for each face once.
  const faces = new Map<string, FontName>();
  for (const family of families) {
    // The face the family swap lands on before the style swap runs, then the final one.
    for (const style of [current.style, ...styles]) {
      faces.set(`${family}\u0000${style}`, { family, style });
    }
  }
  await Promise.all(
    [...faces.values()].map(async face => figmaCtx.loadFontAsync(face).catch(() => undefined)),
  );
};

/**
 * Apply a text style's variable bindings. Typography values are scalars, so unlike a paint or an
 * effect there is no per-object level to hang these on — the style itself is where they live.
 *
 * Ordered family → style → weight → everything else so the font-affecting swaps happen against a
 * face that was preloaded for exactly that step. The variable table is resolved separately (see
 * {@link resolveTextStyleBindings}) so a caller can fail on an unknown id before it creates anything
 * — the resolution needs no style, only the font preload does.
 */
export const applyTextStyleBindings = async (
  figmaCtx: typeof figma,
  style: TextStyle,
  bindings: TextStyleBindings,
  table: VariableTable,
): Promise<void> => {
  await preloadFaces(figmaCtx, style.fontName, bindings, table);

  const ordered = Object.entries(bindings).toSorted(([a], [b]) => fieldRank(a) - fieldRank(b));
  for (const [field, id] of ordered) {
    style.setBoundVariable(
      field as VariableBindableTextField,
      id === null ? null : variableFor(table, id),
    );
  }
};
