import type { TextLike } from '../../text/text-like.js';
import { aliasIdOf, type BindingSnapshot, captureBindings, resolveVariable } from './bindings.js';
import {
  EMPTY_TEXT_PROPS,
  SEGMENT_FIELDS,
  TEXT_BINDABLE_FIELDS,
  TEXT_NODE_PROPS,
} from './text-fields.js';
import { pickFields, readField } from './values.js';

export type Segment = Record<string, unknown> & { readonly start: number; readonly end: number };

export interface TextSnapshot {
  readonly characters: string;
  readonly segments: readonly Segment[];
  readonly node: Record<string, unknown>;
  readonly empty: Record<string, unknown>;
  readonly width: number;
  readonly height: number;
  readonly fonts: readonly FontName[];
  readonly nodeBound: readonly string[];
  readonly characters_binding: BindingSnapshot;
  readonly variables: Readonly<Record<string, Variable>>;
}

const FONT_KEY_SEPARATOR = '\u0000';

export const nodeBoundText = (text: TextLike): VariableBindableTextField[] => {
  const bound = readField(text, 'boundVariables');
  if (typeof bound !== 'object' || bound === null) return [];
  return TEXT_BINDABLE_FIELDS.filter(field => readField(bound, field) !== undefined);
};

export const fontsOf = (figmaCtx: typeof figma, text: TextLike): FontName[] => {
  if (text.fontName !== figmaCtx.mixed) return [text.fontName];
  return text.characters.length > 0
    ? [...text.getRangeAllFontNames(0, text.characters.length)]
    : [];
};

export const loadFonts = async (
  figmaCtx: typeof figma,
  fonts: readonly FontName[],
): Promise<void> => {
  const unique = new Map(
    fonts.map(font => [`${font.family}${FONT_KEY_SEPARATOR}${font.style}`, font]),
  );
  await Promise.all([...unique.values()].map(async font => figmaCtx.loadFontAsync(font)));
};

const segmentsOf = (text: TextLike): Segment[] =>
  text.characters.length > 0 ? text.getStyledTextSegments([...SEGMENT_FIELDS]) : [];

export const runVariableIds = (segment: Segment): string[] => {
  const bound = segment.boundVariables;
  if (typeof bound !== 'object' || bound === null) return [];
  return Object.values(bound).flatMap((alias: unknown) => aliasIdOf(alias) ?? []);
};

export const captureText = async (
  figmaCtx: typeof figma,
  text: TextLike,
): Promise<TextSnapshot> => {
  const segments = segmentsOf(text);
  const ids = [...new Set(segments.flatMap(runVariableIds))];
  const fonts = fontsOf(figmaCtx, text);
  const [resolved, bindings] = await Promise.all([
    Promise.all(ids.map(async id => resolveVariable(figmaCtx, id))),
    captureBindings(figmaCtx, text, ['characters']),
    loadFonts(figmaCtx, fonts),
  ]);
  return {
    characters: text.characters,
    segments,
    node: pickFields(text, TEXT_NODE_PROPS),
    empty: text.characters.length === 0 ? pickFields(text, EMPTY_TEXT_PROPS) : {},
    width: text.width,
    height: text.height,
    fonts,
    nodeBound: nodeBoundText(text),
    characters_binding: bindings,
    variables: Object.fromEntries(resolved.map(variable => [variable.id, variable])),
  };
};
