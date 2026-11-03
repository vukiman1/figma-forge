import {
  DESIGN_CONTEXT_TOKEN_BUDGET,
  estimateResultTokens,
  type DesignContextNode,
  type GetDesignContextResult,
} from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import {
  handleDesignContext,
  sectionPlanFromPayload,
  type ToolDispatcher,
} from '../../../src/tools/read/design-context-guard.js';

const leaf = (id: string, extra: Record<string, unknown> = {}): DesignContextNode => ({
  id,
  name: `n-${id}`,
  type: 'RECTANGLE',
  ...extra,
});

const dispatcher = (
  payload: GetDesignContextResult,
): { dispatch: ToolDispatcher; seen: unknown[] } => {
  const seen: unknown[] = [];
  return {
    dispatch: async (_tool, args) => {
      seen.push(args);
      return payload;
    },
    seen,
  };
};

const oversizedFull = (): GetDesignContextResult => {
  const fat = 'x'.repeat(2000);
  const sections = ['a', 'b'].map((s, i) =>
    leaf(`s${i}`, {
      name: `Section ${s}`,
      type: i === 1 ? 'INSTANCE' : 'FRAME',

      ...(i === 1 ? { mainComponentId: 'c:9', mainComponent: { id: 'c:9', name: 'Card' } } : {}),
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: Array.from({ length: 40 }, (_c, l) =>
        leaf(`s${i}-l${l}`, { fills: fat, x: 1, y: 2, width: 3, height: 4 }),
      ),
    }),
  );
  return {
    nodes: [leaf('root', { name: 'Page', type: 'FRAME', children: sections })],
    globalVars: { styles: { deadbeef: { fills: fat } } },
  };
};

describe('the LAYOUT downgrade tier', () => {
  const oversizedWithLayout = (leaves: number, fatChars: number): GetDesignContextResult => {
    const fat = 'x'.repeat(fatChars);
    const sections = ['a', 'b'].map((s, i) =>
      leaf(`s${i}`, {
        name: `Section ${s}`,
        type: 'FRAME',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        layout: {
          mode: 'VERTICAL',
          paddingTop: 16,
          paddingRight: 16,
          paddingBottom: 16,
          paddingLeft: 16,
          itemSpacing: 24,
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'CENTER',
        },
        children: Array.from({ length: leaves }, (_c, l) =>
          leaf(`s${i}-l${l}`, {
            x: 1,
            y: 2,
            width: 3,
            height: 4,

            layoutSizingHorizontal: 'FILL',
            layoutGrow: 1,
            constraints: { horizontal: 'STRETCH', vertical: 'MIN' },
            characters: `label ${l}`,
            componentProperties: { State: { type: 'VARIANT', value: 'default' } },

            fills: fat,
            effects: fat,
            boundVariables: { itemSpacing: ['VariableID:1:1'] },
          }),
        ),
      }),
    );
    return {
      nodes: [leaf('root', { name: 'Page', type: 'FRAME', children: sections })],
      globalVars: { styles: { deadbeef: { fills: fat } } },
    };
  };

  it('keeps the whole layout system when full is over budget but the layout tier fits', async () => {
    const payload = oversizedWithLayout(40, 2000);
    expect(estimateResultTokens(JSON.stringify(payload))).toBeGreaterThan(
      DESIGN_CONTEXT_TOKEN_BUDGET,
    );

    const { dispatch } = dispatcher(payload);
    const r = await handleDesignContext(dispatch, {});

    expect(r.sectionPlan).toBeUndefined();
    expect(estimateResultTokens(JSON.stringify(r))).toBeLessThanOrEqual(
      DESIGN_CONTEXT_TOKEN_BUDGET,
    );

    const section = r.nodes[0]?.children?.[0];
    expect(section?.layout).toEqual(payload.nodes[0]?.children?.[0]?.layout);

    const child = section?.children?.[0];
    expect(child).toMatchObject({
      id: 's0-l0',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      layoutSizingHorizontal: 'FILL',
      layoutGrow: 1,
      constraints: { horizontal: 'STRETCH', vertical: 'MIN' },
      characters: 'label 0',
      componentProperties: { State: { type: 'VARIANT', value: 'default' } },
    });

    expect(child?.fills).toBeUndefined();
    expect(child?.effects).toBeUndefined();
    expect(child?.boundVariables).toBeUndefined();
    expect(r.globalVars).toBeUndefined();

    expect(r.note).toMatch(/LAYOUT intact/);
    expect(r.note).toMatch(/never from x\/y/);
  });

  it('falls through to geometry-only on an unsplittable tree whose layout will not fit', async () => {
    const bigLayout = { mode: 'VERTICAL', filler: 'x'.repeat(200) };
    const payload: GetDesignContextResult = {
      nodes: [
        leaf('root', {
          children: [
            leaf('only', {
              children: [
                leaf('single', {
                  children: Array.from({ length: 400 }, (_c, l) =>
                    leaf(`l${l}`, { x: 1, y: 2, width: 3, height: 4, layout: bigLayout }),
                  ),
                }),
              ],
            }),
          ],
        }),
      ],
    };
    const { dispatch } = dispatcher(payload);
    const r = await handleDesignContext(dispatch, {});

    expect(r.sectionPlan).toBeUndefined();
    const first = r.nodes[0]?.children?.[0]?.children?.[0]?.children?.[0];
    expect(first).toEqual({
      id: 'l0',
      name: 'n-l0',
      type: 'RECTANGLE',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    });
    expect(r.note).toMatch(/too large even with layout alone/);
  });

  it('keeps the breakpoint hint on a layout downgrade', async () => {
    const payload = { ...oversizedWithLayout(40, 2000), hint: 'breakpoints: ground each frame' };
    const { dispatch } = dispatcher(payload);
    const r = await handleDesignContext(dispatch, {});
    expect(r.hint).toBe('breakpoints: ground each frame');
  });
});

