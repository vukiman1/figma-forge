import type { Directive, ExportNamedDeclaration, ExportSpecifier, Statement } from 'oxc-parser';

import { parseSource } from '../parse-source.js';
import { identifierName } from './ast-names.js';
import { isPascalCase, nameFromFile } from './component-name.js';
import {
  type Candidate,
  candidateOfDeclaration,
  collectLocalDeclarations,
  type LocalDeclaration,
} from './react-candidates.js';
import type { ScannedComponent } from './scanned-component.js';
import { collectTypeDeclarations, type TypeTable } from './type-members.js';

type Locals = ReadonlyMap<string, LocalDeclaration>;

interface NamedCandidate {
  readonly name: string | null;
  readonly candidate: Candidate;
}

const DEFAULT_EXPORT_NAME = 'default';

const inlineExport = (statement: Directive | Statement, table: TypeTable): Candidate | null => {
  if (statement.type === 'ExportNamedDeclaration') {
    return candidateOfDeclaration(statement.declaration, 'named', table);
  }
  if (statement.type === 'ExportDefaultDeclaration') {
    return candidateOfDeclaration(statement.declaration, 'default', table);
  }
  return null;
};

const specifierExport = (
  specifier: ExportSpecifier,
  locals: Locals,
  table: TypeTable,
): NamedCandidate | undefined => {
  if (specifier.exportKind === 'type') return undefined;
  const localName = identifierName(specifier.local);
  const exportedName = identifierName(specifier.exported);
  const isDefault = exportedName === DEFAULT_EXPORT_NAME;
  const local = localName === undefined ? undefined : locals.get(localName);
  const candidate = candidateOfDeclaration(local, isDefault ? 'default' : 'named', table);
  if (candidate === null) return undefined;
  return { name: (isDefault ? localName : exportedName) ?? localName ?? null, candidate };
};

const specifierExports = (
  declaration: ExportNamedDeclaration,
  locals: Locals,
  table: TypeTable,
): NamedCandidate[] => {
  if (declaration.exportKind === 'type' || declaration.source !== null) return [];
  return declaration.specifiers.flatMap(
    specifier => specifierExport(specifier, locals, table) ?? [],
  );
};

const referenceExports = (
  statement: Directive | Statement,
  locals: Locals,
  table: TypeTable,
): NamedCandidate[] => {
  if (statement.type === 'ExportNamedDeclaration')
    return specifierExports(statement, locals, table);
  if (statement.type !== 'ExportDefaultDeclaration') return [];
  if (statement.declaration.type !== 'Identifier') return [];
  const { name } = statement.declaration;
  const candidate = candidateOfDeclaration(locals.get(name), 'default', table);
  return candidate === null ? [] : [{ name, candidate }];
};

class ComponentCollector {
  private readonly byName = new Map<string, ScannedComponent>();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  add({ name, candidate }: NamedCandidate): void {
    const fallback = candidate.exportKind === 'default' ? nameFromFile(this.filePath) : null;
    const resolved = name ?? fallback;
    if (resolved === null || !isPascalCase(resolved) || this.byName.has(resolved)) return;
    this.byName.set(resolved, {
      name: resolved,
      filePath: this.filePath,
      exportKind: candidate.exportKind,
      propNames: candidate.props.names,
      propsExtracted: candidate.props.extracted,
      framework: 'react',
    });
  }

  components(): ScannedComponent[] {
    return [...this.byName.values()];
  }
}

export const extractReactComponents = (filePath: string, code: string): ScannedComponent[] => {
  const program = parseSource(filePath, code)?.program;
  if (program === undefined) return [];
  const table = collectTypeDeclarations(program);
  const collector = new ComponentCollector(filePath);
  for (const statement of program.body) {
    const candidate = inlineExport(statement, table);
    if (candidate !== null) collector.add({ name: candidate.name, candidate });
  }
  const locals = collectLocalDeclarations(program);
  for (const statement of program.body) {
    for (const named of referenceExports(statement, locals, table)) collector.add(named);
  }
  return collector.components();
};
