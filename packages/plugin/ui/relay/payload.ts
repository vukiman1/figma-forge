export interface ActivityPayload {
  preview: string;
  bytes: number;
  truncated: boolean;
}

export const LONG_STRING_THRESHOLD = 1024;
export const PREVIEW_CAP = 100_000;

const PRETTY_PRINT_INDENT = 2;

interface Elider {
  readonly replacer: (key: string, value: unknown) => unknown;
  readonly binaryBytes: () => number;
}

const byteLength = (s: string): number =>
  typeof TextEncoder === 'undefined' ? s.length : new TextEncoder().encode(s).length;

const makeElider = (): Elider => {
  let binary = 0;
  const replacer = (_key: string, value: unknown): unknown => {
    if (ArrayBuffer.isView(value)) {
      binary += value.byteLength;
      return `‹${value.byteLength.toLocaleString()} bytes elided›`;
    }
    if (typeof value === 'string' && value.length > LONG_STRING_THRESHOLD) {
      return `‹${value.length.toLocaleString()} chars elided›`;
    }
    return value;
  };
  return { replacer, binaryBytes: () => binary };
};

const measureBytes = (result: unknown): number => {
  const sizer = makeElider();
  try {
    const sized = JSON.stringify(result, (key, value) =>
      typeof value === 'string' ? value : sizer.replacer(key, value),
    );
    return byteLength(sized ?? String(result)) + sizer.binaryBytes();
  } catch {
    return 0;
  }
};

const renderPreview = (result: unknown): string => {
  try {
    return JSON.stringify(result, makeElider().replacer, PRETTY_PRINT_INDENT) ?? String(result);
  } catch {
    return String(result);
  }
};

export const summarizePayload = (result: unknown): ActivityPayload => {
  const bytes = measureBytes(result);
  const json = renderPreview(result);
  const truncated = json.length > PREVIEW_CAP;
  const preview = truncated ? `${json.slice(0, PREVIEW_CAP)}\n… (truncated for display)` : json;
  return { preview, bytes, truncated };
};
