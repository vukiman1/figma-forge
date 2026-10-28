import type { GetMetadataResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetMetadataHandler } from '../../../src/features/files/get-metadata.handler.js';

const fakeFigma = (input: {
  fileName: string;
  currentPageId: string;
  pages: { id: string; name: string }[];
  editorType?: string;
  mode?: string;
}): typeof figma =>
  ({
    root: {
      name: input.fileName,
      children: input.pages,
    },
    currentPage: input.pages.find(p => p.id === input.currentPageId),
    editorType: input.editorType ?? 'figma',
    mode: input.mode,
  }) as unknown as typeof figma;

const pages = [
  { id: 'p-1', name: 'Cover' },
  { id: 'p-2', name: 'Details' },
];

describe('get_metadata handler', () => {
  it('returns fileName + pages + currentPage', async () => {
    const handler = createGetMetadataHandler(
      fakeFigma({ fileName: 'My Mockups', currentPageId: 'p-2', pages, mode: 'default' }),
    );

    const result = (await handler(undefined)) as GetMetadataResult;

    expect(result).toEqual({
      fileName: 'My Mockups',
      currentPage: { id: 'p-2', name: 'Details' },
      pages,
      editorType: 'figma',
      mode: 'default',
    });
  });

  it('reports the editor the file is open in, so an agent can plan around what Dev Mode and FigJam refuse', async () => {
    const handler = createGetMetadataHandler(
      fakeFigma({
        fileName: 'Handoff',
        currentPageId: 'p-1',
        pages,
        editorType: 'dev',
        mode: 'inspect',
      }),
    );

    const result = (await handler(undefined)) as GetMetadataResult;

    expect(result).toMatchObject({ editorType: 'dev', mode: 'inspect' });
  });

  it('falls back to default when the runtime reports no mode', async () => {
    const handler = createGetMetadataHandler(
      fakeFigma({ fileName: 'Old Client', currentPageId: 'p-1', pages }),
    );

    const result = (await handler(undefined)) as GetMetadataResult;

    expect(result.mode).toBe('default');
  });

  it('reports the document colour profile, since a Display P3 file reads every colour as P3 channels', async () => {
    const figmaCtx = fakeFigma({ fileName: 'Wide', currentPageId: 'p-1', pages });
    (figmaCtx.root as { documentColorProfile?: string }).documentColorProfile = 'DISPLAY_P3';
    const result = (await createGetMetadataHandler(figmaCtx)(undefined)) as GetMetadataResult;
    expect(result.colorProfile).toBe('DISPLAY_P3');
  });

  it('leaves the colour profile out where the editor reports none', async () => {
    const result = (await createGetMetadataHandler(
      fakeFigma({ fileName: 'Old', currentPageId: 'p-1', pages }),
    )(undefined)) as GetMetadataResult;
    expect(result).not.toHaveProperty('colorProfile');
  });
});
