import { BATCH_TOOL_NAME, ErrorCode, type ToolSpec } from '@figma-forge/core';
import { z } from 'zod';

import { ALL_TOOL_SPECS } from '../registry/registry.js';

const MAX_REPORTED_ISSUES = 3;

export interface WireRejection {
  code: ErrorCode;
  message: string;
}

const readField = (value: unknown, field: string): unknown =>
  typeof value === 'object' && value !== null ? Reflect.get(value, field) : undefined;

export const wireToolSchema = (spec: ToolSpec): z.ZodObject | null => {
  if (
    spec.kind === 'local' &&
    (spec.serverOnlyArgs === null || spec.serverOnlyArgs === undefined)
  ) {
    return null;
  }
  const shape: Record<string, z.ZodType> = { ...spec.inputSchema.shape };
  for (const key of spec.serverOnlyArgs ?? []) delete shape[key];
  for (const arg of spec.injectedArgs ?? []) shape[arg] = z.unknown().optional();
  if (spec.kind === 'write') shape.requestId = z.unknown().optional();
  return z.object(shape);
};

export const WIRE_TOOL_SCHEMAS: ReadonlyMap<string, z.ZodObject> = new Map(
  ALL_TOOL_SPECS.flatMap(spec => {
    const schema = wireToolSchema(spec);
    return schema === null ? [] : [[spec.name, schema] as const];
  }),
);

const summarizeIssues = (issues: readonly z.core.$ZodIssue[]): string => {
  const named = issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  const remaining = issues.length - MAX_REPORTED_ISSUES;
  return `${named}${remaining > 0 ? ` (+${remaining} more)` : ''}`;
};

const validateBatchOp = (op: unknown, index: number): WireRejection | null => {
  const tool = readField(op, 'tool');
  if (typeof tool !== 'string') return null;
  const schema = WIRE_TOOL_SCHEMAS.get(tool);
  if (schema === undefined) {
    return {
      code: ErrorCode.MethodNotFound,
      message: `batch ops[${index}]: '${tool}' has no sandbox handler`,
    };
  }
  const parsed = schema.safeParse(readField(op, 'params') ?? {});
  return parsed.success
    ? null
    : {
        code: ErrorCode.InvalidParams,
        message: `batch ops[${index}] ('${tool}'): ${summarizeIssues(parsed.error.issues)}`,
      };
};

export const checkBatchOps = (args: unknown): WireRejection | null => {
  const ops = readField(args, 'ops');
  if (!Array.isArray(ops)) return null;
  for (const [index, op] of ops.entries()) {
    const rejection = validateBatchOp(op, index);
    if (rejection !== null) return rejection;
  }
  return null;
};

export const checkWireCall = (toolName: string, args: unknown): WireRejection | null => {
  const schema = WIRE_TOOL_SCHEMAS.get(toolName);
  if (schema === undefined) {
    return { code: ErrorCode.MethodNotFound, message: `no tool named '${toolName}'` };
  }
  const parsed = schema.safeParse(args ?? {});
  if (!parsed.success) {
    return {
      code: ErrorCode.InvalidParams,
      message: `invalid arguments for '${toolName}' — ${summarizeIssues(parsed.error.issues)}`,
    };
  }
  return toolName === BATCH_TOOL_NAME ? checkBatchOps(args) : null;
};
