export const serializeCodeSyntax = (raw: unknown): Record<string, string> | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const out: Record<string, string> = {};
  for (const [platform, name] of Object.entries(raw)) {
    if (typeof name === 'string' && name !== '') out[platform] = name;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};