describe('every degraded shape leads with its note', () => {
  const firstKey = (r: GetDesignContextResult): string => Object.keys(r)[0] as string;

  it('leads with the note on a layout downgrade', async () => {
    const payload = (() => {
      const fat = 'x'.repeat(2000);
      return {
        nodes: [
          leaf('root', {
            name: 'Page',
            type: 'FRAME',
            children: Array.from({ length: 60 }, (_c, l) =>
              leaf(`l${l}`, {
                x: 1,
                y: 2,
                width: 3,
                height: 4,
                layout: { mode: 'VERTICAL' },
                fills: fat,
              }),
            ),
          }),
        ],
      } satisfies GetDesignContextResult;
    })();
    const { dispatch } = dispatcher(payload);
    const r = await handleDesignContext(dispatch, {});
    expect(firstKey(r)).toBe('note');
  });

  it('leads with the note on a compact downgrade', async () => {
    const { dispatch } = dispatcher(oversizedFull());
    const r = await handleDesignContext(dispatch, {});
    expect(firstKey(r)).toBe('note');
  });

  it('leads with the note on a section plan', () => {
    const plan = sectionPlanFromPayload(
      { nodes: [leaf('root', { children: [leaf('a'), leaf('b')] })] },
      200_000,
    );
    expect(plan).not.toBeNull();
    expect(firstKey(plan as GetDesignContextResult)).toBe('note');
  });

  it('leads with the note on an explicit below-full result', async () => {
    const { dispatch } = dispatcher({ nodes: [leaf('1:1')] });
    const r = await handleDesignContext(dispatch, { detail: 'compact' });
    expect(firstKey(r)).toBe('note');
  });
});

describe('the layout rung sheds content before it sheds layout', () => {
  it('drops text/props rather than collapsing to geometry on an unsplittable tree', async () => {
    const layout = {
      mode: 'VERTICAL',
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      itemSpacing: 24,
    };
    const payload: GetDesignContextResult = {
      nodes: [
        leaf('root', {
          children: [
            leaf('only', {
              children: [
                leaf('single', {
                  layout,
                  children: Array.from({ length: 180 }, (_c, l) =>
                    leaf(`l${l}`, {
                      x: 1,
                      y: 2,
                      width: 3,
                      height: 4,
                      layout,
                      layoutSizingHorizontal: 'FILL',
                      characters: 'y'.repeat(90),
                      fills: 'x'.repeat(400),
                    }),
                  ),
                }),
              ],
            }),
          ],
        }),
      ],
    };
    const { dispatch } = dispatcher(payload);
    const r = await handleDesignContext(dispatch, {});

    const child = r.nodes[0]?.children?.[0]?.children?.[0]?.children?.[0];

    expect(child?.layout).toEqual(layout);
    expect(child?.layoutSizingHorizontal).toBe('FILL');

    expect(child?.characters).toBeUndefined();
    expect(child?.fills).toBeUndefined();
    expect(r.note).toMatch(/missing is text content/);
    expect(estimateResultTokens(JSON.stringify(r))).toBeLessThanOrEqual(
      DESIGN_CONTEXT_TOKEN_BUDGET,
    );
  });
});
