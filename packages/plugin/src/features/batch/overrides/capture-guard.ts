import { isTextLike } from '../../text/text-like.js';
import { type BindingSnapshot, captureBindings } from '../snapshot/bindings.js';
import { captureText, type TextSnapshot } from '../snapshot/text-capture.js';
import { readField, restorable } from '../snapshot/values.js';
import {
  MISSPELLED_FIELDS,
  SIMPLE_FIELDS,
  STYLE_SETTERS,
  TEXT_CONTENT_FIELDS,
  TEXT_FIELDS,
} from './override-fields.js';
import {
  instanceChain,
  normalizeOverrides,
  type Override,
  propertyValues,
} from './override-list.js';

export interface OverrideEntry {
  readonly id: string;
  readonly fields: readonly string[];
  readonly values: Readonly<Record<string, unknown>>;
  readonly text: TextSnapshot | null;
  readonly bindings: BindingSnapshot;
}

export interface NestedSwap {
  readonly id: string;
  readonly mainId: string;
}

export interface InstanceGuard {
  readonly instanceId: string;
  readonly depth: number;
  readonly overrides: readonly Override[];
  readonly entries: readonly OverrideEntry[];
  readonly swaps: readonly NestedSwap[];
  readonly unsupported: readonly string[];
}

type FieldValues = Record<string, unknown>;

const isPlainField = (node: BaseNode, field: string): boolean =>
  (SIMPLE_FIELDS.has(field) || field in STYLE_SETTERS) &&
  field in node &&
  restorable(readField(node, field));

const valuesOf = (node: BaseNode, field: string): FieldValues | null => {
  if (isTextLike(node) && TEXT_FIELDS.has(field)) {
    return TEXT_CONTENT_FIELDS.has(field) ? {} : { [field]: readField(node, field) };
  }
  if ((field === 'width' || field === 'height') && 'resizeWithoutConstraints' in node) {
    return { width: node.width, height: node.height };
  }
  if (field === 'componentProperties' && node.type === 'INSTANCE') {
    return { componentProperties: propertyValues(node) };
  }
  if (field === 'reactions' && 'reactions' in node) return { reactions: node.reactions };
  return isPlainField(node, field) ? { [field]: readField(node, field) } : null;
};

const captureEntry = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  override: Override,
): Promise<{ entry: OverrideEntry; unsupported: string[] }> => {
  const fields: string[] = [];
  const unsupported: string[] = [];
  const values: FieldValues = {};
  for (const raw of override.fields) {
    const field = MISSPELLED_FIELDS[raw] ?? raw;
    const captured = valuesOf(node, field);
    if (captured === null) {
      unsupported.push(`${override.id}.${raw}`);
      continue;
    }
    Object.assign(values, captured);
    fields.push(field);
  }
  const needsText = isTextLike(node) && fields.some(field => TEXT_FIELDS.has(field));
  const text = needsText ? await captureText(figmaCtx, node) : null;
  const bindings = await captureBindings(figmaCtx, node, fields);
  return { entry: { id: override.id, fields, values, text, bindings }, unsupported };
};

const nestedSwaps = async (instance: InstanceNode): Promise<NestedSwap[]> => {
  const nested = instance.findAllWithCriteria({ types: ['INSTANCE'] });
  const mains = await Promise.all(nested.map(async node => node.getMainComponentAsync()));
  return nested.flatMap((node, index) => {
    const main = mains[index] ?? null;
    return main === null ? [] : [{ id: node.id, mainId: main.id }];
  });
};

const guardFor = async (figmaCtx: typeof figma, instance: InstanceNode): Promise<InstanceGuard> => {
  const overrides = normalizeOverrides(instance.overrides);
  const captured = await Promise.all(
    overrides.map(async override => {
      const node = await figmaCtx.getNodeByIdAsync(override.id);
      if (node === null) return { entry: null, unsupported: [`${override.id} (unresolvable)`] };
      return captureEntry(figmaCtx, node, override);
    }),
  );
  return {
    instanceId: instance.id,
    depth: instanceChain(instance).length,
    overrides,
    entries: captured.flatMap(({ entry }) => (entry === null ? [] : [entry])),
    swaps: await nestedSwaps(instance),
    unsupported: captured.flatMap(({ unsupported }) => unsupported),
  };
};

export const captureOverrideGuard = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
): Promise<InstanceGuard[]> => {
  const nodes = await Promise.all(ids.map(async id => figmaCtx.getNodeByIdAsync(id)));
  const instances = new Map(
    nodes
      .flatMap(node => (node === null ? [] : instanceChain(node)))
      .map(instance => [instance.id, instance]),
  );
  return Promise.all([...instances.values()].map(async instance => guardFor(figmaCtx, instance)));
};
