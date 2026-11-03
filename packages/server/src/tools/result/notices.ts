import { AsyncLocalStorage } from 'node:async_hooks';

import type { CallToolResult } from '@modelcontextprotocol/server';

export interface NoticeBox {
  skew: string | null;
  routing: string | null;
}

const store = new AsyncLocalStorage<NoticeBox>();

const asSkewBlock = (notice: string): string => `\n\n⚠️ FIGMA_FORGE PLUGIN OUT OF DATE\n${notice}`;

const asRoutingBlock = (notice: string): string =>
  `\n\n⚠️ MORE THAN ONE FIGMA FILE IS OPEN\n${notice}`;

const noticeSuffix = (box: NoticeBox): string =>
  (box.routing === null ? '' : asRoutingBlock(box.routing)) +
  (box.skew === null ? '' : asSkewBlock(box.skew));

export const captureNotices = async (
  run: () => Promise<CallToolResult>,
  finish: (result: CallToolResult, notices: NoticeBox) => CallToolResult,
): Promise<CallToolResult> => {
  const box: NoticeBox = { skew: null, routing: null };
  try {
    return finish(await store.run(box, run), box);
  } catch (error: unknown) {
    const suffix = noticeSuffix(box);
    if (suffix.length === 0) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}${suffix}`, { cause: error });
  }
};

export const reportSkew = (notice: string | null): void => {
  const box = store.getStore();
  if (box !== undefined && notice !== null) box.skew = notice;
};

export const reportRouting = (notice: string | null): void => {
  const box = store.getStore();
  if (box !== undefined && notice !== null) box.routing = notice;
};

export const withRoutingNotice = (result: CallToolResult, notice: string | null): CallToolResult =>
  notice === null
    ? result
    : {
        ...result,
        content: [...result.content, { type: 'text' as const, text: asRoutingBlock(notice) }],
      };

export const withSkewNotice = (result: CallToolResult, notice: string | null): CallToolResult =>
  notice === null
    ? result
    : {
        ...result,
        content: [...result.content, { type: 'text' as const, text: asSkewBlock(notice) }],
      };
