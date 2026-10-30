import type { ArrayExpressionElement, Node, ObjectExpression } from 'oxc-parser';

type MaybeNode = Node | null | undefined;

const literalText = (node: MaybeNode): string | null => {
  if (node?.type !== 'Literal') return null;
  const { value } = node;
  if (typeof value === 'string') return value;
  return typeof value === 'number' ? String(value) : null;
};

export const keyName = (node: MaybeNode): string | null =>
  node?.type === 'Identifier' ? node.name : literalText(node);

const leadingStrings = (elements: readonly ArrayExpressionElement[]): string[] => {
  const parts: string[] = [];
  for (const element of elements) {
    if (element?.type !== 'Literal' || typeof element.value !== 'string') break;
    parts.push(element.value);
  }
  return parts;
};

const arrayValue = (
  elements: readonly ArrayExpressionElement[],
  joinArray: boolean,
): string | null => {
  const parts = leadingStrings(elements);
  const [first] = parts;
  if (first === undefined) return null;
  return joinArray && parts.length === elements.length ? parts.join(', ') : first;
};

export const leafValue = (node: MaybeNode, joinArray = false): string | null => {
  if (node?.type === 'TemplateLiteral') {
    return node.expressions.length === 0 ? (node.quasis[0]?.value.cooked ?? null) : null;
  }
  if (node?.type === 'ArrayExpression') return arrayValue(node.elements, joinArray);
  return literalText(node);
};

export const propertyNamed = (object: ObjectExpression, name: string): Node | null => {
  for (const property of object.properties) {
    if (property.type === 'Property' && !property.computed && keyName(property.key) === name) {
      return property.value;
    }
  }
  return null;
};
