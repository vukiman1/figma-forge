import type { ArrayExpressionElement, ObjectExpression, Program } from 'oxc-parser';

import { parseSource } from '../../parse-source.js';
import { findConfigObject } from './config-object.js';
import { propertyNamed } from './literal-values.js';

interface PresetBinding {
  readonly from: string;
  readonly imported: string;
}

export interface UnoPresets {
  readonly identified: boolean;
  readonly wind4: boolean;
}

const VOCABULARY_PRESET_NAME = /^preset(uno|wind\d?|mini)$/i;
const VOCABULARY_PRESET_PACKAGE = /preset-(wind|uno|mini)/i;
const WIND4_NAME = /wind4/i;
const WIND4_PACKAGE = /preset-wind4/i;

const importBindings = (program: Program): Map<string, PresetBinding> => {
  const bindings = new Map<string, PresetBinding>();
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    for (const specifier of statement.specifiers) {
      const local = specifier.local.name;
      const imported =
        specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : local;
      bindings.set(local, { from: statement.source.value, imported });
    }
  }
  return bindings;
};

const presetElements = (config: ObjectExpression): readonly ArrayExpressionElement[] => {
  const presets = propertyNamed(config, 'presets');
  return presets?.type === 'ArrayExpression' ? presets.elements : [];
};

const presetName = (element: ArrayExpressionElement): string | undefined => {
  const reference = element?.type === 'CallExpression' ? element.callee : element;
  return reference?.type === 'Identifier' ? reference.name : undefined;
};

const isVocabularyPreset = (local: string, binding: PresetBinding | undefined): boolean =>
  VOCABULARY_PRESET_NAME.test(local) ||
  VOCABULARY_PRESET_NAME.test(binding?.imported ?? '') ||
  VOCABULARY_PRESET_PACKAGE.test(binding?.from ?? '');

const isWind4 = (local: string, binding: PresetBinding | undefined): boolean =>
  WIND4_NAME.test(local) ||
  WIND4_NAME.test(binding?.imported ?? '') ||
  WIND4_PACKAGE.test(binding?.from ?? '');

export const scanUnoPresets = (config: ObjectExpression, program: Program): UnoPresets => {
  const bindings = importBindings(program);
  const vocabulary = presetElements(config)
    .map(presetName)
    .filter((name): name is string => name !== undefined)
    .filter(name => isVocabularyPreset(name, bindings.get(name)));
  return {
    identified: vocabulary.length > 0,
    wind4: vocabulary.some(name => isWind4(name, bindings.get(name))),
  };
};

export const declaresVocabularyPreset = (filePath: string, code: string): boolean | null => {
  const program = parseSource(filePath, code)?.program;
  const config = program === undefined ? null : findConfigObject(program);
  if (program === undefined || config === null) return null;
  if (propertyNamed(config, 'presets') === null) return true;
  if (scanUnoPresets(config, program).identified) return true;
  const isReadable = presetElements(config).some(element => presetName(element) !== undefined);
  return isReadable ? false : null;
};
