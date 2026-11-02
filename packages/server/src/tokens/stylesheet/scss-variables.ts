import type { ProjectToken } from '../project-token.js';
import { type CssDeclaration, scanScssVariables } from './declaration-scan.js';
import { nameValueKey, uniqueBy } from './unique-by.js';

const PRIVATE_MEMBER_PREFIXES: readonly string[] = ['_', '-'];

const isModuleMember = (declaration: CssDeclaration): boolean =>
  declaration.scope === '' &&
  !PRIVATE_MEMBER_PREFIXES.some(prefix => declaration.name.startsWith(prefix));

export const parseScssVariables = (scss: string, from: string): ProjectToken[] =>
  uniqueBy(scanScssVariables(scss).filter(isModuleMember), nameValueKey).map(declaration => ({
    name: declaration.name,
    value: declaration.value,
    scssVar: `$${declaration.name}`,
    from,
  }));
