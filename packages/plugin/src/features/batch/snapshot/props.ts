import { type PaintField, writePaints } from '../../paint/write-paints.js';
import { type BindingSnapshot, captureBindings, rebind, unbindAdded } from './bindings.js';
import { captureStyleLinks, restoreStyleLinks, type StyleLinkSnapshot } from './style-links.js';
import { hasPattern, pickFields, readField, same, writeIfDifferent } from './values.js';

export interface PropsSnapshot {
  readonly values: Record<string, unknown>;
  readonly styles: StyleLinkSnapshot;
  readonly bindings: BindingSnapshot;
}

export const captureProps = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  props: readonly string[],
  bindingFields: readonly string[] = props,
): Promise<PropsSnapshot> => ({
  values: pickFields(node, props),
  styles: captureStyleLinks(node, props),
  bindings: await captureBindings(figmaCtx, node, bindingFields),
});

const isPaintList = (value: unknown): value is Paint[] => Array.isArray(value);

const isPaintField = (prop: string): prop is PaintField => prop === 'fills' || prop === 'strokes';

const restoreValue = async (node: BaseNode, prop: string, value: unknown): Promise<void> => {
  if (isPaintField(prop) && isPaintList(value) && hasPattern(value)) {
    if (!same(readField(node, prop), value)) await writePaints(node, prop, value);
    return;
  }
  writeIfDifferent(node, prop, value);
};

export const restoreProps = async (node: BaseNode, snapshot: PropsSnapshot): Promise<void> => {
  unbindAdded(node, snapshot.bindings);
  for (const [prop, value] of Object.entries(snapshot.values)) {
    // oxlint-disable-next-line no-await-in-loop -- props replay in snapshot order
    await restoreValue(node, prop, value);
  }
  await restoreStyleLinks(node, snapshot.styles);
  rebind(node, snapshot.bindings);
};
