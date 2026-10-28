export const explicitModesOf = (node: BaseNode): Record<string, string> | undefined => {
  const raw: unknown = Reflect.get(node, 'explicitVariableModes');
  if (typeof raw !== 'object' || raw === null) return undefined;
  const modes: Record<string, string> = {};
  for (const [collectionId, modeId] of Object.entries(raw)) {
    if (typeof modeId === 'string') modes[collectionId] = modeId;
  }
  return Object.keys(modes).length > 0 ? modes : undefined;
};
