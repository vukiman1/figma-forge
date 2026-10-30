import type {
  ArrayExpressionElement,
  CallExpression,
  Class,
  ClassElement,
  Expression,
  Node,
  StaticBlock,
  TSIndexSignature,
} from 'oxc-parser';

import {
  decoratorArgument,
  findDecorator,
  hasDecorator,
  identifierName,
  isDefined,
  objectPropertyValue,
  stringLiteralValue,
} from './ast-names.js';

type KeyedClassElement = Exclude<ClassElement, StaticBlock | TSIndexSignature>;

const SIGNAL_INPUT_FACTORIES: ReadonlySet<string> = new Set(['input', 'model']);
const METADATA_ALIAS_SEPARATOR = ':';

const aliasFromOptions = (node: Node | null | undefined): string | undefined =>
  node?.type === 'ObjectExpression'
    ? stringLiteralValue(objectPropertyValue(node, 'alias'))
    : undefined;

const decoratedInputName = (member: KeyedClassElement, keyName: string): string => {
  const options = decoratorArgument(findDecorator(member, 'Input'));
  return stringLiteralValue(options) ?? aliasFromOptions(options) ?? keyName;
};

const isSignalInput = (value: Expression | null): value is CallExpression => {
  if (value?.type !== 'CallExpression') return false;
  const { callee } = value;
  const factory =
    callee.type === 'MemberExpression' ? identifierName(callee.object) : identifierName(callee);
  return factory !== undefined && SIGNAL_INPUT_FACTORIES.has(factory);
};

const signalInputName = (value: CallExpression, keyName: string): string => {
  const isRequired = value.callee.type === 'MemberExpression';
  return aliasFromOptions(value.arguments[isRequired ? 0 : 1]) ?? keyName;
};

const isKeyed = (member: ClassElement): member is KeyedClassElement =>
  member.type !== 'StaticBlock' && member.type !== 'TSIndexSignature';

const memberInputName = (member: KeyedClassElement): string | undefined => {
  const keyName = identifierName(member.key);
  if (keyName === undefined) return undefined;
  if (hasDecorator(member, 'Input')) return decoratedInputName(member, keyName);
  if (member.type === 'PropertyDefinition' && isSignalInput(member.value)) {
    return signalInputName(member.value, keyName);
  }
  return undefined;
};

const metadataInputName = (element: ArrayExpressionElement): string | undefined => {
  const entry = stringLiteralValue(element);
  if (entry !== undefined) {
    const [field, alias] = entry.split(METADATA_ALIAS_SEPARATOR);
    return (alias ?? field ?? '').trim();
  }
  if (element?.type !== 'ObjectExpression') return undefined;
  return aliasFromOptions(element) ?? stringLiteralValue(objectPropertyValue(element, 'name'));
};

const metadataInputNames = (cls: Class): string[] => {
  const options = decoratorArgument(findDecorator(cls, 'Component'));
  if (options?.type !== 'ObjectExpression') return [];
  const inputs = objectPropertyValue(options, 'inputs');
  if (inputs?.type !== 'ArrayExpression') return [];
  return inputs.elements
    .map(metadataInputName)
    .filter((name): name is string => name !== undefined && name.length > 0);
};

export const ownInputNames = (cls: Class): string[] => [
  ...metadataInputNames(cls),
  ...cls.body.body.filter(isKeyed).map(memberInputName).filter(isDefined),
];
