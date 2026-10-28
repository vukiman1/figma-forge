import { readField } from './values.js';

export const NODE_BINDABLE_FIELDS = [
  'height',
  'width',
  'characters',
  'itemSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'visible',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'counterAxisSpacing',
  'strokeWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
  'opacity',
  'gridRowGap',
  'gridColumnGap',
] as const satisfies readonly VariableBindableNodeField[];

const NODE_BINDABLE: ReadonlySet<string> = new Set(NODE_BINDABLE_FIELDS);

export type BindingSnapshot = Partial<Record<VariableBindableNodeField, Variable | null>>;

type BindableNode = BaseNode & {
  setBoundVariable: (field: VariableBindableNodeField, variable: Variable | null) => void;
};

const isNodeBindable = (field: string): field is VariableBindableNodeField =>
  NODE_BINDABLE.has(field);

const isBindableNode = (node: BaseNode): node is BindableNode => 'setBoundVariable' in node;

export const resolveVariable = async (figmaCtx: typeof figma, id: string): Promise<Variable> => {
  const variable = await figmaCtx.variables.getVariableByIdAsync(id);
  if (variable === null) throw new Error(`bound variable ${id} not found`);
  return variable;
};

export const aliasIdOf = (alias: unknown): string | null => {
  const id = typeof alias === 'object' && alias !== null ? readField(alias, 'id') : undefined;
  return typeof id === 'string' ? id : null;
};

const boundIdOf = (node: BaseNode, field: string): string | null => {
  const bound = readField(node, 'boundVariables');
  return typeof bound === 'object' && bound !== null ? aliasIdOf(readField(bound, field)) : null;
};

export const captureBindings = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  fields: readonly string[],
): Promise<BindingSnapshot> => {
  const bound = fields.filter(isNodeBindable).filter(field => field in node);
  const entries = await Promise.all(
    bound.map(async field => {
      const id = boundIdOf(node, field);
      return [field, id === null ? null : await resolveVariable(figmaCtx, id)] as const;
    }),
  );
  return Object.fromEntries(entries);
};

const bindingEntries = (
  snapshot: BindingSnapshot,
): (readonly [VariableBindableNodeField, Variable | null])[] =>
  NODE_BINDABLE_FIELDS.flatMap(field => {
    const variable = snapshot[field];
    return variable === undefined ? [] : [[field, variable] as const];
  });

export const unbindAdded = (node: BaseNode, snapshot: BindingSnapshot): void => {
  if (!isBindableNode(node)) return;
  for (const [field, variable] of bindingEntries(snapshot)) {
    if (variable === null && boundIdOf(node, field) !== null) node.setBoundVariable(field, null);
  }
};

export const rebind = (node: BaseNode, snapshot: BindingSnapshot): void => {
  if (!isBindableNode(node)) return;
  for (const [field, variable] of bindingEntries(snapshot)) {
    if (variable !== null && boundIdOf(node, field) !== variable.id) {
      node.setBoundVariable(field, variable);
    }
  }
};
