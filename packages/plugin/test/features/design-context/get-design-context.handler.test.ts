import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context handler', () => {
  it.each([
    ['DISPLAY_P3', true],
    ['SRGB', false],
    ['LEGACY', false],
    [undefined, false],
  ] as const)('marks a %s document as P3: %s', async (profile, marked) => {
    const figmaCtx = fakeFigma({ selection: [node({ id: 'r' })] });
    if (profile !== undefined) {
      (figmaCtx as unknown as { root: object }).root = { documentColorProfile: profile };
    }
    for (const detail of ['full', 'compact'] as const) {
      const result = (await createGetDesignContextHandler(figmaCtx)({ detail })) as Record<
        string,
        unknown
      >;
      expect(result.colorProfile).toBe(marked ? 'DISPLAY_P3' : undefined);
      expect('colorProfile' in result).toBe(marked);
      expect(Object.keys(result)[0]).toBe(marked ? 'colorProfile' : 'nodes');
    }
  });

  it('limits depth and flags truncated nodes', async () => {
    const grandchild = node({ id: 'gc', type: 'RECTANGLE' });
    const child = node({ id: 'c', children: [grandchild] });
    const root = node({ id: 'r', children: [child] });
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [root] }));

    const result = (await handler({ depth: 1, detail: 'minimal' })) as GetDesignContextResult;
    const r = result.nodes[0];
    expect(r?.id).toBe('r');
    expect(r?.children?.[0]?.id).toBe('c');
    expect(r?.children?.[0]?.truncated).toBe(true);
    expect(r?.children?.[0]?.children).toBeUndefined();
  });

  it('projects fields by detail level', async () => {
    const text = node({
      id: 't',
      type: 'TEXT',
      characters: 'Hi',
      fontSize: 16,
      fontName: { family: 'Inter', style: 'Bold' },
      opacity: 0.5,
    });
    const min = (await createGetDesignContextHandler(fakeFigma({ selection: [text] }))({
      detail: 'minimal',
    })) as GetDesignContextResult;
    expect(min.nodes[0]).toEqual({ id: 't', name: 'x', type: 'TEXT' });

    const compact = (await createGetDesignContextHandler(fakeFigma({ selection: [text] }))({
      detail: 'compact',
    })) as GetDesignContextResult;
    expect(compact.nodes[0]).toMatchObject({ id: 't', x: 0, y: 0, width: 10, height: 10 });
    expect(compact.nodes[0]?.visible).toBeUndefined();
    expect(compact.nodes[0]?.characters).toBeUndefined();

    const full = (await createGetDesignContextHandler(fakeFigma({ selection: [text] }))({
      detail: 'full',
    })) as GetDesignContextResult;
    expect(full.nodes[0]).toMatchObject({ characters: 'Hi', opacity: 0.5 });
    expect(full.nodes[0]?.fontSize).toBeUndefined();
    expect(full.nodes[0]?.fontName).toBeUndefined();
    const textRef = full.nodes[0]?.textStyle;
    expect(textRef).toMatch(/^text_/);
    expect(full.globalVars?.styles[textRef!]).toEqual({
      fontFamily: 'Inter',
      fontStyle: 'Bold',
      fontSize: 16,
    });
  });

  it('uses the selection, and throws when nothing is selected', async () => {
    const sel = node({ id: 'sel' });
    const pageNode = node({ id: 'page' });
    const withSel = (await createGetDesignContextHandler(
      fakeFigma({ selection: [sel], pageChildren: [pageNode] }),
    )({})) as GetDesignContextResult;
    expect(withSel.nodes.map(n => n.id)).toEqual(['sel']);

    await expect(
      createGetDesignContextHandler(fakeFigma({ selection: [], pageChildren: [pageNode] }))({}),
    ).rejects.toThrow(/Nothing selected/);
  });

  it('resolves a nodeId root, and refuses a miss / non-scene node instead of returning empty', async () => {
    const target = node({ id: '1:2' });
    const page = { id: '0:1', name: 'Page 1', type: 'PAGE' } as unknown as BaseNode;
    const handler = createGetDesignContextHandler(
      fakeFigma({ lookup: { '1:2': target, '0:1': page } }),
    );
    expect(((await handler({ nodeId: '1:2' })) as GetDesignContextResult).nodes[0]?.id).toBe('1:2');
    await expect(handler({ nodeId: 'nope' })).rejects.toThrow(/"nope" not found/);
    await expect(handler({ nodeId: '0:1' })).rejects.toThrow(/is a PAGE/);
  });

  it('throws on invalid depth / detail / nodeId / dedupeComponents', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({}));
    await expect(handler({ depth: -1 })).rejects.toThrow(/depth/);
    await expect(handler({ detail: 'huge' })).rejects.toThrow(/detail/);
    await expect(handler({ nodeId: 5 })).rejects.toThrow(/nodeId/);
    await expect(handler({ dedupeComponents: 'yes' })).rejects.toThrow(/dedupeComponents/);
  });
});
