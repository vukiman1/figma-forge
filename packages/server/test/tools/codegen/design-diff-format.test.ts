import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GetDesignContextResultSchema } from '@figma-forge/core';
import { expect, it } from 'vitest';
import { z } from 'zod';

import { SNAPSHOT_FORMAT_VERSION } from '../../../src/tools/codegen/design-diff.handler.js';

const RECORD_PATH = join(dirname(fileURLToPath(import.meta.url)), 'design-diff-format.json');
const RERECORD = 'UPDATE_DESIGN_DIFF_FORMAT=1 pnpm test design-diff-format && pnpm format';

interface JsonNode {
  $ref?: string;
  $defs?: Record<string, JsonNode>;
  properties?: Record<string, JsonNode>;
  items?: JsonNode;
  additionalProperties?: JsonNode | boolean;
  anyOf?: JsonNode[];
  oneOf?: JsonNode[];
  allOf?: JsonNode[];
}

const fieldsOf = (json: JsonNode): string[] => {
  const defs = json.$defs ?? {};
  const fields = new Set<string>();
  const visited = new Set<string>();
  const walk = (node: JsonNode | boolean | undefined, path: string): void => {
    if (typeof node !== 'object') return;
    if (node.$ref !== undefined) {
      const name = node.$ref.split('/').at(-1)!;
      if (visited.has(name)) return;
      visited.add(name);
      walk(defs[name], path);
      return;
    }
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      const at = path === '' ? key : `${path}.${key}`;
      fields.add(at);
      walk(child, at);
    }
    walk(node.items, `${path}[]`);
    walk(node.additionalProperties, `${path}{}`);
    for (const branch of [...(node.anyOf ?? []), ...(node.oneOf ?? []), ...(node.allOf ?? [])]) {
      walk(branch, path);
    }
  };
  walk(json, '');
  return [...fields].toSorted();
};

const resultSchema = (): JsonNode =>
  z.toJSONSchema(GetDesignContextResultSchema, {
    unrepresentable: 'any',
    io: 'output',
  }) as JsonNode;

const capturedFields = (): string[] => fieldsOf(resultSchema());

interface Recorded {
  version: number;
  fields: string[];
}

const current: Recorded = { version: SNAPSHOT_FORMAT_VERSION, fields: capturedFields() };

if (process.env.UPDATE_DESIGN_DIFF_FORMAT === '1') {
  writeFileSync(RECORD_PATH, `${JSON.stringify(current, null, 2)}\n`);
}
if (!existsSync(RECORD_PATH)) {
  throw new Error(`${RECORD_PATH} is missing — it is committed; restore it, or: ${RERECORD}`);
}
const recorded = JSON.parse(readFileSync(RECORD_PATH, 'utf8')) as Recorded;

it('walks the real result shape', () => {
  expect(current.fields).toEqual(
    expect.arrayContaining(['nodes', 'globalVars', 'nodes[].id', 'nodes[].children']),
  );
});

it("does not depend on Zod's names for its definitions", () => {
  const json = resultSchema();
  const renamed = JSON.parse(
    JSON.stringify(json).replaceAll(
      /"(#\/\$defs\/)?(__schema\d+)"/g,
      (_m, ref: string | undefined, name: string) => `"${ref ?? ''}renamed_${name}"`,
    ),
  ) as JsonNode;
  expect(Object.keys(renamed.$defs ?? {})).not.toEqual(Object.keys(json.$defs ?? {}));
  expect(fieldsOf(renamed)).toEqual(fieldsOf(json));
});

it('versions every change to what a baseline captures', () => {
  const added = current.fields.filter(f => !recorded.fields.includes(f));
  const removed = recorded.fields.filter(f => !current.fields.includes(f));
  const report =
    added.length === 0 && removed.length === 0 && recorded.version === current.version
      ? ''
      : [
          'The shape design_diff saves as a baseline changed. Decide, then re-record:',
          ...added.map(f => `  + ${f}`),
          ...removed.map(f => `  - ${f}`),
          `  Recorded version: ${recorded.version}   SNAPSHOT_FORMAT_VERSION: ${current.version}`,
          '  A baseline without an added field reports it as a change on every node that has it:',
          '  bump SNAPSHOT_FORMAT_VERSION in src/tools/design-diff.ts so older baselines are',
          '  re-captured. Re-record without a bump only if the change can never appear in a diff.',
          `  Re-record with: ${RERECORD}`,
        ].join('\n');
  expect(report).toBe('');
});
