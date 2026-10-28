export type ExportPayload =
  | { readonly base64: null; readonly bytes: Uint8Array }
  | { readonly base64: string };

export const exportPayload = (
  figmaCtx: typeof figma,
  bytes: Uint8Array,
  isBinary: boolean,
): ExportPayload => (isBinary ? { base64: null, bytes } : { base64: figmaCtx.base64Encode(bytes) });

export const isExportable = (node: BaseNode): node is BaseNode & ExportMixin =>
  'exportAsync' in node;
