const FIGMA_URL = /figma\.com\//i;
const NODE_ID_QUERY = /[?&]node-id=([^&]+)/i;
const NODE_ID_SHAPE = /^[\dI:;-]+$/;

export const STRING_ID_FIELDS = [
  'nodeId',
  'parentId',
  'newParentId',
  'pageId',
  'root',
  'componentId',
  'instanceId',
  'fromNodeId',
] as const;

const decodeNodeId = (url: string, fallback: string): string => {
  const captured = NODE_ID_QUERY.exec(url)?.[1];
  if (captured === undefined) return fallback;
  try {
    return decodeURIComponent(captured);
  } catch {
    return captured;
  }
};

export const normalizeNodeId = (raw: string): string => {
  const trimmed = raw.trim();
  const value = FIGMA_URL.test(trimmed) ? decodeNodeId(trimmed, raw) : trimmed;
  return value.includes('-') && NODE_ID_SHAPE.test(value) ? value.replace(/-/g, ':') : value;
};

const normalizeStringField = (
  record: Readonly<Record<string, unknown>>,
  output: Record<string, unknown>,
  field: string,
): boolean => {
  const value = record[field];
  if (typeof value !== 'string') return false;
  const normalized = normalizeNodeId(value);
  if (normalized === value) return false;
  output[field] = normalized;
  return true;
};

const normalizeNodeIds = (
  record: Readonly<Record<string, unknown>>,
  output: Record<string, unknown>,
): boolean => {
  if (!Array.isArray(record.nodeIds)) return false;
  let hasChanges = false;
  const nodeIds = record.nodeIds.map(value => {
    if (typeof value !== 'string') return value;
    const normalized = normalizeNodeId(value);
    if (normalized !== value) hasChanges = true;
    return normalized;
  });
  if (hasChanges) output.nodeIds = nodeIds;
  return hasChanges;
};

export function normalizeIdArgs<T>(args: T): T;
export function normalizeIdArgs(args: unknown): unknown {
  if (typeof args !== 'object' || args === null) return args;
  const record = Object.fromEntries(Object.entries(args));
  const output = { ...record };
  let hasChanges = false;
  for (const field of STRING_ID_FIELDS) {
    hasChanges = normalizeStringField(record, output, field) || hasChanges;
  }
  hasChanges = normalizeNodeIds(record, output) || hasChanges;
  return hasChanges ? output : args;
}
