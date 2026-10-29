import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context — breakpoint hint', () => {
  it('attaches a breakpoint hint when the selection spans width buckets — even at compact', async () => {
    const desktop = node({ id: 'd', name: 'W_Home', width: 1440 });
    const mobile = node({ id: 'm', name: 'M_Home', width: 375 });
    const result = (await createGetDesignContextHandler(
      fakeFigma({ selection: [desktop, mobile] }),
    )({ detail: 'compact' })) as GetDesignContextResult;

    expect(result.hint).toMatch(/these are breakpoints/);
    expect(result.hint).toContain('1440 / 375');
    expect(result.hint).toMatch(/each frame/i);
    expect(result.hint).not.toMatch(/pair each screen/);
    expect(result.hint).not.toMatch(/across breakpoints or screens/);
    expect(result.hint).toMatch(/never hardcode a frame's own width/);
    expect(result.hint).toContain('no w-[375px] root');
  });

  it('leads with the pairing rule when multiple screens (more frames than buckets) are selected', async () => {
    const result = (await createGetDesignContextHandler(
      fakeFigma({
        selection: [
          node({ id: 'ad', name: 'W_A', width: 1440 }),
          node({ id: 'am', name: 'M_A', width: 375 }),
          node({ id: 'bd', name: 'W_B', width: 1440 }),
          node({ id: 'bm', name: 'M_B', width: 375 }),
        ],
      }),
    )({})) as GetDesignContextResult;

    expect(result.hint).toContain('4 top-level frames');
    expect(result.hint).toContain('widths 1440 / 375px');
    expect(result.hint).toMatch(/pair each screen to its own breakpoint frames/);
    expect(result.hint).toMatch(/across breakpoints or screens/);
    expect(result.hint).toMatch(/never hardcode a frame's own width/);
  });

  it('does not attach the hint for same-bucket siblings, a single frame, or non-frame roots', async () => {
    const sameBucket = (await createGetDesignContextHandler(
      fakeFigma({ selection: [node({ id: 'a', width: 375 }), node({ id: 'b', width: 390 })] }),
    )({})) as GetDesignContextResult;
    expect(sameBucket.hint).toBeUndefined();

    const single = (await createGetDesignContextHandler(
      fakeFigma({ selection: [node({ id: 's', width: 1440 })] }),
    )({})) as GetDesignContextResult;
    expect(single.hint).toBeUndefined();

    const mixedTypes = (await createGetDesignContextHandler(
      fakeFigma({
        selection: [node({ id: 'f', width: 1440 }), node({ id: 'r', type: 'RECTANGLE' })],
      }),
    )({})) as GetDesignContextResult;
    expect(mixedTypes.hint).toBeUndefined();
  });
});
