export const MIN_PLUGIN_VERSION = '0.7.0';

const parse = (version: string): { core: [number, number, number]; pre: string | null } | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+[\w.-]+)?$/.exec(version);
  if (match === null) return null;
  const [, major, minor, patch, pre] = match;
  if (major === undefined || minor === undefined || patch === undefined) return null;
  return { core: [Number(major), Number(minor), Number(patch)], pre: pre ?? null };
};

const NUMERIC_IDENTIFIER = /^\d+$/;

const compareIdentifier = (left: string, right: string): number => {
  const leftIsNumber = NUMERIC_IDENTIFIER.test(left);
  const rightIsNumber = NUMERIC_IDENTIFIER.test(right);
  if (leftIsNumber && rightIsNumber) return Math.sign(Number(left) - Number(right));
  if (leftIsNumber !== rightIsNumber) return leftIsNumber ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
};

const comparePre = (a: string, b: string): number => {
  const left = a.split('.');
  const right = b.split('.');
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const l = left[i];
    const r = right[i];
    if (l === undefined) return -1;
    if (r === undefined) return 1;
    const order = compareIdentifier(l, r);
    if (order !== 0) return order;
  }
  return 0;
};

const CORE_PARTS = [0, 1, 2] as const;

export const compareVersions = (a: string, b: string): number | null => {
  const left = parse(a);
  const right = parse(b);
  if (left === null || right === null) return null;
  for (const part of CORE_PARTS) {
    if (left.core[part] !== right.core[part]) return left.core[part] < right.core[part] ? -1 : 1;
  }
  if (left.pre === null && right.pre === null) return 0;
  if (left.pre === null) return 1;
  if (right.pre === null) return -1;
  return comparePre(left.pre, right.pre);
};

export const pluginSkewNotice = (pluginVersion: string, serverVersion: string): string =>
  `${pluginSkewSummary(pluginVersion, serverVersion)} ` +
  'Arguments added after it was built are silently ignored, which is why nothing in the result ' +
  'itself looks wrong. Update the plugin: run `pnpm build` in the figma-forge repo so ' +
  'packages/plugin/manifest.json and dist are rebuilt, then close and run the plugin again.';

export const pluginSkewSummary = (pluginVersion: string, serverVersion: string): string =>
  `Figma Forge plugin ${parse(pluginVersion) === null ? `"${pluginVersion}"` : `v${pluginVersion}`} ` +
  `is older than this server (v${serverVersion}), so this result is unverified — an edit may have ` +
  'applied only part of what was asked, and reads can be incomplete.';

export const requiredPluginVersion = (serverVersion: string): string => {
  const order = compareVersions(MIN_PLUGIN_VERSION, serverVersion);
  if (order === null) return MIN_PLUGIN_VERSION;
  return order <= 0 ? MIN_PLUGIN_VERSION : serverVersion;
};

export const checkPluginCompatibility = (pluginVersion: string, serverVersion: string): boolean => {
  const order = compareVersions(pluginVersion, requiredPluginVersion(serverVersion));
  return order !== null && order >= 0;
};
