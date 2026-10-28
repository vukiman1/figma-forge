import { same } from '../snapshot/values.js';
import type { InstanceGuard } from './capture-guard.js';
import { describeOverrideDiff, normalizeOverrides } from './override-list.js';
import { reapplyOverrides, reswap } from './reapply-overrides.js';

const unsupportedNote = (guard: InstanceGuard, instance: InstanceNode): string =>
  `instance ${guard.instanceId} keeps override marks [${describeOverrideDiff(normalizeOverrides(instance.overrides), guard.overrides)}]` +
  ` — it was not reset because it also overrides ${guard.unsupported.join(', ')}, which` +
  ' have no verified writer';

const reapplyEntries = async (figmaCtx: typeof figma, guard: InstanceGuard): Promise<string[]> => {
  const notes: string[] = [];
  for (const entry of guard.entries) {
    // oxlint-disable-next-line no-await-in-loop -- sublayers come back in capture order
    const node = await figmaCtx.getNodeByIdAsync(entry.id);
    if (node === null)
      notes.push(`instance ${guard.instanceId}: sublayer ${entry.id} did not come back`);
    // oxlint-disable-next-line no-await-in-loop -- sublayers come back in capture order
    else await reapplyOverrides(figmaCtx, node, entry);
  }
  return notes;
};

const resetInstance = async (
  figmaCtx: typeof figma,
  instance: InstanceNode,
  guard: InstanceGuard,
): Promise<string[]> => {
  instance.removeOverrides();
  await reswap(figmaCtx, guard.swaps);
  const notes = await reapplyEntries(figmaCtx, guard);
  const after = normalizeOverrides(instance.overrides);
  if (same(after, guard.overrides)) return notes;
  return [
    ...notes,
    `instance ${guard.instanceId}: override marks differ after reset [${describeOverrideDiff(after, guard.overrides)}]`,
  ];
};

const restoreGuard = async (figmaCtx: typeof figma, guard: InstanceGuard): Promise<string[]> => {
  const instance = await figmaCtx.getNodeByIdAsync(guard.instanceId);
  if (instance?.type !== 'INSTANCE' || instance.removed) return [];
  if (same(normalizeOverrides(instance.overrides), guard.overrides)) return [];
  if (guard.unsupported.length > 0) return [unsupportedNote(guard, instance)];
  return resetInstance(figmaCtx, instance, guard);
};

export const restoreOverrideGuard = async (
  figmaCtx: typeof figma,
  guards: readonly InstanceGuard[],
): Promise<string | undefined> => {
  const notes: string[] = [];
  for (const guard of [...guards].toSorted((a, b) => a.depth - b.depth)) {
    // oxlint-disable-next-line no-await-in-loop -- outer instances settle before inner ones are compared
    notes.push(...(await restoreGuard(figmaCtx, guard)));
  }
  return notes.length === 0 ? undefined : notes.join('; ');
};
