import {
  CLIENT_MESSAGE_LIMIT_BYTES,
  type GetScreenshotResult,
  type ScreenshotImage,
} from '@figma-forge/core';

export type ScreenshotContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string };

interface ContentState {
  blocks: ScreenshotContent[];
  deferred: string[];
  oversized: string[];
  spent: number;
}

const RASTER_MIME: Partial<Record<string, string>> = { PNG: 'image/png', JPG: 'image/jpeg' };

export const INLINE_IMAGE_BUDGET_BYTES = CLIENT_MESSAGE_LIMIT_BYTES - 512 * 1024;

const blockBytes = (block: ScreenshotContent): number =>
  Buffer.byteLength(JSON.stringify(block), 'utf8');

const statusNote = (image: ScreenshotImage): string => {
  if (image.empty) return ' — ⚠ empty (node renders nothing even unclipped: hidden / no content)';
  if (image.recovered) return ' — ↺ recovered (clipped/off-canvas; rendered at intrinsic bounds)';
  return '';
};

const dimensions = (image: ScreenshotImage): string =>
  image.width === undefined || image.height === undefined
    ? ''
    : ` ${image.width}×${image.height}px${image.scale === undefined ? '' : ` @${image.scale}x`}`;

const createPayload = (image: ScreenshotImage, mimeType: string | undefined): ScreenshotContent =>
  mimeType === undefined
    ? {
        type: 'text',
        text: `${image.nodeId} (${image.format})${statusNote(image)}:\n${Buffer.from(image.base64 ?? '', 'base64').toString('utf8')}`,
      }
    : { type: 'image', data: image.base64 ?? '', mimeType };

const appendImage = (state: ContentState, image: ScreenshotImage, budgetBytes: number): void => {
  if (image.base64 === null) {
    state.blocks.push({ type: 'text', text: `${image.nodeId}: not exportable` });
    return;
  }
  const mimeType = RASTER_MIME[image.format];
  const payload = createPayload(image, mimeType);
  const size = blockBytes(payload);
  if (state.spent + size > budgetBytes) {
    (size > budgetBytes ? state.oversized : state.deferred).push(image.nodeId);
    state.blocks.push({
      type: 'text',
      text:
        `${image.nodeId} (${image.format}${dimensions(image)})${statusNote(image)}` +
        ' — not inlined, see note below',
    });
    return;
  }
  state.spent += size;
  if (mimeType !== undefined) {
    state.blocks.push({
      type: 'text',
      text: `${image.nodeId} (${image.format}${dimensions(image)})${statusNote(image)}`,
    });
  }
  state.blocks.push(payload);
};

const createRemedies = (state: ContentState): string[] =>
  [
    state.deferred.length === 0
      ? ''
      : `Re-request ${state.deferred.join(', ')} in a follow-up call with fewer ids, or repeat the ` +
        'whole call with a smaller `scale` to fit every node in one response at lower detail.',
    state.oversized.length === 0
      ? ''
      : `${state.oversized.join(', ')} exceeded the whole budget alone, so splitting the call will ` +
        'not help — re-request with a smaller `scale`, or use `save_screenshots` to write the ' +
        'full-resolution file to disk and read it from there.',
  ].filter(remedy => remedy.length > 0);

const appendBudgetNote = (state: ContentState, exported: number): void => {
  const missed = state.deferred.length + state.oversized.length;
  if (missed === 0) return;
  state.blocks.push({
    type: 'text',
    text:
      `⚠ ${missed} of ${exported} export(s) were not inlined. Sending them would have exceeded ` +
      'what an MCP client can read in one response and closed the connection. ' +
      createRemedies(state).join(' '),
  });
};

export const screenshotContent = (
  result: GetScreenshotResult,
  budgetBytes = INLINE_IMAGE_BUDGET_BYTES,
): ScreenshotContent[] => {
  const state: ContentState = { blocks: [], deferred: [], oversized: [], spent: 0 };
  for (const image of result.images) appendImage(state, image, budgetBytes);
  appendBudgetNote(state, result.images.filter(image => image.base64 !== null).length);
  if (state.blocks.length === 0) state.blocks.push({ type: 'text', text: 'No nodes exported.' });
  return state.blocks;
};
