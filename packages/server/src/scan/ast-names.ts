import type {
  Decorator,
  Directive,
  Expression,
  Node,
  ObjectExpression,
  ObjectPattern,
  Statement,
} from 'oxc-parser';

type MaybeNode = Node | null | undefined;

interface Decorated {
  readonly decorators?: readonly Decorator[];
}

export const identifierName = (node: MaybeNode): string | undefined =>
  node?.type === 'Identifier' || node?.type === 'PrivateIdentifier' ? node.name : undefined;

export const stringLiteralValue = (node: MaybeNode): string | undefined =>
  node?.type === 'Literal' && typeof node.value === 'string' ? node.value : undefined;

export const propertyKeyName = (key: MaybeNode): string | undefined =>
  identifierName(key) ?? stringLiteralValue(key);

export const trailingName = (expression: Expression): string | undefined =>
  expression.type === 'MemberExpression'
    ? identifierName(expression.property)
    : identifierName(expression);

export const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export const objectPropertyValue = (
  object: ObjectExpression,
  key: string,
): Expression | undefined => {
  for (const property of object.properties) {
    if (property.type === 'Property' && propertyKeyName(property.key) === key)
      return property.value;
  }
  return undefined;
};

export const objectPatternNames = (pattern: ObjectPattern): string[] =>
  pattern.properties
    .map(property => (property.type === 'Property' ? identifierName(property.key) : undefined))
    .filter(isDefined);

export const unwrapNamedExport = (statement: Directive | Statement): MaybeNode =>
  statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;

const decoratorName = ({ expression }: Decorator): string | undefined =>
  expression.type === 'CallExpression'
    ? identifierName(expression.callee)
    : identifierName(expression);

export const findDecorator = (node: Decorated, name: string): Decorator | undefined =>
  (node.decorators ?? []).find(decorator => decoratorName(decorator) === name);

export const hasDecorator = (node: Decorated, name: string): boolean =>
  findDecorator(node, name) !== undefined;

export const decoratorArgument = (decorator: Decorator | undefined): MaybeNode =>
  decorator?.expression.type === 'CallExpression' ? decorator.expression.arguments[0] : undefined;
