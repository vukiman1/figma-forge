export interface ExportCall {
  format: string;
  constraint?: { type: string; value: number };
  useAbsoluteBounds?: boolean;
}

export const fakeFigma = (
  lookup: Record<string, BaseNode | null>,
  calls: ExportCall[] = [],
): typeof figma =>
  ({
    base64Encode: (bytes: Uint8Array) => `b64(${bytes.length})`,
    getNodeByIdAsync: async (id: string) => lookup[id] ?? null,
    __calls: calls,
  }) as unknown as typeof figma;

export const exportable = (id: string, calls: ExportCall[]): BaseNode =>
  ({
    id,
    exportAsync: async (settings: ExportCall) => {
      calls.push(settings);
      return new Uint8Array([1, 2, 3]);
    },
  }) as unknown as BaseNode;
