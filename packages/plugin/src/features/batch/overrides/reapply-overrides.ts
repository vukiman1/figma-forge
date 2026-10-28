import { writePaints } from '../../paint/write-paints.js';
import { isTextLike, type TextLike } from '../../text/text-like.js';
import { rebind } from '../snapshot/bindings.js';
import { fontsOf, loadFonts } from '../snapshot/text-capture.js';
import { restoreText } from '../snapshot/text-restore.js';
import { readField, restorable, same } from '../snapshot/values.js';
import type { NestedSwap, OverrideEntry } from './capture-guard.js';
import { STYLE_SETTERS, TEXT_CONTENT_FIELDS } from './override-fields.js';
import { type PropertyValue, propertyValues } from './override-list.js';

const SIZE_FIELDS: ReadonlySet<string> = new Set(['width', 'height']);

const reswapOne = async (figmaCtx: typeof figma, swap: NestedSwap): Promise<void> => {
  const node = await figmaCtx.getNodeByIdAsync(swap.id);
  if (node?.type !== 'INSTANCE') return;
  const main = await node.getMainComponentAsync();
  if (main?.id === swap.mainId) return;
  const component = await figmaCtx.getNodeByIdAsync(swap.mainId);
  if (component?.type !== 'COMPONENT') {
    throw new Error(`component ${swap.mainId} for nested instance ${swap.id} no longer exists`);
  }
  node.swapComponent(component);
};

export const reswap = async (
  figmaCtx: typeof figma,
  swaps: readonly NestedSwap[],
): Promise<void> => {
  for (const swap of swaps) {
    // oxlint-disable-next-line no-await-in-loop -- document order: an outer swap lands before inner lookups
    await reswapOne(figmaCtx, swap);
  }
};

const reapplyText = async (
  figmaCtx: typeof figma,
  node: TextLike,
  entry: OverrideEntry,
): Promise<void> => {
  if (entry.text === null) return;
  if (entry.fields.includes('styledTextSegments')) {
    await restoreText(figmaCtx, node, entry.text);
    return;
  }
  await loadFonts(figmaCtx, [...entry.text.fonts, ...fontsOf(figmaCtx, node)]);
  if (entry.fields.includes('characters')) node.characters = entry.text.characters;
};

const isPropertyValues = (value: unknown): value is Record<string, PropertyValue> =>
  typeof value === 'object' && value !== null;

const reapplyProperties = (node: InstanceNode, wanted: unknown): void => {
  if (!isPropertyValues(wanted)) return;
  const current = propertyValues(node);
  const changed = Object.fromEntries(
    Object.entries(wanted).filter(([key, value]) => !same(current[key], value)),
  );
  if (Object.keys(changed).length > 0) node.setProperties(changed);
};

const reapplySize = (node: BaseNode, entry: OverrideEntry): void => {
  const { width, height } = entry.values;
  if (
    'resizeWithoutConstraints' in node &&
    typeof width === 'number' &&
    typeof height === 'number'
  ) {
    node.resizeWithoutConstraints(width, height);
  }
};

const isReactionList = (value: unknown): value is Reaction[] => Array.isArray(value);
const isPaintList = (value: unknown): value is Paint[] => Array.isArray(value);

const reapplyField = async (node: BaseNode, field: string, value: unknown): Promise<void> => {
  const setter = STYLE_SETTERS[field];
  const call = setter === undefined ? undefined : readField(node, setter);
  if (typeof call === 'function') {
    await Reflect.apply(call, node, [value]);
  } else if (field === 'componentProperties' && node.type === 'INSTANCE') {
    reapplyProperties(node, value);
  } else if (field === 'reactions' && 'setReactionsAsync' in node && isReactionList(value)) {
    await node.setReactionsAsync(value);
  } else if ((field === 'fills' || field === 'strokes') && isPaintList(value)) {
    await writePaints(node, field, value);
  } else if (restorable(value)) {
    Reflect.set(node, field, value);
  }
};

const SIZE_STEP = '<size>';

const replaySteps = (fields: readonly string[]): string[] => {
  const steps = fields
    .filter(field => !TEXT_CONTENT_FIELDS.has(field))
    .map(field => (SIZE_FIELDS.has(field) ? SIZE_STEP : field));
  return steps.filter((step, index) => step !== SIZE_STEP || steps.indexOf(SIZE_STEP) === index);
};

export const reapplyOverrides = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  entry: OverrideEntry,
): Promise<void> => {
  if (isTextLike(node)) await reapplyText(figmaCtx, node, entry);
  for (const step of replaySteps(entry.fields)) {
    if (step === SIZE_STEP) reapplySize(node, entry);
    // oxlint-disable-next-line no-await-in-loop -- overrides replay in capture order
    else await reapplyField(node, step, entry.values[step]);
  }
  rebind(node, entry.bindings);
};
