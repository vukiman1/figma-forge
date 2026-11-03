import {
  designDiffParams,
  GET_DESIGN_CONTEXT_TOOL_NAME,
  GetDesignContextResultSchema,
  type GetDesignContextResult,
} from '@figma-forge/core';

import { type DesignDiffChanges, diffDesignContext } from '../diff/design-diff.js';
import {
  createSnapshotPaths,
  readDesignSnapshot,
  SNAPSHOT_FORMAT_VERSION,
  type SnapshotFile,
  type SnapshotPaths,
  writeDesignSnapshot,
} from './design-diff-snapshot.js';

export { SNAPSHOT_FORMAT_VERSION };

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

export interface DesignDiffResult {
  status: 'baseline-created' | 'diff' | 'no-changes';
  nodeId: string;
  snapshotPath: string;
  baselineCapturedAt?: string;
  summary?: { added: number; removed: number; changed: number };
  changes?: DesignDiffChanges;
  baselineUpdated?: boolean;
  note?: string;
}

const identityNote = (
  baseline: GetDesignContextResult,
  current: GetDesignContextResult,
): string | undefined => {
  const baselineRoot = baseline.nodes[0];
  const currentRoot = current.nodes[0];
  if (baselineRoot === undefined || currentRoot === undefined) return undefined;
  if (baselineRoot.name === currentRoot.name && baselineRoot.type === currentRoot.type) {
    return undefined;
  }
  return (
    `baseline root was "${baselineRoot.name}" [${baselineRoot.type}] but the current root is ` +
    `"${currentRoot.name}" [${currentRoot.type}] — a different node or a renamed root. ` +
    'If this is intentional, re-baseline with update:true.'
  );
};

const selectionNote = (
  current: GetDesignContextResult,
  requestedNodeId: string | undefined,
): string | undefined =>
  requestedNodeId === undefined && current.nodes.length > 1
    ? `selection has ${current.nodes.length} root nodes; the baseline is keyed by the first ` +
      `("${current.nodes[0]?.name}"). Pass an explicit nodeId for a stable per-node baseline.`
    : undefined;

const baselineResult = async (
  paths: SnapshotPaths,
  nodeId: string,
  current: GetDesignContextResult,
  note: string | undefined,
): Promise<DesignDiffResult> => {
  await writeDesignSnapshot(paths.absolute, nodeId, current);
  return {
    status: 'baseline-created',
    nodeId,
    snapshotPath: paths.relative,
    ...(note === undefined ? {} : { note }),
  };
};

const diffResult = (
  baseline: SnapshotFile,
  current: GetDesignContextResult,
  nodeId: string,
  snapshotPath: string,
  isUpdated: boolean,
  notes: readonly (string | undefined)[],
): DesignDiffResult => {
  const changes = diffDesignContext(baseline.context, current);
  const summary = {
    added: changes.added.length,
    removed: changes.removed.length,
    changed: changes.changed.length,
  };
  const hasChanges = summary.added + summary.removed + summary.changed > 0;
  const note = notes.filter((value): value is string => value !== undefined).join(' ');
  return {
    status: hasChanges ? 'diff' : 'no-changes',
    nodeId,
    snapshotPath,
    baselineCapturedAt: baseline.capturedAt,
    summary,
    changes,
    ...(isUpdated ? { baselineUpdated: true } : {}),
    ...(note.length === 0 ? {} : { note }),
  };
};

export const handleDesignDiff = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<DesignDiffResult> => {
  const args = designDiffParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();
  const contextResult = await dispatch(GET_DESIGN_CONTEXT_TOOL_NAME, {
    ...(args.nodeId === undefined ? {} : { nodeId: args.nodeId }),
    detail: 'full',
    dedupeComponents: true,
  });
  const current = GetDesignContextResultSchema.parse(contextResult);
  const nodeId = args.nodeId ?? current.nodes[0]?.id;
  if (nodeId === undefined) {
    throw new Error('design_diff: no node to diff (empty selection and no nodeId)');
  }
  const paths = createSnapshotPaths(rootDir, nodeId);
  const existing = await readDesignSnapshot(paths.absolute);
  const multiRootNote = selectionNote(current, args.nodeId);
  if (existing === null) return baselineResult(paths, nodeId, current, multiRootNote);
  if (args.update === true) await writeDesignSnapshot(paths.absolute, nodeId, current);
  return diffResult(existing, current, nodeId, paths.relative, args.update === true, [
    identityNote(existing.context, current),
    multiRootNote,
  ]);
};
