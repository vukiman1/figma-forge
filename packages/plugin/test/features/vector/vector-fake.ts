import { vi } from 'vitest';

export type Affine = [[number, number, number], [number, number, number]];
export const at = (x: number, y: number): Affine => [
  [1, 0, x],
  [0, 1, y],
];
export const ctxWith = (nodes: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  ({
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    variables: {},
    ...extra,
  }) as unknown as typeof figma;

export const fakeVector = (log: string[]) => {
  const v: Record<string, unknown> = {
    id: '9:9',
    name: 'Vector',
    type: 'VECTOR',
    remove: vi.fn<() => void>(() => log.push('remove')),
    setVectorNetworkAsync: vi.fn<(n: unknown) => Promise<void>>(async n => {
      log.push('network');
      v.network = n;
    }),
  };
  let x = 0;
  Object.defineProperty(v, 'x', {
    get: () => x,
    set: (value: number) => {
      log.push(`x=${value}`);
      x = value;
    },
  });
  Object.defineProperty(v, 'vectorPaths', {
    set: (paths: { data: string }[]) => {
      if (paths.some(p => /[^MLCQZ\d .-]/.test(p.data))) {
        throw new Error('in set_vectorPaths: Failed to convert path');
      }
      log.push(`paths=${paths.map(p => p.data).join('|')}`);
    },
  });
  return v;
};
