import type {
  Program,
  TSInterfaceDeclaration,
  TSSignature,
  TSType,
  TSTypeAliasDeclaration,
} from 'oxc-parser';

import { isDefined, propertyKeyName, unwrapNamedExport } from './ast-names.js';
import { type PropsResult, UNKNOWN_PROPS } from './props-result.js';

type TypeDeclaration = TSInterfaceDeclaration | TSTypeAliasDeclaration;
export type TypeTable = ReadonlyMap<string, TypeDeclaration>;
type ResolvableType = TSType | TypeDeclaration | null | undefined;

export const collectTypeDeclarations = (program: Program): Map<string, TypeDeclaration> => {
  const table = new Map<string, TypeDeclaration>();
  for (const statement of program.body) {
    const declaration = unwrapNamedExport(statement);
    if (
      declaration?.type === 'TSInterfaceDeclaration' ||
      declaration?.type === 'TSTypeAliasDeclaration'
    ) {
      table.set(declaration.id.name, declaration);
    }
  }
  return table;
};

const memberNames = (members: readonly TSSignature[]): string[] =>
  members
    .map(member =>
      member.type === 'TSPropertySignature' || member.type === 'TSMethodSignature'
        ? propertyKeyName(member.key)
        : undefined,
    )
    .filter(isDefined);

const unionOfMembers = (lists: readonly (string[] | null)[]): string[] | null => {
  const names = new Set<string>();
  for (const list of lists) {
    if (list === null) return null;
    for (const name of list) names.add(name);
  }
  return [...names];
};

const resolveReference = (
  name: string | undefined,
  table: TypeTable,
  seen: ReadonlySet<string>,
): string[] | null => {
  if (name === undefined) return null;
  if (seen.has(name)) return [];
  const declaration = table.get(name);
  if (declaration === undefined) return null;
  return resolveTypeMembers(declaration, table, new Set([...seen, name]));
};

const resolveInterface = (
  declaration: TSInterfaceDeclaration,
  table: TypeTable,
  seen: ReadonlySet<string>,
): string[] | null => {
  const parents = declaration.extends.map(heritage =>
    resolveReference(
      heritage.expression.type === 'Identifier' ? heritage.expression.name : undefined,
      table,
      seen,
    ),
  );
  return unionOfMembers([memberNames(declaration.body.body), ...parents]);
};

export const resolveTypeMembers = (
  node: ResolvableType,
  table: TypeTable,
  seen: ReadonlySet<string> = new Set(),
): string[] | null => {
  switch (node?.type) {
    case 'TSTypeLiteral':
      return memberNames(node.members);
    case 'TSTypeReference':
      return resolveReference(
        node.typeName.type === 'Identifier' ? node.typeName.name : undefined,
        table,
        seen,
      );
    case 'TSInterfaceDeclaration':
      return resolveInterface(node, table, seen);
    case 'TSTypeAliasDeclaration':
      return resolveTypeMembers(node.typeAnnotation, table, seen);
    case 'TSIntersectionType':
      return unionOfMembers(node.types.map(part => resolveTypeMembers(part, table, seen)));
    default:
      return null;
  }
};

export const propsFromType = (type: ResolvableType, table: TypeTable): PropsResult => {
  const names = resolveTypeMembers(type, table);
  return names === null ? UNKNOWN_PROPS : { names, extracted: true };
};
