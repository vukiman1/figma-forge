import type {
  Class,
  Function,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from 'oxc-parser';

import { identifierName, trailingName, unwrapNamedExport } from './ast-names.js';
import type { PropsResult } from './props-result.js';
import {
  type ComponentFunction,
  propsFromComponentType,
  propsOfClass,
  propsOfFunction,
} from './react-props.js';
import type { ExportKind } from './scanned-component.js';
import type { TypeTable } from './type-members.js';

export interface Candidate {
  readonly name: string | null;
  readonly props: PropsResult;
  readonly exportKind: ExportKind;
}

export type LocalDeclaration = Function | Class | VariableDeclaration;

const COMPONENT_WRAPPERS: ReadonlySet<string> = new Set(['forwardRef', 'memo', 'observer']);
const REACT_COMPONENT_BASES: ReadonlySet<string> = new Set(['Component', 'PureComponent']);
const MAX_WRAPPER_DEPTH = 4;

const functionOf = (node: Node | null | undefined, depth = 0): ComponentFunction | null => {
  if (node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression') return node;
  if (node?.type !== 'CallExpression' || depth >= MAX_WRAPPER_DEPTH) return null;
  if (!COMPONENT_WRAPPERS.has(trailingName(node.callee) ?? '')) return null;
  return functionOf(node.arguments[0], depth + 1);
};

const isReactComponentClass = (cls: Class): boolean => {
  const base = cls.superClass === null ? undefined : trailingName(cls.superClass);
  return base !== undefined && REACT_COMPONENT_BASES.has(base);
};

const candidateOfBinding = (
  declarator: VariableDeclarator | undefined,
  exportKind: ExportKind,
  table: TypeTable,
): Candidate | null => {
  const fn = functionOf(declarator?.init);
  if (declarator === undefined || fn === null) return null;
  const fromType = propsFromComponentType(declarator.id, table);
  const props = fromType.extracted ? fromType : propsOfFunction(fn, table);
  return { name: identifierName(declarator.id) ?? null, props, exportKind };
};

export const candidateOfDeclaration = (
  declaration: Node | null | undefined,
  exportKind: ExportKind,
  table: TypeTable,
): Candidate | null => {
  if (declaration?.type === 'FunctionDeclaration') {
    const props = propsOfFunction(declaration, table);
    return { name: declaration.id?.name ?? null, props, exportKind };
  }
  if (declaration?.type === 'ClassDeclaration' && isReactComponentClass(declaration)) {
    return {
      name: declaration.id?.name ?? null,
      props: propsOfClass(declaration, table),
      exportKind,
    };
  }
  const direct = functionOf(declaration);
  if (direct !== null && exportKind === 'default') {
    return { name: null, props: propsOfFunction(direct, table), exportKind };
  }
  if (declaration?.type !== 'VariableDeclaration') return null;
  return candidateOfBinding(declaration.declarations[0], exportKind, table);
};

const singleBinding = (
  declaration: VariableDeclaration,
  declarator: VariableDeclarator,
): VariableDeclaration => ({ ...declaration, declarations: [declarator] });

const localBindings = (declaration: Node | null | undefined): [string, LocalDeclaration][] => {
  if (declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') {
    return declaration.id === null ? [] : [[declaration.id.name, declaration]];
  }
  if (declaration?.type !== 'VariableDeclaration') return [];
  return declaration.declarations.flatMap((declarator): [string, LocalDeclaration][] => {
    const name = identifierName(declarator.id);
    return name === undefined ? [] : [[name, singleBinding(declaration, declarator)]];
  });
};

export const collectLocalDeclarations = (program: Program): Map<string, LocalDeclaration> =>
  new Map(program.body.flatMap(statement => localBindings(unwrapNamedExport(statement))));
