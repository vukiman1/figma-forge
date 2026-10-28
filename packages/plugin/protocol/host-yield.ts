export const HOST_YIELD_TAG = '@figma-forge/yield';

interface HostYieldBase {
  readonly tag: typeof HOST_YIELD_TAG;
  readonly id: number;
}

export type HostYieldMessage = HostYieldBase &
  ({ kind: 'yield-request' } | { kind: 'yield-resume'; background: boolean });

export const createHostYield = (
  id: number,
  kind: HostYieldMessage['kind'],
  background = false,
): HostYieldMessage =>
  kind === 'yield-request'
    ? { tag: HOST_YIELD_TAG, kind, id }
    : { tag: HOST_YIELD_TAG, kind, id, background };

const isHostYieldKind = (kind: unknown): kind is HostYieldMessage['kind'] =>
  kind === 'yield-request' || kind === 'yield-resume';

const isYieldId = (id: unknown): id is number =>
  typeof id === 'number' && Number.isSafeInteger(id) && id > 0;

const fieldOf = (raw: object, key: string): unknown => Reflect.get(raw, key);

export const parseHostYield = (raw: unknown): HostYieldMessage | null => {
  if (raw === null || typeof raw !== 'object' || fieldOf(raw, 'tag') !== HOST_YIELD_TAG)
    return null;
  const kind = fieldOf(raw, 'kind');
  const id = fieldOf(raw, 'id');
  const background = fieldOf(raw, 'background');
  if (!isHostYieldKind(kind) || !isYieldId(id)) return null;
  if (kind === 'yield-resume' && typeof background !== 'boolean') return null;
  return createHostYield(id, kind, background === true);
};
