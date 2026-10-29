import type { FlowStartingPoint } from '@figma-forge/core';

import { errorMessage } from '../error-message.js';
import { readFlows, sameFlows } from '../prototype/flows.js';

export type FlowsSnapshot = ReadonlyMap<string, readonly FlowStartingPoint[]>;

export const captureFlows = (figmaCtx: typeof figma): FlowsSnapshot =>
  new Map(figmaCtx.root.children.map(page => [page.id, readFlows(page)]));

const restorePageFlows = (page: PageNode, was: readonly FlowStartingPoint[]): string | null => {
  try {
    page.flowStartingPoints = was;
  } catch (error) {
    return `page ${page.id} flows not restored: ${errorMessage(error)}`;
  }
  const landed = readFlows(page);
  return sameFlows(landed, was)
    ? null
    : `page ${page.id} flows read back as ${JSON.stringify(landed)}`;
};

export const restoreFlows = (figmaCtx: typeof figma, before: FlowsSnapshot): string[] =>
  figmaCtx.root.children.flatMap(page => {
    const was = before.get(page.id);
    if (was === undefined || sameFlows(readFlows(page), was)) return [];
    const note = restorePageFlows(page, was);
    return note === null ? [] : [note];
  });
