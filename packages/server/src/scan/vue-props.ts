import type { CallExpression, Node, ObjectExpression, Program } from 'oxc-parser';

import {
  identifierName,
  isDefined,
  objectPropertyValue,
  propertyKeyName,
  stringLiteralValue,
} from './ast-names.js';
import { mergeProps, NO_PROPS, type PropsResult } from './props-result.js';
import { propsFromType, type TypeTable } from './type-members.js';

const DEFAULT_MODEL_PROP = 'modelValue';

const isCallExpression = (value: object): value is CallExpression =>
  'type' in value && value.type === 'CallExpression';

const collectCalls = (root: Program): CallExpression[] => {
  const calls: CallExpression[] = [];
  const pending: unknown[] = [root];
  while (pending.length > 0) {
    const node = pending.pop();
    if (typeof node !== 'object' || node === null) continue;
    if (isCallExpression(node)) calls.push(node);
    const children = Object.values(node);
    for (let index = children.length - 1; index >= 0; index -= 1) pending.push(children[index]);
  }
  return calls;
};

const declaredPropNames = (node: Node | null | undefined): string[] => {
  if (node?.type === 'ObjectExpression') {
    return node.properties
      .map(property => (property.type === 'Property' ? propertyKeyName(property.key) : undefined))
      .filter(isDefined);
  }
  if (node?.type === 'ArrayExpression')
    return node.elements.map(stringLiteralValue).filter(isDefined);
  return [];
};

const propsOfCall = (call: CallExpression, table: TypeTable): PropsResult => {
  const callee = identifierName(call.callee);
  if (callee === 'defineModel') {
    return {
      names: [stringLiteralValue(call.arguments[0]) ?? DEFAULT_MODEL_PROP],
      extracted: true,
    };
  }
  if (callee !== 'defineProps') return NO_PROPS;
  const typeArgument = call.typeArguments?.params[0];
  if (typeArgument !== undefined) return propsFromType(typeArgument, table);
  return { names: declaredPropNames(call.arguments[0]), extracted: true };
};

const optionsObjectOf = (declaration: Node): ObjectExpression | undefined => {
  if (declaration.type === 'ObjectExpression') return declaration;
  const isCall = declaration.type === 'CallExpression' || declaration.type === 'NewExpression';
  const first = isCall ? declaration.arguments[0] : undefined;
  return first?.type === 'ObjectExpression' ? first : undefined;
};

const optionsApiPropNames = (program: Program): string[] => {
  for (const statement of program.body) {
    if (statement.type !== 'ExportDefaultDeclaration') continue;
    const options = optionsObjectOf(statement.declaration);
    if (options !== undefined) return declaredPropNames(objectPropertyValue(options, 'props'));
  }
  return [];
};

export const readVueProps = (program: Program, table: TypeTable): PropsResult =>
  mergeProps([
    ...collectCalls(program).map(call => propsOfCall(call, table)),
    { names: optionsApiPropNames(program), extracted: true },
  ]);
