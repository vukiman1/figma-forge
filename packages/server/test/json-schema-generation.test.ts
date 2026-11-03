import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ALL_TOOL_SPECS } from '../src/tools/registry/registry.js';
import { toToolDefinition } from './tool-schema.js';

const OPTIONS = { io: 'input', target: 'draft-2020-12' } as const;

const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

const asProperty = (schema: z.ZodType): unknown => {
  const json = z.toJSONSchema(z.object({ value: schema }), OPTIONS) as {
    properties: Record<string, unknown>;
  };
  return json.properties.value;
};

interface Canary {
  what: string;
  schema: z.ZodType;
  json: unknown;
}

const CANARIES: Canary[] = [
  { what: 'string', schema: z.string(), json: { type: 'string' } },
  {
    what: 'described string',
    schema: z.string().describe('d'),
    json: { type: 'string', description: 'd' },
  },
  {
    what: 'string with a length bound',
    schema: z.string().min(1),
    json: { type: 'string', minLength: 1 },
  },
  { what: 'number', schema: z.number(), json: { type: 'number' } },
  {
    what: 'number with an inclusive floor',
    schema: z.number().min(0),
    json: { type: 'number', minimum: 0 },
  },
  {
    what: 'number with an inclusive ceiling',
    schema: z.number().max(1),
    json: { type: 'number', maximum: 1 },
  },
  {
    what: 'number with an exclusive floor',
    schema: z.number().gt(0),
    json: { type: 'number', exclusiveMinimum: 0 },
  },
  {
    what: 'integer',
    schema: z.int(),
    json: { type: 'integer', minimum: -9007199254740991, maximum: 9007199254740991 },
  },
  { what: 'boolean', schema: z.boolean(), json: { type: 'boolean' } },
  { what: 'null', schema: z.null(), json: { type: 'null' } },
  { what: 'literal', schema: z.literal('LIT'), json: { type: 'string', const: 'LIT' } },
  { what: 'enum', schema: z.enum(['A', 'B']), json: { type: 'string', enum: ['A', 'B'] } },
  {
    what: 'array',
    schema: z.array(z.string()),
    json: { type: 'array', items: { type: 'string' } },
  },
  {
    what: 'array with a length bound',
    schema: z.array(z.string()).min(1),
    json: { minItems: 1, type: 'array', items: { type: 'string' } },
  },
  {
    what: 'array with an upper length bound',
    schema: z.array(z.string()).max(2),
    json: { maxItems: 2, type: 'array', items: { type: 'string' } },
  },
  {
    what: 'nullable scalar (union of bare types)',
    schema: z.string().nullable(),
    json: { type: ['string', 'null'] },
  },
  {
    what: 'union of two bare non-null types',
    schema: z.union([z.boolean(), z.string()]),
    json: { type: ['boolean', 'string'] },
  },
  {
    what: 'nullable with a check on the non-null member',
    schema: z.union([z.string().min(1), z.null()]),
    json: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
  },
  {
    what: 'record',
    schema: z.record(z.string(), z.string()),
    json: {
      type: 'object',
      propertyNames: { type: 'string' },
      additionalProperties: { type: 'string' },
    },
  },
  {
    what: 'record of unknown',
    schema: z.record(z.string(), z.unknown()),
    json: { type: 'object', propertyNames: { type: 'string' }, additionalProperties: {} },
  },
  {
    what: 'nested object',
    schema: z.object({ inner: z.string() }),
    json: { type: 'object', properties: { inner: { type: 'string' } }, required: ['inner'] },
  },
  {
    what: 'discriminated union',
    schema: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('a'), x: z.number() }),
      z.object({ kind: z.literal('b'), y: z.string() }),
    ]),
    json: {
      oneOf: [
        {
          type: 'object',
          properties: { kind: { type: 'string', const: 'a' }, x: { type: 'number' } },
          required: ['kind', 'x'],
        },
        {
          type: 'object',
          properties: { kind: { type: 'string', const: 'b' }, y: { type: 'string' } },
          required: ['kind', 'y'],
        },
      ],
    },
  },
];

const ENVELOPES: Canary[] = [
  {
    what: 'object with a required and an optional property',
    schema: z.object({ a: z.string(), b: z.number().optional() }),
    json: {
      $schema: DIALECT,
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      required: ['a'],
    },
  },
  {
    what: 'object taking no arguments',
    schema: z.object({}),
    json: { $schema: DIALECT, type: 'object', properties: {} },
  },
  {
    what: 'loose object',
    schema: z.looseObject({ a: z.string() }),
    json: {
      $schema: DIALECT,
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a'],
      additionalProperties: {},
    },
  },
];

const keywordsIn = (node: unknown, out: Set<string>): Set<string> => {
  if (Array.isArray(node)) {
    for (const item of node) keywordsIn(item, out);
    return out;
  }
  if (typeof node !== 'object' || node === null) return out;
  for (const [key, value] of Object.entries(node)) {
    out.add(key);

    if (key === 'enum' || key === 'required') continue;
    if (key === 'properties' || key === '$defs') {
      for (const sub of Object.values(value as Record<string, unknown>)) keywordsIn(sub, out);
    } else keywordsIn(value, out);
  }
  return out;
};

const typeValuesIn = (node: unknown, out: Set<string>): Set<string> => {
  if (Array.isArray(node)) {
    for (const item of node) typeValuesIn(item, out);
    return out;
  }
  if (typeof node !== 'object' || node === null) return out;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'type') {
      for (const t of Array.isArray(value) ? value : [value]) {
        if (typeof t === 'string') out.add(t);
      }
      continue;
    }
    if (key === 'enum' || key === 'required') continue;
    if (key === 'properties' || key === '$defs') {
      for (const sub of Object.values(value as Record<string, unknown>)) typeValuesIn(sub, out);
    } else typeValuesIn(value, out);
  }
  return out;
};

const advertised = ALL_TOOL_SPECS.map(spec => toToolDefinition(spec).inputSchema);

const pinned = [
  ...CANARIES.map(c => asProperty(c.schema)),
  ...ENVELOPES.map(e => z.toJSONSchema(e.schema, OPTIONS)),
];

describe('JSON Schema generation', () => {
  it.each(CANARIES)('renders $what', ({ schema, json }) => {
    expect(asProperty(schema)).toEqual(json);
  });

  it.each(ENVELOPES)('renders $what', ({ schema, json }) => {
    expect(z.toJSONSchema(schema, OPTIONS)).toEqual(json);
  });

  it('pins every JSON Schema keyword the advertised tools rely on', () => {
    const used = new Set<string>();
    for (const schema of advertised) keywordsIn(schema, used);
    const covered = new Set<string>();
    for (const schema of pinned) keywordsIn(schema, covered);

    expect([...used].filter(k => !covered.has(k)).toSorted()).toEqual([]);
  });

  it('pins every `type` value the advertised tools rely on', () => {
    const used = new Set<string>();
    for (const schema of advertised) typeValuesIn(schema, used);
    const covered = new Set<string>();
    for (const schema of pinned) typeValuesIn(schema, covered);

    expect([...used].filter(t => !covered.has(t)).toSorted()).toEqual([]);
  });
});
