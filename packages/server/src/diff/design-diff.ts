import type { GetDesignContextResult } from '@figma-forge/core';

import { flattenDesignContext } from './design-context-resolver.js';
import type {
  DesignDiffChanges,
  FieldChange,
  FlatDesignNode,
  NodeChange,
  NodeChangeKind,
} from './design-diff-types.js';
import { findFieldChanges } from './design-field-changes.js';

const createNodeChange = (
  node: FlatDesignNode,
  id: string,
  kind: NodeChangeKind,
  fields?: FieldChange[],
): NodeChange => ({
  id,
  name: node.name,
  type: node.type,
  path: node.path,
  kind,
  ...(fields === undefined ? {} : { fields }),
});

const findRemovedAndChanged = (
  before: ReadonlyMap<string, FlatDesignNode>,
  after: ReadonlyMap<string, FlatDesignNode>,
): Pick<DesignDiffChanges, 'removed' | 'changed'> => {
  const removed: NodeChange[] = [];
  const changed: NodeChange[] = [];
  for (const [id, node] of before) {
    const current = after.get(id);
    if (current === undefined) {
      removed.push(createNodeChange(node, id, 'removed'));
      continue;
    }
    const fields = findFieldChanges(node, current);
    if (fields.length > 0) changed.push(createNodeChange(current, id, 'changed', fields));
  }
  return { removed, changed };
};

const findAdded = (
  before: ReadonlyMap<string, FlatDesignNode>,
  after: ReadonlyMap<string, FlatDesignNode>,
): NodeChange[] =>
  [...after].flatMap(([id, node]) => (before.has(id) ? [] : [createNodeChange(node, id, 'added')]));

export const diffDesignContext = (
  baseline: GetDesignContextResult,
  current: GetDesignContextResult,
): DesignDiffChanges => {
  const before = flattenDesignContext(baseline);
  const after = flattenDesignContext(current);
  const { removed, changed } = findRemovedAndChanged(before, after);
  return { added: findAdded(before, after), removed, changed };
};

export { deepEqual } from './deep-equal.js';
export type { DesignDiffChanges } from './design-diff-types.js';
