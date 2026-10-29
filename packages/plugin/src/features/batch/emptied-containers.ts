import { type ParsedOp, opLabel } from './batch-ops.js';

const SELF_DELETING: ReadonlySet<string> = new Set([
  'GROUP',
  'BOOLEAN_OPERATION',
  'TRANSFORM_GROUP',
  'COMPONENT_SET',
]);

interface Leaving {
  readonly container: BaseNode & ChildrenMixin;
  readonly ids: Set<string>;
  readonly ops: Set<string>;
}

interface Departure {
  readonly container: BaseNode & ChildrenMixin;
  readonly id: string;
  readonly op: string;
}

const isSelfDeleting = (node: BaseNode | null): node is BaseNode & ChildrenMixin =>
  node !== null && SELF_DELETING.has(node.type) && 'children' in node;

const departuresOf = async (figmaCtx: typeof figma, op: ParsedOp): Promise<Departure[]> => {
  if (op.inverse.moves === undefined) return [];
  const { nodeIds, destinationId } = await op.inverse.moves(figmaCtx, op.params);
  const nodes = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
  return nodes.flatMap(node => {
    const parent = node?.parent ?? null;
    if (node === null || !isSelfDeleting(parent) || parent.id === destinationId) return [];
    return [{ container: parent, id: node.id, op: opLabel(op) }];
  });
};

const groupByContainer = (departures: readonly Departure[]): Leaving[] => {
  const leaving = new Map<string, Leaving>();
  for (const { container, id, op } of departures) {
    const entry = leaving.get(container.id) ?? { container, ids: new Set(), ops: new Set() };
    entry.ids.add(id);
    entry.ops.add(op);
    leaving.set(container.id, entry);
  }
  return [...leaving.values()];
};

export const refuseEmptiedContainers = async (
  figmaCtx: typeof figma,
  ops: readonly ParsedOp[],
): Promise<void> => {
  const departures = await Promise.all(ops.map(async op => departuresOf(figmaCtx, op)));
  const emptied = groupByContainer(departures.flat()).find(
    ({ container, ids }) => ids.size >= container.children.length,
  );
  if (emptied === undefined) return;
  const { container, ops: by } = emptied;
  throw new Error(
    `batch: ${[...by].join(', ')} would empty ${container.type} ${container.id}, which Figma ` +
      'then deletes — a deleted node cannot come back under its id, so this batch has no ' +
      'faithful rollback (move the container itself, or keep one child in it)',
  );
};
