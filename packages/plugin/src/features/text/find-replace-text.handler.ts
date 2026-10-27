import {
  type BatchNodeResult,
  FIND_REPLACE_TEXT_TOOL_NAME as TOOL,
  findReplaceTextParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { loadTextFonts } from './fonts.js';
import { replaceRange } from './text-edit.js';
import type { TextLike } from './text-like.js';

export interface FindReplacePlan {
  matches: TextLike[];
  find: string;
  replace: string;
  caseSensitive: boolean;
}

type Searchable = Extract<BaseNode, { findAllWithCriteria: unknown }>;

const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/g;

const escapeRegExp = (text: string): string => text.replace(REGEXP_SPECIALS, '\\$&');

const searchRoot = async (
  figmaCtx: typeof figma,
  rootId: string | undefined,
  where: string,
): Promise<Searchable> => {
  if (rootId === undefined) return figmaCtx.currentPage;
  const node = await figmaCtx.getNodeByIdAsync(rootId);
  if (node === null || !('findAllWithCriteria' in node)) {
    throw new Error(`${where}: root ${rootId} not found or cannot be searched`);
  }
  return node;
};

export const findReplacePlan = async (
  figmaCtx: typeof figma,
  raw: unknown,
  where: string,
): Promise<FindReplacePlan> => {
  const {
    find,
    replace,
    root,
    caseSensitive = false,
  } = parseParams(where, findReplaceTextParams, raw);
  const scope = await searchRoot(figmaCtx, root, where);
  const needle = caseSensitive ? find : find.toLowerCase();
  const matches = scope.findAllWithCriteria({ types: ['TEXT'] }).filter(text => {
    const haystack = caseSensitive ? text.characters : text.characters.toLowerCase();
    return haystack.includes(needle);
  });
  return { matches, find, replace, caseSensitive };
};

const replaceAll = (text: TextLike, pattern: RegExp, replace: string): boolean => {
  const hits = [...text.characters.matchAll(pattern)];
  for (const hit of hits.toReversed())
    replaceRange(text, hit.index, hit.index + hit[0].length, replace);
  return hits.length > 0;
};

export const createFindReplaceTextHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { matches, find, replace, caseSensitive } = await findReplacePlan(figmaCtx, raw, TOOL);
    await Promise.all(matches.map(async text => loadTextFonts(figmaCtx, text)));
    const pattern = new RegExp(escapeRegExp(find), caseSensitive ? 'g' : 'gi');
    const affected = matches
      .filter(text => replaceAll(text, pattern, replace))
      .map(text => text.id);
    const result: BatchNodeResult = { ok: true, affected };
    return result;
  };
