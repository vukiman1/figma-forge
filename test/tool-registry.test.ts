import { describe, expect, it } from 'vitest';

import { BATCHABLE_TOOLS } from '../packages/plugin/src/features/batch/inverses.js';
import { NON_BATCHABLE } from '../packages/plugin/src/features/batch/non-batchable.js';
import { createSandboxHandlers } from '../packages/plugin/src/features/sandbox-handlers.js';
import {
  ALL_TOOL_SPECS,
  WRITE_TOOL_NAMES,
} from '../packages/server/src/tools/registry/registry.js';
import { WIRE_TOOL_SCHEMAS } from '../packages/server/src/tools/wire/wire-schema.js';
import { toToolDefinition } from '../packages/server/test/tools/registry/tool-schema.js';

const SERVER_ONLY_TOOLS = new Set([
  'save_screenshots',
  'use_file',
  'analyze_project',
  'scan_components',
  'component_map',
  'token_map',
  'icon_map',
  'design_diff',
]);

const serverNames = ALL_TOOL_SPECS.map(s => s.name);
const dispatchedNames = serverNames.filter(n => !SERVER_ONLY_TOOLS.has(n));
const handlerKeys = Object.keys(createSandboxHandlers({} as never));

const isTyped = (schema: unknown): boolean => {
  const s = schema as { type?: unknown; anyOf?: unknown[]; oneOf?: unknown[] };
  if (s.type !== undefined) return true;
  const union = s.anyOf ?? s.oneOf;
  return Array.isArray(union) && union.length > 0 && union.every(isTyped);
};

const missingType = (schema: unknown, path: string, out: string[]): void => {
  const s = schema as {
    properties?: Record<string, unknown>;
    items?: unknown;
    anyOf?: unknown[];
    oneOf?: unknown[];
  };
  if (s.properties) {
    for (const [key, prop] of Object.entries(s.properties)) {
      if (!isTyped(prop)) out.push(`${path}.${key}`);
      missingType(prop, `${path}.${key}`, out);
    }
  }
  if (s.items) missingType(s.items, `${path}[]`, out);
  for (const member of s.anyOf ?? s.oneOf ?? []) missingType(member, `${path}|`, out);
};

describe('tool registry', () => {
  it('server-dispatched tools and plugin handlers are exactly in sync', () => {
    const onlyServer = dispatchedNames.filter(n => !handlerKeys.includes(n));
    const onlyPlugin = handlerKeys.filter(n => !serverNames.includes(n));
    expect({ onlyServer, onlyPlugin }).toEqual({ onlyServer: [], onlyPlugin: [] });
  });

  it('every server-only tool is still advertised (and stays a known exception)', () => {
    for (const name of SERVER_ONLY_TOOLS) expect(serverNames).toContain(name);
  });

  it('has no duplicate tool names', () => {
    expect(new Set(serverNames).size).toBe(serverNames.length);
    expect(new Set(handlerKeys).size).toBe(handlerKeys.length);
  });

  it('every write tool is advertised and has a handler', () => {
    const writes = [...WRITE_TOOL_NAMES];
    expect(writes.filter(n => !serverNames.includes(n))).toEqual([]);
    expect(writes.filter(n => !handlerKeys.includes(n))).toEqual([]);
  });

  it('every delete_* tool declares destructive, and destructive only appears on writes', () => {
    const unflaggedDeletes = ALL_TOOL_SPECS.filter(
      s => s.name.startsWith('delete_') && s.destructive !== true,
    ).map(s => s.name);
    const nonWriteDestructive = ALL_TOOL_SPECS.filter(
      s => s.destructive === true && s.kind !== 'write',
    ).map(s => s.name);
    expect({ unflaggedDeletes, nonWriteDestructive }).toEqual({
      unflaggedDeletes: [],
      nonWriteDestructive: [],
    });
  });

  it('every input schema property declares a type (no untyped polymorphic params)', () => {
    const offenders: string[] = [];
    for (const spec of ALL_TOOL_SPECS) {
      missingType(toToolDefinition(spec).inputSchema, spec.name, offenders);
    }
    expect(offenders).toEqual([]);
  });
});

describe('batchable ops', () => {
  it('every tool a batch may name has a wire schema on the server', () => {
    const undescribed = BATCHABLE_TOOLS.filter(name => !WIRE_TOOL_SCHEMAS.has(name));
    expect(undescribed).toEqual([]);
    expect(BATCHABLE_TOOLS.length).toBeGreaterThan(0);
  });

  it('every write tool is decided: batchable, or refused with a reason', () => {
    const writes = [...WRITE_TOOL_NAMES].filter(name => name !== 'batch');
    const batchable = new Set(BATCHABLE_TOOLS);
    const refused = new Set(Object.keys(NON_BATCHABLE));
    expect({
      undecided: writes.filter(name => !batchable.has(name) && !refused.has(name)),
      both: writes.filter(name => batchable.has(name) && refused.has(name)),
    }).toEqual({ undecided: [], both: [] });
  });

  it('names only real write tools on either side, and never batch itself', () => {
    const writes = new Set(WRITE_TOOL_NAMES);
    expect(BATCHABLE_TOOLS.filter(name => !writes.has(name))).toEqual([]);
    expect(Object.keys(NON_BATCHABLE).filter(name => !writes.has(name))).toEqual([]);
    expect(BATCHABLE_TOOLS).not.toContain('batch');
  });

  it('gives every refusal a reason a caller can act on', () => {
    const thin = Object.entries(NON_BATCHABLE).filter(([, why]) => why.trim().length < 30);
    expect(thin).toEqual([]);
  });
});
