import type {
  Argument,
  Directive,
  Node,
  ObjectExpression,
  Program,
  Statement,
  VariableDeclarator,
} from 'oxc-parser';

const MAX_UNWRAP = 8;

const isObjectExpression = (argument: Argument): argument is ObjectExpression =>
  argument.type === 'ObjectExpression';

const declarationsOf = (statement: Directive | Statement): readonly VariableDeclarator[] => {
  if (statement.type === 'VariableDeclaration') return statement.declarations;
  if (statement.type !== 'ExportNamedDeclaration') return [];
  const { declaration } = statement;
  return declaration?.type === 'VariableDeclaration' ? declaration.declarations : [];
};

const localInitializer = (program: Program, name: string): Node | undefined => {
  for (const statement of program.body) {
    const declarator = declarationsOf(statement).find(
      candidate =>
        candidate.id.type === 'Identifier' && candidate.id.name === name && candidate.init !== null,
    );
    if (declarator?.init) return declarator.init;
  }
  return undefined;
};

const unwrapped = (node: Node, program: Program, allowCall: boolean): Node | undefined => {
  switch (node.type) {
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
      return node.expression;
    case 'CallExpression':
      return allowCall ? node.arguments.find(isObjectExpression) : undefined;
    case 'Identifier':
      return localInitializer(program, node.name);
    default:
      return undefined;
  }
};

export const unwrapObject = (
  node: Node | null | undefined,
  program: Program,
  allowCall = false,
  depth = 0,
): ObjectExpression | null => {
  if (node === null || node === undefined || depth > MAX_UNWRAP) return null;
  if (node.type === 'ObjectExpression') return node;
  return unwrapObject(unwrapped(node, program, allowCall), program, allowCall, depth + 1);
};

const isModuleExports = (target: Node): boolean =>
  target.type === 'MemberExpression' &&
  target.object.type === 'Identifier' &&
  target.object.name === 'module' &&
  target.property.type === 'Identifier' &&
  target.property.name === 'exports';

const exportedValue = (statement: Directive | Statement): Node | undefined => {
  if (statement.type === 'ExportDefaultDeclaration') return statement.declaration;
  if (statement.type !== 'ExpressionStatement') return undefined;
  const { expression } = statement;
  if (expression.type !== 'AssignmentExpression') return undefined;
  const { left } = expression;
  const isExportsTarget = left.type === 'Identifier' && left.name === 'exports';
  return isModuleExports(left) || isExportsTarget ? expression.right : undefined;
};

export const findConfigObject = (program: Program): ObjectExpression | null => {
  for (const statement of program.body) {
    const config = unwrapObject(exportedValue(statement), program, true);
    if (config !== null) return config;
  }
  return null;
};
