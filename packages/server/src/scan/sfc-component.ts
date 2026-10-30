import type { Program } from 'oxc-parser';

import { nameFromFile } from './component-name.js';
import { parseSource } from './parse-program.js';
import { mergeProps } from './props-result.js';
import type { ComponentFramework, ScannedComponent } from './scanned-component.js';
import { type ScriptLang, scanSfcScripts, type SfcScriptBlock } from './sfc-blocks.js';
import { readSvelteProps } from './svelte-props.js';
import { collectTypeDeclarations, type TypeTable } from './type-members.js';
import { readVueProps } from './vue-props.js';

interface ParsedBlock {
  readonly program: Program | null;
  readonly isComplete: boolean;
}

type ComponentIdentity = Pick<ScannedComponent, 'name' | 'filePath' | 'exportKind' | 'framework'>;

const VIRTUAL_SOURCE: Readonly<Record<ScriptLang, string>> = {
  js: 'sfc.js',
  jsx: 'sfc.jsx',
  ts: 'sfc.ts',
  tsx: 'sfc.tsx',
};

const UNREAD_BLOCK: ParsedBlock = { program: null, isComplete: false };

const parseBlock = (block: SfcScriptBlock): ParsedBlock => {
  if (block.external || block.lang === null) return UNREAD_BLOCK;
  const parsed = parseSource(VIRTUAL_SOURCE[block.lang], block.body);
  return parsed === null
    ? UNREAD_BLOCK
    : { program: parsed.program, isComplete: !parsed.hasErrors };
};

const sharedTypeTable = (programs: readonly Program[]): TypeTable =>
  new Map(programs.flatMap(program => [...collectTypeDeclarations(program)]));

export const extractSfcComponent = (
  filePath: string,
  code: string,
  framework: ComponentFramework,
): ScannedComponent[] => {
  const base: ComponentIdentity = {
    name: nameFromFile(filePath),
    filePath,
    exportKind: 'default',
    framework,
  };
  const { blocks, unterminated } = scanSfcScripts(code, { templateIsBlock: framework === 'vue' });
  if (blocks.length === 0) return [{ ...base, propNames: [], propsExtracted: !unterminated }];
  const parsed = blocks.map(parseBlock);
  const programs = parsed.flatMap(block => block.program ?? []);
  const table = sharedTypeTable(programs);
  const readProps = framework === 'vue' ? readVueProps : readSvelteProps;
  const props = mergeProps(programs.map(program => readProps(program, table)));
  const isComplete = !unterminated && parsed.every(block => block.isComplete) && props.extracted;
  return [
    { ...base, propNames: props.names, propsExtracted: isComplete && props.names.length > 0 },
  ];
};
