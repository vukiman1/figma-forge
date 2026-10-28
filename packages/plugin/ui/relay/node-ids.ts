const NODE_ID_PATTERN = /^[A-Za-z]?\d+:\d+(?:;[A-Za-z]?\d+:\d+)*$/;
const ID_KEYS: ReadonlySet<string> = new Set(['nodeId', 'nodeIds']);
const MAX_DEPTH = 6;
const MAX_IDS = 50;

const isNodeId = (value: unknown): value is string =>
  typeof value === 'string' && NODE_ID_PATTERN.test(value);

const addIds = (value: unknown, out: Set<string>): void => {
  if (isNodeId(value)) {
    out.add(value);
    return;
  }
  if (!Array.isArray(value)) return;
  for (const id of value) {
    if (isNodeId(id)) out.add(id);
    if (out.size >= MAX_IDS) break;
  }
};

const collect = (value: unknown, depth: number, out: Set<string>): void => {
  if (depth > MAX_DEPTH || out.size >= MAX_IDS || value === null || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, depth + 1, out);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (ID_KEYS.has(key)) addIds(child, out);
    collect(child, depth + 1, out);
  }
};

export const extractNodeIds = (...sources: unknown[]): string[] => {
  const out = new Set<string>();
  for (const source of sources) collect(source, 0, out);
  return [...out];
};
