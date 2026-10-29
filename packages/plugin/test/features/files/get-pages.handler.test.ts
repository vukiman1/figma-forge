import type { GetPagesResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetPagesHandler } from '../../../src/features/files/get-pages.handler.js';

interface FakePage {
  id: string;
  name: string;
  flowStartingPoints: readonly { nodeId: string; name: string }[];
}

const fakeFigma = (pages: FakePage[]): typeof figma =>
  ({
    root: { children: pages },
  }) as unknown as typeof figma;

describe('get_pages handler', () => {
  it('returns each page with its flows, in order', async () => {
    const handler = createGetPagesHandler(
      fakeFigma([
        { id: 'p-1', name: 'Cover', flowStartingPoints: [] },
        {
          id: 'p-2',
          name: 'Details',
          flowStartingPoints: [
            { nodeId: '2:9', name: 'Checkout' },
            { nodeId: '2:1', name: 'Checkout' },
          ],
        },
      ]),
    );
    const result = (await handler(undefined)) as GetPagesResult;
    expect(result).toEqual({
      pages: [
        { id: 'p-1', name: 'Cover', flows: [] },
        {
          id: 'p-2',
          name: 'Details',
          flows: [
            { nodeId: '2:9', name: 'Checkout' },
            { nodeId: '2:1', name: 'Checkout' },
          ],
        },
      ],
    });
  });

  it('copies only nodeId and name from each flow, keeping the rest of Figma’s objects off the wire', async () => {
    const flow = { nodeId: '1:1', name: 'Sign up', internal: true };
    const handler = createGetPagesHandler(
      fakeFigma([{ id: 'p-1', name: 'Cover', flowStartingPoints: [flow] }]),
    );
    const result = (await handler(undefined)) as GetPagesResult;
    expect(result.pages[0]!.flows).toEqual([{ nodeId: '1:1', name: 'Sign up' }]);
  });

  it('reads flows without loading a page, whose children throw while it is unloaded', async () => {
    const unloaded = {
      id: 'p-1',
      name: 'Cover',
      flowStartingPoints: [{ nodeId: '1:1', name: 'Onboarding' }],
      get children(): never {
        throw new Error('The page is not loaded');
      },
    };
    const result = (await createGetPagesHandler(fakeFigma([unloaded]))(
      undefined,
    )) as GetPagesResult;
    expect(result.pages[0]!.flows).toEqual([{ nodeId: '1:1', name: 'Onboarding' }]);
  });

  it('returns empty when no pages', async () => {
    const handler = createGetPagesHandler(fakeFigma([]));
    const result = (await handler(undefined)) as GetPagesResult;
    expect(result.pages).toEqual([]);
  });
});
