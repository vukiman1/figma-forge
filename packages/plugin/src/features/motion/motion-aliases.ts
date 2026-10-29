type Needs = 'EASING' | 'TIMING' | undefined;

interface AliasSite {
  path: string;
  id: unknown;
  needs: Needs;
}

interface AliasInput {
  track?: unknown;
  config?: unknown;
}

const REMEDY = {
  EASING:
    'Bind an EASING variable (create one with create_variable, resolvedType EASING, and set its ' +
    'curve with set_variable_value), or pass a literal easing.',
  TIMING:
    'Bind a TIMING variable (create one with create_variable, resolvedType TIMING, and set its ' +
    'seconds with set_variable_value), or pass a literal number of seconds.',
} as const;

const NEEDS_BY_PROP: Readonly<Record<string, Needs>> = {
  easing: 'EASING',
  delay: 'TIMING',
  duration: 'TIMING',
};

const isAlias = (value: unknown): value is { type: 'VARIABLE_ALIAS'; id?: unknown } =>
  typeof value === 'object' && value !== null && Reflect.get(value, 'type') === 'VARIABLE_ALIAS';

const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;

const keyframeSites = (track: unknown): AliasSite[] => {
  const keyframes = fieldOf(track, 'keyframes');
  if (!Array.isArray(keyframes)) return [];
  return keyframes.flatMap((keyframe: unknown, index) => {
    const easing = fieldOf(keyframe, 'easing');
    return isAlias(easing)
      ? [{ path: `track.keyframes[${index}].easing`, id: easing.id, needs: 'EASING' as const }]
      : [];
  });
};

const propSites = (config: unknown): AliasSite[] => {
  const props = fieldOf(config, 'props');
  if (typeof props !== 'object' || props === null) return [];
  return Object.entries(props).flatMap(([prop, value]: [string, unknown]) =>
    isAlias(value)
      ? [{ path: `config.props.${prop}`, id: value.id, needs: NEEDS_BY_PROP[prop] }]
      : [],
  );
};

const missingVariable = (tool: string, { path, id, needs }: AliasSite): Error =>
  new Error(
    `${tool}: ${path} is bound to variable ${String(id)}, which does not exist in this file. ` +
      (needs === undefined
        ? 'Use a local or already-imported variable id from get_variable_defs.'
        : REMEDY[needs]),
  );

const wrongType = (tool: string, { path, needs }: AliasSite, variable: Variable): Error | null => {
  if (needs === undefined || variable.resolvedType === needs) return null;
  return new Error(
    `${tool}: ${path} is bound to "${variable.name}" (${variable.id}), a ${variable.resolvedType} ` +
      `variable, but this slot takes ${needs === 'EASING' ? 'an' : 'a'} ${needs} variable. ` +
      REMEDY[needs],
  );
};

export const assertMotionAliases = async (
  figmaCtx: typeof figma,
  tool: string,
  input: AliasInput,
): Promise<void> => {
  const sites = [...keyframeSites(input.track), ...propSites(input.config)];
  const variables = await Promise.all(
    sites.map(async ({ id }) =>
      typeof id === 'string' ? figmaCtx.variables.getVariableByIdAsync(id) : null,
    ),
  );
  for (const [index, site] of sites.entries()) {
    const variable = variables[index] ?? null;
    if (variable === null) throw missingVariable(tool, site);
    const mismatch = wrongType(tool, site, variable);
    if (mismatch !== null) throw mismatch;
  }
};
