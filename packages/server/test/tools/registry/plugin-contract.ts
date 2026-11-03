import { z } from 'zod';

import { WIRE_TOOL_SCHEMAS } from '../../../src/tools/wire/wire-schema.js';

export const collect = (schema: z.ZodType, prefix: string, out: Set<string>): void => {
  const def = schema.def as { type: string; [key: string]: unknown };

  switch (def.type) {
    case 'object': {
      for (const [key, child] of Object.entries((schema as z.ZodObject).shape)) {
        const path = prefix === '' ? key : `${prefix}.${key}`;
        out.add(path);
        collect(child as z.ZodType, path, out);
      }
      return;
    }
    case 'array': {
      collect(def.element as z.ZodType, `${prefix}[]`, out);
      return;
    }
    case 'union': {
      for (const option of def.options as z.ZodType[]) collect(option, prefix, out);
      return;
    }
    case 'record': {
      collect(def.valueType as z.ZodType, `${prefix}[key]`, out);
      return;
    }

    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
    case 'nonoptional': {
      collect(def.innerType as z.ZodType, prefix, out);
      return;
    }
    case 'pipe': {
      collect(def.in as z.ZodType, prefix, out);
      return;
    }
    case 'lazy': {
      return;
    }
    default:
      return;
  }
};

export type PluginToolContract = Record<string, readonly string[]>;

export const derivePluginContract = (): PluginToolContract => {
  const contract: Record<string, readonly string[]> = {};

  for (const [name, schema] of WIRE_TOOL_SCHEMAS) {
    const paths = new Set<string>();
    collect(schema, '', paths);
    contract[name] = [...paths].toSorted();
  }
  return contract;
};

const KEY_AT = /^([A-Za-z_$][\w$]*)\s*:/;
const IDENT = /^[\w$]*/;

const literalKeys = (source: string, open: number, out: Set<string>): void => {
  let depth = 0;
  let close = -1;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1) return;

  let nested = 0;
  const body = source.slice(open + 1, close);
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === '{' || char === '[' || char === '(') nested += 1;
    else if (char === '}' || char === ']' || char === ')') nested -= 1;
    else if (nested === 0 && /[A-Za-z_$]/.test(char ?? '')) {
      const key = KEY_AT.exec(body.slice(i));
      if (key?.[1] !== undefined) {
        out.add(key[1]);
        i += key[0].length - 1;
      } else {
        i += (IDENT.exec(body.slice(i))?.[0].length ?? 1) - 1;
      }
    }
  }
};

export const scanInjectedArgs = (source: string): Set<string> => {
  const found = new Set<string>();

  for (const spread of source.matchAll(/\.\.\.args\s*,/g)) {
    const open = source.lastIndexOf('{', spread.index);
    if (open !== -1) literalKeys(source, open, found);
  }

  for (const call of source.matchAll(/\bdispatch\w*\s*\(\s*[^,()]+,\s*\{/g)) {
    literalKeys(source, call.index + call[0].length - 1, found);
  }

  for (const assign of source.matchAll(/\b\w*[Aa]rgs\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) {
    if (assign[1] !== undefined) found.add(assign[1]);
  }

  return found;
};

export interface ContractDrift {
  addedTools: string[];
  removedTools: string[];

  addedArgs: string[];
  removedArgs: string[];
}

export const diffContracts = (
  recorded: PluginToolContract,
  derived: PluginToolContract,
): ContractDrift => {
  const drift: ContractDrift = {
    addedTools: [],
    removedTools: [],
    addedArgs: [],
    removedArgs: [],
  };

  for (const name of Object.keys(derived)) {
    if (!(name in recorded)) {
      drift.addedTools.push(name);
      continue;
    }
    const before = new Set(recorded[name]);
    const after = new Set(derived[name]);
    for (const arg of after) if (!before.has(arg)) drift.addedArgs.push(`${name}.${arg}`);
    for (const arg of before) if (!after.has(arg)) drift.removedArgs.push(`${name}.${arg}`);
  }
  for (const name of Object.keys(recorded)) {
    if (!(name in derived)) drift.removedTools.push(name);
  }

  return drift;
};
