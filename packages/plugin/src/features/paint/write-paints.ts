export type PaintField = 'fills' | 'strokes';

const setterOf = (node: BaseNode, field: PaintField): unknown =>
  Reflect.get(node, field === 'fills' ? 'setFillsAsync' : 'setStrokesAsync');

export const writePaints = async (
  node: BaseNode,
  field: PaintField,
  paints: readonly Paint[],
): Promise<void> => {
  const setter = setterOf(node, field);
  if (paints.some(paint => paint.type === 'PATTERN') && typeof setter === 'function') {
    await Reflect.apply(setter, node, [paints]);
    return;
  }
  Reflect.set(node, field, paints);
};
