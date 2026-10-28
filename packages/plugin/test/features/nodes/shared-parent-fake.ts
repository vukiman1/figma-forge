import { vi } from 'vitest';

export const setup = () => {
  const parent = { id: '0:1', type: 'FRAME', appendChild: () => {}, children: [] as unknown[] };
  const other = { id: '0:2', type: 'FRAME', appendChild: () => {}, children: [] as unknown[] };
  const paint = (r: number) => [{ type: 'SOLID', color: { r, g: 0, b: 0 } }];
  const mk = (id: string, under = parent, r = 0) => {
    const n = {
      id,
      type: 'RECTANGLE',
      parent: under,
      fills: paint(r),
      effects: [] as unknown[],
      fillStyleId: '',
      effectStyleId: '',
    };
    under.children.push(n);
    return n;
  };
  const a = mk('1:1', parent, 0.1);
  const b = mk('1:2', parent, 0.2);
  const c = mk('1:3', parent, 0.3);
  const stray = mk('2:1', other);
  const nodes: Record<string, unknown> = { '1:1': a, '1:2': b, '1:3': c, '2:1': stray };

  const made = (id: string, type: string) => {
    const r: Record<string, unknown> = {
      id,
      name: type,
      type,
      fills: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }],
      effects: [],
      setFillStyleIdAsync: async (styleId: string) => {
        r.fillStyleId = styleId;
      },
      setEffectStyleIdAsync: async (styleId: string) => {
        r.effectStyleId = styleId;
      },
    };
    return r;
  };
  const union = vi.fn<(...args: unknown[]) => unknown>(() => made('9:1', 'BOOLEAN_OPERATION'));
  const subtract = vi.fn<(...args: unknown[]) => unknown>(() => made('9:2', 'BOOLEAN_OPERATION'));
  const intersect = vi.fn<(...args: unknown[]) => unknown>(() => made('9:3', 'BOOLEAN_OPERATION'));
  const exclude = vi.fn<(...args: unknown[]) => unknown>(() => made('9:4', 'BOOLEAN_OPERATION'));
  const flatten = vi.fn<(...args: unknown[]) => unknown>(() => made('9:5', 'VECTOR'));
  const ctx = {
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    union,
    subtract,
    intersect,
    exclude,
    flatten,
  } as unknown as typeof figma;
  return { ctx, parent, a, b, c, stray, union, subtract, intersect, exclude, flatten };
};
