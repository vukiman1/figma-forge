import { z } from 'zod';

export const PLUGIN_BRIDGE_TAG = '@figma-forge/bridge';

const baseFields = {
  tag: z.literal(PLUGIN_BRIDGE_TAG),
  id: z.string(),
};

export const PluginToolCallSchema = z.object({
  ...baseFields,
  kind: z.literal('tool-call'),
  method: z.string(),
  params: z.unknown().optional(),
});

export const PluginToolResultSchema = z.object({
  ...baseFields,
  kind: z.literal('tool-result'),
  result: z.unknown().optional(),
});

export const PluginToolErrorSchema = z.object({
  ...baseFields,
  kind: z.literal('tool-error'),
  code: z.string(),
  message: z.string(),
});

export const PluginBridgeMessageSchema = z.discriminatedUnion('kind', [
  PluginToolCallSchema,
  PluginToolResultSchema,
  PluginToolErrorSchema,
]);

export type PluginToolCall = z.infer<typeof PluginToolCallSchema>;
export type PluginToolResult = z.infer<typeof PluginToolResultSchema>;
export type PluginToolError = z.infer<typeof PluginToolErrorSchema>;
export type PluginBridgeMessage = z.infer<typeof PluginBridgeMessageSchema>;

export class PluginToolFailure extends Error {
  override readonly name = 'PluginToolFailure';

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const createToolCall = (input: {
  id: string;
  method: string;
  params?: unknown;
}): PluginToolCall => ({
  tag: PLUGIN_BRIDGE_TAG,
  kind: 'tool-call',
  id: input.id,
  method: input.method,
  ...(input.params === undefined ? {} : { params: input.params }),
});

export const createToolResult = (input: { id: string; result?: unknown }): PluginToolResult => ({
  tag: PLUGIN_BRIDGE_TAG,
  kind: 'tool-result',
  id: input.id,
  ...(input.result === undefined ? {} : { result: input.result }),
});

export const createToolError = (input: {
  id: string;
  code: string;
  message: string;
}): PluginToolError => ({
  tag: PLUGIN_BRIDGE_TAG,
  kind: 'tool-error',
  id: input.id,
  code: input.code,
  message: input.message,
});

const hasBridgeTag = (raw: unknown): boolean =>
  typeof raw === 'object' && raw !== null && 'tag' in raw && raw.tag === PLUGIN_BRIDGE_TAG;

export const isPluginBridgeMessage = (raw: unknown): raw is PluginBridgeMessage => {
  if (!hasBridgeTag(raw)) return false;
  return PluginBridgeMessageSchema.safeParse(raw).success;
};

export const SELECTION_DETAIL_LIMIT = 25;

export const SelectionItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  width: z.number(),
  height: z.number(),
});

export const PluginContextEventSchema = z.object({
  tag: z.literal(PLUGIN_BRIDGE_TAG),
  kind: z.literal('context'),
  fileName: z.string(),
  pageId: z.string(),
  pageName: z.string(),
  selectionCount: z.number(),
  selection: z.array(SelectionItemSchema),
  editorType: z.string(),
  mode: z.string(),
  apiVersion: z.string(),
});
export type PluginContextEvent = z.infer<typeof PluginContextEventSchema>;

export const createPluginContextEvent = (
  input: Omit<PluginContextEvent, 'tag' | 'kind'>,
): PluginContextEvent => ({ tag: PLUGIN_BRIDGE_TAG, kind: 'context', ...input });

export const isPluginContextEvent = (raw: unknown): raw is PluginContextEvent => {
  if (!hasBridgeTag(raw)) return false;
  return PluginContextEventSchema.safeParse(raw).success;
};
