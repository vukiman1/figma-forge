import type { ObjectExpression, ObjectPropertyKind, Program } from 'oxc-parser';

import { parseSource } from '../../parse-source.js';
import type { ProjectToken } from '../tokens.js';
import { findConfigObject, unwrapObject } from './config-object.js';
import { keyName, leafValue, propertyNamed } from './literal-values.js';
import type { Scale } from './scale-tables.js';

export interface JsConfigTokens {
  readonly tokens: ProjectToken[];
  readonly themeFound: boolean;
  readonly skipped: number;
}

export interface ScalePickContext {
  readonly config: ObjectExpression;
  readonly program: Program;
  readonly scopes: readonly (ObjectExpression | null)[];
}

const NO_THEME: JsConfigTokens = { tokens: [], skipped: 0, themeFound: false };
const MAX_TOKENS = 2000;
const MAX_DEPTH = 8;
const DEFAULT_KEY = 'DEFAULT';

class ThemeTokenCollector {
  skipped = 0;
  private readonly byName = new Map<string, ProjectToken>();

  skip(): void {
    this.skipped += 1;
  }

  add(scale: Scale, path: readonly string[], value: string): void {
    if (this.byName.size >= MAX_TOKENS) return;
    const segments = path.at(-1) === DEFAULT_KEY ? path.slice(0, -1) : path;
    if (segments.length === 0) return;
    const utility = segments.join('-');
    const name = `${scale.prefix}${utility}`;
    this.byName.set(name, { name, value, utility, category: scale.category, utilityIsClass: true });
  }

  tokens(): ProjectToken[] {
    return [...this.byName.values()];
  }
}

const readOptionLeaf = (
  options: ObjectExpression,
  leafKey: string,
  path: readonly string[],
  scale: Scale,
  collector: ThemeTokenCollector,
): void => {
  const value = leafValue(propertyNamed(options, leafKey));
  if (value === null) collector.skip();
  else collector.add(scale, path, value);
};

const readEntry = (
  property: ObjectPropertyKind,
  path: readonly string[],
  scale: Scale,
  collector: ThemeTokenCollector,
  depth: number,
): void => {
  const key = property.type === 'Property' && !property.computed ? keyName(property.key) : null;
  if (property.type !== 'Property' || key === null) {
    collector.skip();
    return;
  }
  const next = [...path, key];
  const { value } = property;
  if (value.type === 'ObjectExpression' && scale.leafKey !== undefined) {
    readOptionLeaf(value, scale.leafKey, next, scale, collector);
  } else if (value.type === 'ObjectExpression') {
    flattenScale(value, next, scale, collector, depth + 1);
  } else {
    const leaf = leafValue(value, scale.joinArray === true);
    if (leaf === null) collector.skip();
    else collector.add(scale, next, leaf);
  }
};

const flattenScale = (
  node: ObjectExpression,
  path: readonly string[],
  scale: Scale,
  collector: ThemeTokenCollector,
  depth = 0,
): void => {
  if (depth > MAX_DEPTH) {
    collector.skip();
    return;
  }
  for (const property of node.properties) readEntry(property, path, scale, collector, depth);
};

const readScale = (
  scale: Scale,
  scopes: readonly (ObjectExpression | null)[],
  program: Program,
  collector: ThemeTokenCollector,
): void => {
  let isReportedUnreadable = false;
  for (const scope of scopes) {
    const declared = scope === null ? null : propertyNamed(scope, scale.key);
    const source = unwrapObject(declared, program);
    if (source !== null) flattenScale(source, [], scale, collector);
    else if (declared !== null && !isReportedUnreadable) {
      isReportedUnreadable = true;
      collector.skip();
    }
  }
};

export const readThemeScales = (
  filePath: string,
  code: string,
  pickScales: (context: ScalePickContext) => readonly Scale[],
): JsConfigTokens => {
  const program = parseSource(filePath, code)?.program;
  const config = program === undefined ? null : findConfigObject(program);
  if (program === undefined || config === null) return NO_THEME;
  const theme = unwrapObject(propertyNamed(config, 'theme'), program);
  if (theme === null) return NO_THEME;
  const collector = new ThemeTokenCollector();
  const declaredExtend = propertyNamed(theme, 'extend');
  const extend = unwrapObject(declaredExtend, program);
  if (declaredExtend !== null && extend === null) collector.skip();
  const scopes = [theme, extend];
  for (const scale of pickScales({ config, program, scopes })) {
    readScale(scale, scopes, program, collector);
  }
  return { tokens: collector.tokens(), skipped: collector.skipped, themeFound: true };
};
