import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { designDiffParams } from '@figma-forge/core';
import { GET_DESIGN_CONTEXT_TOOL_NAME, type GetDesignContextResult } from '@figma-forge/core';

import { type DesignDiffChanges, diffDesignContext } from '../diff/design-diff.js';

/**
 * Bumped only when the on-disk snapshot shape changes; an older file is re-baselined, never
 * mis-diffed. v2: the read-dimension batch (itemReverseZIndex / strokesIncludedInLayout /
 * targetAspectRatio / numberOfFixedChildren / annotations / filtersApplied) — a v1 baseline lacking
 * those fields would report them as spurious "changes" against a fresh capture. v3: every field
 * added since without a bump — textWrapStyle, the motion summary, component-property references,
 * gradient cssAngle, font variationSettings, shader identity, cornerSmoothing, variableModes.
 * test/design-diff-format.test.ts now fails when the captured shape changes, so the next one is a
 * decision rather than an oversight. v4: a grid's gridItemsPositioning / gridAutoTracks, and no
 * cell anchors on the children of a ROW_AUTO_FLOW grid — a v3 baseline would report every flowing
 * child's anchors as removed. v5: a CROP fill's imageTransform / cssTransform, and a gradient's
 * stops with the paint's own opacity folded into their hex — a v4 baseline would report every crop,
 * and every gradient whose paint isn't fully opaque, as changed. v6: a noise effect's noiseType /
 * noiseSizeVector / density / color / secondaryColor / opacity — a v5 baseline holds every noise as
 * bare type + visible, and would report each one as changed. v7: a glass effect's light,
 * refraction, depth, dispersion and splay, a texture's grain and clipping, a progressive blur's
 * ramp and cssLayers, a background blur's drawn: false, and a shadow's showShadowBehindNode /
 * blendMode — a v6 baseline holds those effects without them. v8: Figma Draw — a repeat group's
 * transformModifiers / repeatTransforms, a brush / dynamic stroke's complexStrokeProperties, a
 * width profile, a text path's text, typography and textPathStartData, the renderBounds of those
 * nodes, and a pattern's verticalAlignment — a v7 baseline reads a dial as one tick and a text path
 * as an empty shape.
 */
export const SNAPSHOT_FORMAT_VERSION = 9;

const SNAPSHOT_SUBDIR = join('.figma-forge', 'snapshots');

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

/**
 * The on-disk snapshot: a format tag + provenance + the raw get_design_context result
 * (re-diffable).
 */
interface SnapshotFile {
  figmaForgeSnapshot: number;
  nodeId: string;
  capturedAt: string;
  context: GetDesignContextResult;
}

export interface DesignDiffResult {
  status: 'baseline-created' | 'diff' | 'no-changes';
  /** The node id the baseline is keyed by (the requested nodeId, or the resolved root). */
  nodeId: string;
  /** Repo-relative path of the baseline file. */
  snapshotPath: string;
  /** When the compared-against baseline was captured (absent on baseline-created). */
  baselineCapturedAt?: string;
  summary?: { added: number; removed: number; changed: number };
  changes?: DesignDiffChanges;
  /** True when update:true rewrote the baseline to the current design. */
  baselineUpdated?: boolean;
  note?: string;
}

const sanitize = (id: string): string => id.replace(/[^a-zA-Z0-9._-]/g, '-');

/**
 * Root-identity sanity check: warn (don't refuse) when the baseline root looks like a different
 * node.
 */
const identityNote = (
  baseline: GetDesignContextResult,
  current: GetDesignContextResult,
): string | undefined => {
  const b = baseline.nodes[0];
  const c = current.nodes[0];
  if (b === undefined || c === undefined) return undefined;
  if (b.name === c.name && b.type === c.type) return undefined;
  return (
    `baseline root was "${b.name}" [${b.type}] but the current root is "${c.name}" [${c.type}] — ` +
    'a different node or a renamed root. If this is intentional, re-baseline with update:true.'
  );
};

const writeSnapshot = async (
  absPath: string,
  nodeId: string,
  context: GetDesignContextResult,
): Promise<SnapshotFile> => {
  await mkdir(dirname(absPath), { recursive: true });
  const snap: SnapshotFile = {
    figmaForgeSnapshot: SNAPSHOT_FORMAT_VERSION,
    nodeId,
    capturedAt: new Date().toISOString(),
    context,
  };
  await writeFile(absPath, JSON.stringify(snap, null, 2), 'utf8');
  return snap;
};

/** Read + validate a baseline; returns null when absent, unreadable, unparseable, or a stale format. */
const readSnapshot = async (absPath: string): Promise<SnapshotFile | null> => {
  let raw: string;
  try {
    raw = await readFile(absPath, 'utf8');
  } catch {
    return null; // ENOENT (no baseline) or unreadable — treat as "no baseline".
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SnapshotFile>;
    if (
      parsed.figmaForgeSnapshot !== SNAPSHOT_FORMAT_VERSION ||
      typeof parsed.context !== 'object' ||
      parsed.context === null
    ) {
      return null; // Stale format or corrupt → re-baseline rather than mis-diff.
    }
    return parsed as SnapshotFile;
  } catch {
    return null;
  }
};

/**
 * Snapshot-or-diff a node's design. Fetches the current get_design_context once (the only plugin
 * round-trip — reading the baseline and computing the diff are local + synchronous), then either
 * writes the first baseline or diffs against the saved one. Pure diff logic lives in
 * diff/design-diff.
 */
export const handleDesignDiff = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<DesignDiffResult> => {
  const args = designDiffParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();

  const current = (await dispatch(GET_DESIGN_CONTEXT_TOOL_NAME, {
    ...(args.nodeId === undefined ? {} : { nodeId: args.nodeId }),
    detail: 'full',
    dedupeComponents: true,
  })) as GetDesignContextResult;

  // Key the baseline by the requested nodeId, or the resolved root when the selection was used.
  const key = args.nodeId ?? current.nodes[0]?.id;
  if (key === undefined) {
    throw new Error('design_diff: no node to diff (empty selection and no nodeId)');
  }
  const relPath = join(SNAPSHOT_SUBDIR, `${sanitize(key)}.json`);
  const absPath = join(rootDir, relPath);
  const multiRootNote =
    args.nodeId === undefined && current.nodes.length > 1
      ? `selection has ${current.nodes.length} root nodes; the baseline is keyed by the first ("${current.nodes[0]?.name}"). Pass an explicit nodeId for a stable per-node baseline.`
      : undefined;

  const existing = await readSnapshot(absPath);

  if (existing === null) {
    await writeSnapshot(absPath, key, current);
    return {
      status: 'baseline-created',
      nodeId: key,
      snapshotPath: relPath,
      ...(multiRootNote === undefined ? {} : { note: multiRootNote }),
    };
  }

  const changes = diffDesignContext(existing.context, current);
  const summary = {
    added: changes.added.length,
    removed: changes.removed.length,
    changed: changes.changed.length,
  };
  const hasChanges = summary.added + summary.removed + summary.changed > 0;

  if (args.update === true) await writeSnapshot(absPath, key, current);

  const notes = [identityNote(existing.context, current), multiRootNote].filter(
    (n): n is string => n !== undefined,
  );

  return {
    status: hasChanges ? 'diff' : 'no-changes',
    nodeId: key,
    snapshotPath: relPath,
    baselineCapturedAt: existing.capturedAt,
    summary,
    changes,
    ...(args.update === true ? { baselineUpdated: true } : {}),
    ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
  };
};
