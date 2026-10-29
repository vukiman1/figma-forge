import { describe, expect, it, vi } from 'vitest';

import type { TextSnapshot } from '../../../../src/features/batch/snapshot/text-capture.js';
import { restoreText } from '../../../../src/features/batch/snapshot/text-restore.js';

describe('restoreText on text set along a path', () => {
  const run = {
    start: 0,
    end: 5,
    fontName: { family: 'Inter', style: 'Regular' },
    hyperlink: null,
  };
  const fake = (type: 'TEXT' | 'TEXT_PATH') => {
    const setRangeHyperlink = vi.fn<(...args: unknown[]) => void>();
    const setRangeFontName = vi.fn<(...args: unknown[]) => void>();
    const node = {
      id: 'P',
      type,
      characters: 'Round',
      fontName: { family: 'Inter', style: 'Regular' },
      width: 100,
      height: 100,
      boundVariables: {},
      getStyledTextSegments: (fields: string[]) => [
        Object.fromEntries([
          ['start', 0],
          ['end', 5],
          ...fields.map(f => [f, f in run ? (run as Record<string, unknown>)[f] : {}]),
        ]),
      ],
      getRangeTextStyleId: () => '',
      getRangeFillStyleId: () => '',
      setRangeHyperlink,
      setRangeFontName,
      resizeWithoutConstraints: vi.fn<(w: number, h: number) => void>(),
    };
    const snapshot: TextSnapshot = {
      characters: 'Round',
      segments: [{ ...run, textStyleId: '', fillStyleId: '' }],
      node: {},
      empty: {},
      width: 100,
      height: 100,
      fonts: [],
      nodeBound: [],
      characters_binding: {},
      variables: {},
    };
    const figmaCtx = {
      mixed: Symbol('mixed'),
      loadFontAsync: async () => {},
    } as unknown as typeof figma;
    return { node, snapshot, figmaCtx, setRangeHyperlink, setRangeFontName };
  };

  it('leaves a path’s runs alone where they already match — a write there becomes an override', async () => {
    const t = fake('TEXT_PATH');
    await restoreText(t.figmaCtx, t.node as unknown as TextPathNode, t.snapshot);
    expect(t.setRangeHyperlink).not.toHaveBeenCalled();
    expect(t.setRangeFontName).not.toHaveBeenCalled();
  });

  it('still writes every run back on TEXT, where that is the restore', async () => {
    const t = fake('TEXT');
    await restoreText(t.figmaCtx, t.node as unknown as TextNode, t.snapshot);
    expect(t.setRangeHyperlink).toHaveBeenCalledWith(0, 5, null);
    expect(t.setRangeFontName).toHaveBeenCalled();
  });
});
