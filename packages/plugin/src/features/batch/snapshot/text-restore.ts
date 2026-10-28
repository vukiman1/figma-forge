import type { TextLike } from '../../text/text-like.js';
import { rebind, unbindAdded } from './bindings.js';
import { fontsOf, loadFonts, nodeBoundText, type TextSnapshot } from './text-capture.js';
import { TEXT_NODE_PROPS } from './text-fields.js';
import { replayRuns, restorePatternFills, restoreRunLinks } from './text-runs.js';
import { same, writeIfDifferent } from './values.js';

const HUGGING_TEXT = 'WIDTH_AND_HEIGHT';

const perCharFeatures = (
  segments: readonly { start: number; end: number; openTypeFeatures?: unknown }[],
): string[] =>
  segments.flatMap(segment =>
    Array.from({ length: segment.end - segment.start }, () =>
      JSON.stringify(segment.openTypeFeatures),
    ),
  );

const restoreCharacters = async (
  figmaCtx: typeof figma,
  text: TextLike,
  snapshot: TextSnapshot,
): Promise<void> => {
  await loadFonts(figmaCtx, fontsOf(figmaCtx, text));
  unbindAdded(text, snapshot.characters_binding);
  if (text.characters !== snapshot.characters) text.characters = snapshot.characters;
  if (snapshot.segments.length > 0) return;
  for (const [key, value] of Object.entries(snapshot.empty)) writeIfDifferent(text, key, value);
};

interface TextBinder {
  setBoundVariable(field: VariableBindableTextField, variable: Variable | null): void;
}

const dropStaleNodeBindings = (text: TextLike, snapshot: TextSnapshot): void => {
  const binder: TextBinder = text;
  const stale = nodeBoundText(text).filter(field => !snapshot.nodeBound.includes(field));
  for (const field of stale) binder.setBoundVariable(field, null);
};

const restoreBox = (text: TextLike, snapshot: TextSnapshot): void => {
  const resized = text.width !== snapshot.width || text.height !== snapshot.height;
  if (snapshot.node.textAutoResize !== HUGGING_TEXT && resized) {
    text.resizeWithoutConstraints(snapshot.width, snapshot.height);
  }
  for (const key of TEXT_NODE_PROPS) writeIfDifferent(text, key, snapshot.node[key]);
};

const featureDriftNote = (text: TextLike, snapshot: TextSnapshot): string | undefined => {
  if (snapshot.segments.length === 0) return undefined;
  const current = text.getStyledTextSegments(['openTypeFeatures']);
  return same(perCharFeatures(current), perCharFeatures(snapshot.segments))
    ? undefined
    : `text ${text.id} keeps changed OpenType features (Figma exposes no setter to restore them)`;
};

export const restoreText = async (
  figmaCtx: typeof figma,
  text: TextLike,
  snapshot: TextSnapshot,
): Promise<string | undefined> => {
  await restoreCharacters(figmaCtx, text, snapshot);
  const patternNote = await restorePatternFills(text, snapshot.segments);
  replayRuns(text, snapshot.segments);
  dropStaleNodeBindings(text, snapshot);
  await restoreRunLinks(text, snapshot);
  rebind(text, snapshot.characters_binding);
  restoreBox(text, snapshot);
  return featureDriftNote(text, snapshot) ?? patternNote;
};
