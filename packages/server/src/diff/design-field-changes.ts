import { deepEqual } from './deep-equal.js';
import type { FieldChange, FlatDesignNode } from './design-diff-types.js';

const findValueChanges = (before: FlatDesignNode, after: FlatDesignNode): FieldChange[] => {
  const changes: FieldChange[] = [];
  const keys = new Set([...Object.keys(before.own), ...Object.keys(after.own)]);
  for (const field of [...keys].toSorted()) {
    const beforeValue = before.own[field];
    const afterValue = after.own[field];
    if (!deepEqual(beforeValue, afterValue)) {
      changes.push({ field, before: beforeValue, after: afterValue });
    }
  }
  return changes;
};

const findStructuralChange = (
  before: FlatDesignNode,
  after: FlatDesignNode,
): FieldChange | null => {
  if (before.parentId !== after.parentId) {
    return { field: 'parent', before: before.parentId, after: after.parentId };
  }
  if (before.index !== after.index) {
    return { field: 'order', before: before.index, after: after.index };
  }
  return null;
};

export const findFieldChanges = (before: FlatDesignNode, after: FlatDesignNode): FieldChange[] => {
  const changes = findValueChanges(before, after);
  const structuralChange = findStructuralChange(before, after);
  if (structuralChange !== null) changes.push(structuralChange);
  return changes;
};
