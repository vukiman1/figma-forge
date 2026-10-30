import type { Class, Directive, Expression, Node, Program, Statement } from 'oxc-parser';

import { ownInputNames } from './angular-input-names.js';
import { hasDecorator } from './ast-names.js';
import { parseSource } from './parse-program.js';
import { mergeProps, NO_PROPS, type PropsResult, UNKNOWN_PROPS } from './props-result.js';
import type { ScannedComponent } from './scanned-component.js';

type Classes = ReadonlyMap<string, Class>;

const COMPONENT_DECORATOR = 'Component';
const COMPONENT_SUFFIX = 'Component';

const exportedOrBare = (statement: Directive | Statement): Node | null =>
  statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
    ? statement.declaration
    : statement;

const collectClassDeclarations = (program: Program): Map<string, Class> => {
  const classes = new Map<string, Class>();
  for (const statement of program.body) {
    const declaration = exportedOrBare(statement);
    if (declaration?.type === 'ClassDeclaration' && declaration.id !== null) {
      classes.set(declaration.id.name, declaration);
    }
  }
  return classes;
};

const inheritedInputs = (
  superClass: Expression | null,
  classes: Classes,
  seen: ReadonlySet<string>,
): PropsResult => {
  if (superClass === null) return NO_PROPS;
  if (superClass.type !== 'Identifier') return UNKNOWN_PROPS;
  if (seen.has(superClass.name)) return NO_PROPS;
  const base = classes.get(superClass.name);
  if (base === undefined) return UNKNOWN_PROPS;
  return angularInputs(base, classes, new Set([...seen, superClass.name]));
};

const angularInputs = (
  cls: Class,
  classes: Classes,
  seen: ReadonlySet<string> = new Set(),
): PropsResult =>
  mergeProps([
    { names: ownInputNames(cls), extracted: true },
    inheritedInputs(cls.superClass, classes, seen),
  ]);

const logicalName = (className: string): string =>
  className.endsWith(COMPONENT_SUFFIX) && className.length > COMPONENT_SUFFIX.length
    ? className.slice(0, -COMPONENT_SUFFIX.length)
    : className;

const componentOf = (
  statement: Directive | Statement,
  classes: Classes,
  filePath: string,
): ScannedComponent | undefined => {
  if (
    statement.type !== 'ExportNamedDeclaration' &&
    statement.type !== 'ExportDefaultDeclaration'
  ) {
    return undefined;
  }
  const cls = statement.declaration;
  if (cls?.type !== 'ClassDeclaration' || cls.id === null) return undefined;
  if (!hasDecorator(cls, COMPONENT_DECORATOR)) return undefined;
  const inputs = angularInputs(cls, classes);
  return {
    name: logicalName(cls.id.name),
    filePath,
    exportKind: statement.type === 'ExportDefaultDeclaration' ? 'default' : 'named',
    propNames: inputs.names,
    propsExtracted: inputs.extracted,
    framework: 'angular',
  };
};

export const extractAngularComponents = (filePath: string, code: string): ScannedComponent[] => {
  const program = parseSource(filePath, code)?.program;
  if (program === undefined) return [];
  const classes = collectClassDeclarations(program);
  return program.body.flatMap(statement => componentOf(statement, classes, filePath) ?? []);
};
