import { vi } from 'vitest';

import { MIXED } from './batch-fake.js';

export const makeWide = () => {
  const store = new Map<string, Record<string, unknown>>();
  const styles = new Map<string, Record<string, unknown>>();
  const variables = new Map<string, Record<string, unknown>>();
  const collections = new Map<string, Record<string, unknown>>();
  const pages = { current: 'P:1' };
  let seq = 0;
  const figmaCtx = {
    mixed: MIXED,
    root: { children: [] },
    get currentPage() {
      return store.get(pages.current);
    },
    setCurrentPageAsync: vi.fn<(p: { id: string }) => Promise<void>>(async p => {
      pages.current = p.id;
    }),
    getNodeByIdAsync: async (id: string) => store.get(id) ?? null,
    getStyleByIdAsync: async (id: string) => styles.get(id) ?? null,
    createPaintStyle: () => {
      const style: Record<string, unknown> = {
        id: `S:${(seq += 1)}`,
        type: 'PAINT',
        name: '',
        description: '',
        paints: [],
        remove: vi.fn<() => void>(() => styles.delete(style.id as string)),
      };
      styles.set(style.id as string, style);
      return style;
    },
    variables: {
      getVariableByIdAsync: async (id: string) => variables.get(id) ?? null,
      getVariableCollectionByIdAsync: async (id: string) => collections.get(id) ?? null,
    },
  } as unknown as typeof figma;
  return { figmaCtx, store, styles, variables, collections, pages };
};

export const failingFrame = (store: Map<string, Record<string, unknown>>): void => {
  store.set('F', { id: 'F', fills: [] });
};
