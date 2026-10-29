import type { TextLike } from '../../text/text-like.js';
import { aliasIdOf } from './bindings.js';
import { type Segment, type TextSnapshot } from './text-capture.js';
import {
  NULLABLE_DETAILS,
  RANGE_WRITERS,
  type SegmentField,
  TEXT_BINDABLE_FIELDS,
} from './text-fields.js';
import { hasPattern, readField, same } from './values.js';

const TEXT_BINDABLE: ReadonlySet<string> = new Set(TEXT_BINDABLE_FIELDS);

const isTextBindableField = (field: string): field is VariableBindableTextField =>
  TEXT_BINDABLE.has(field);

const isPaintList = (value: unknown): value is Paint[] => Array.isArray(value);

export const restorePatternFills = async (
  text: TextLike,
  segments: readonly Segment[],
): Promise<string | undefined> => {
  const patterned = segments.filter(segment => hasPattern(segment.fills));
  const first = patterned[0]?.fills;
  if (first === undefined || !isPaintList(first)) return undefined;
  await text.setFillsAsync(first);
  return patterned.some(segment => !same(segment.fills, first))
    ? `text ${text.id} had runs with different pattern fills; only the first was put back`
    : undefined;
};

const alreadyOnPath = (
  text: TextLike,
  segment: Segment,
  field: SegmentField,
  value: unknown,
): boolean => {
  if (text.type !== 'TEXT_PATH') return false;
  const current = text.getStyledTextSegments([field], segment.start, segment.end);
  return current.length === 1 && same(readField(current[0] ?? {}, field), value);
};

const isSkipped = (field: SegmentField, value: unknown): boolean =>
  value === undefined ||
  (value === null && NULLABLE_DETAILS.has(field)) ||
  (field === 'fills' && hasPattern(value));

const replaySegment = (text: TextLike, segment: Segment): void => {
  for (const [field, setterName] of RANGE_WRITERS) {
    const value = segment[field];
    const setter = readField(text, setterName);
    if (isSkipped(field, value) || typeof setter !== 'function') continue;
    if (alreadyOnPath(text, segment, field, value)) continue;
    Reflect.apply(setter, text, [segment.start, segment.end, value]);
  }
};

export const replayRuns = (text: TextLike, segments: readonly Segment[]): void => {
  for (const segment of segments) replaySegment(text, segment);
};

const stringField = (segment: Segment, field: string): string => {
  const value = segment[field];
  return typeof value === 'string' ? value : '';
};

const restoreRunStyles = async (text: TextLike, segment: Segment): Promise<void> => {
  const { start, end } = segment;
  const textStyleId = stringField(segment, 'textStyleId');
  if (text.getRangeTextStyleId(start, end) !== textStyleId) {
    await text.setRangeTextStyleIdAsync(start, end, textStyleId);
  }
  const fillStyleId = stringField(segment, 'fillStyleId');
  if (text.getRangeFillStyleId(start, end) !== fillStyleId) {
    await text.setRangeFillStyleIdAsync(start, end, fillStyleId);
  }
};

const restoreRunBindings = (text: TextLike, segment: Segment, snapshot: TextSnapshot): void => {
  const bound = segment.boundVariables;
  if (typeof bound !== 'object' || bound === null) return;
  for (const [field, alias] of Object.entries(bound)) {
    const id = aliasIdOf(alias);
    if (id === null) continue;
    const variable = snapshot.variables[id];
    if (variable === undefined)
      throw new Error(`variable ${id} bound to ${field} was not captured`);
    if (!isTextBindableField(field)) throw new Error(`run binding ${field} has no text setter`);
    text.setRangeBoundVariable(segment.start, segment.end, field, variable);
  }
};

export const restoreRunLinks = async (text: TextLike, snapshot: TextSnapshot): Promise<void> => {
  for (const segment of snapshot.segments) {
    // oxlint-disable-next-line no-await-in-loop -- the async style setters run in run order
    await restoreRunStyles(text, segment);
    restoreRunBindings(text, segment, snapshot);
  }
};
