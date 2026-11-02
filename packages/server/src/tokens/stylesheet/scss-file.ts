import type { ProjectToken } from '../project-token.js';
import { parseCssCustomProperties } from './css-custom-properties.js';
import { scanCustomProperties } from './declaration-scan.js';
import { isBaseScopedDeclaration } from './declaration-scope.js';
import { parseScssVariables } from './scss-variables.js';
import { nameValueKey, uniqueBy } from './unique-by.js';

const SOLE_INTERPOLATION = /^#\{\s*\$([\w-]+)\s*\}$/;

const resolveSoleInterpolation = (
  token: ProjectToken,
  variableValues: ReadonlyMap<string, string>,
): ProjectToken => {
  const variableName = SOLE_INTERPOLATION.exec(token.value)?.[1];
  const resolved = variableName === undefined ? undefined : variableValues.get(variableName);
  return resolved === undefined ? token : { ...token, value: resolved };
};

const baseScopedNames = (body: string): Set<string> =>
  new Set(
    scanCustomProperties(body, true)
      .filter(d => isBaseScopedDeclaration(d.scope, d.ancestors))
      .map(d => d.name),
  );

const referenceKey = (token: ProjectToken): string =>
  [token.name, token.value, token.cssVar ?? '', token.scssVar ?? '', token.from ?? ''].join(
    '\u0000',
  );

export const parseScssFile = (body: string, from: string): ProjectToken[] => {
  const variables = parseScssVariables(body, from);
  const variableValues = new Map(variables.map(v => [v.name, v.value]));
  const customProperties = parseCssCustomProperties(body, true).map(token =>
    resolveSoleInterpolation(token, variableValues),
  );
  const baseScoped = baseScopedNames(body);
  const mirrored = new Set(
    customProperties.filter(t => baseScoped.has(t.name)).map(t => nameValueKey(t)),
  );
  const kept = [...variables.filter(v => !mirrored.has(nameValueKey(v))), ...customProperties];
  return uniqueBy(kept, referenceKey);
};
