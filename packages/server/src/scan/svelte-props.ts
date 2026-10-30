import type { Declaration, Program, VariableDeclarator } from 'oxc-parser';

import { identifierName, objectPatternNames } from './ast-names.js';
import { mergeProps, type PropsResult } from './props-result.js';
import { propsFromType, type TypeTable } from './type-members.js';

const PROPS_RUNE = '$props';

const exportedLetNames = (declaration: Declaration | null): string[] => {
  if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'let') return [];
  return declaration.declarations.flatMap(declarator =>
    declarator.id.type === 'Identifier' ? [declarator.id.name] : [],
  );
};

const propsOfRune = (declarator: VariableDeclarator, table: TypeTable): PropsResult[] => {
  const { id, init } = declarator;
  if (init?.type !== 'CallExpression' || identifierName(init.callee) !== PROPS_RUNE) return [];
  if (id.type === 'ObjectPattern') return [{ names: objectPatternNames(id), extracted: true }];
  return [propsFromType(init.typeArguments?.params[0] ?? id.typeAnnotation?.typeAnnotation, table)];
};

export const readSvelteProps = (program: Program, table: TypeTable): PropsResult => {
  const exported = program.body.flatMap(statement =>
    statement.type === 'ExportNamedDeclaration' ? exportedLetNames(statement.declaration) : [],
  );
  const runes = program.body.flatMap(statement =>
    statement.type === 'VariableDeclaration'
      ? statement.declarations.flatMap(declarator => propsOfRune(declarator, table))
      : [],
  );
  return mergeProps([{ names: exported, extracted: true }, ...runes]);
};
