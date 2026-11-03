import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { GetDesignContextResultSchema, type GetDesignContextResult } from '@figma-forge/core';
import { z } from 'zod';

import { parseJson } from '../../parse-json.js';

export const SNAPSHOT_FORMAT_VERSION = 9;

const SNAPSHOT_SUBDIR = join('.figma-forge', 'snapshots');
const SnapshotFileSchema = z.object({
  figmaForgeSnapshot: z.literal(SNAPSHOT_FORMAT_VERSION),
  nodeId: z.string(),
  capturedAt: z.string(),
  context: GetDesignContextResultSchema,
});

export interface SnapshotFile {
  figmaForgeSnapshot: number;
  nodeId: string;
  capturedAt: string;
  context: GetDesignContextResult;
}

export interface SnapshotPaths {
  relative: string;
  absolute: string;
}

const sanitizeNodeId = (nodeId: string): string => nodeId.replace(/[^a-zA-Z0-9._-]/g, '-');

const isFileNotFound = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

export const createSnapshotPaths = (rootDir: string, nodeId: string): SnapshotPaths => {
  const relative = join(SNAPSHOT_SUBDIR, `${sanitizeNodeId(nodeId)}.json`);
  return { relative, absolute: join(rootDir, relative) };
};

export const writeDesignSnapshot = async (
  path: string,
  nodeId: string,
  context: GetDesignContextResult,
): Promise<SnapshotFile> => {
  await mkdir(dirname(path), { recursive: true });
  const snapshot: SnapshotFile = {
    figmaForgeSnapshot: SNAPSHOT_FORMAT_VERSION,
    nodeId,
    capturedAt: new Date().toISOString(),
    context,
  };
  await writeFile(path, JSON.stringify(snapshot, null, 2), 'utf8');
  return snapshot;
};

export const readDesignSnapshot = async (path: string): Promise<SnapshotFile | null> => {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error: unknown) {
    if (isFileNotFound(error)) return null;
    throw new Error(`failed to read design snapshot ${path}`, { cause: error });
  }
  const result = SnapshotFileSchema.safeParse(parseJson(content));
  return result.success ? result.data : null;
};
