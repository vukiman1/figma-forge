import { vi } from 'vitest';

export const setup = () => {
  const parent = { id: '0:1', type: 'FRAME', appendChild: () => {}, children: [] as unknown[] };
  const mk = (id: string, type = 'RECTANGLE') => {
    const n = { id, type, parent };
    parent.children.push(n);
    return n;
  };
  const a = mk('1:1');
  const b = mk('1:2');
  const top = mk('1:3');
  const group = { id: '5:1', type: 'TRANSFORM_GROUP', transformModifiers: [] as unknown[] };
  const nodes: Record<string, unknown> = { '1:1': a, '1:2': b, '1:3': top, '5:1': group };
  const transformGroup = vi.fn<(...args: unknown[]) => unknown>(() => ({
    id: '9:1',
    name: 'Repeat group',
    type: 'TRANSFORM_GROUP',
  }));
  const ctx = {
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    transformGroup,
  } as unknown as typeof figma;
  return { ctx, parent, a, b, top, group, transformGroup };
};

export const LINEAR = { repeatType: 'LINEAR', count: 3, offset: 10 };
