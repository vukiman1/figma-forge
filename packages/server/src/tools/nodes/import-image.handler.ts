import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { IMPORT_IMAGE_TOOL_NAME, SET_IMAGE_FILL_TOOL_NAME } from '@figma-forge/core';

export const IMAGE_PATH_TOOLS: ReadonlySet<string> = new Set([
  IMPORT_IMAGE_TOOL_NAME,
  SET_IMAGE_FILL_TOOL_NAME,
]);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47] as const;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const GIF_SIGNATURE = [0x47, 0x49, 0x46, 0x38] as const;
const IMAGE_SIGNATURES: readonly (readonly number[])[] = [
  PNG_SIGNATURE,
  JPEG_SIGNATURE,
  GIF_SIGNATURE,
];
const HEADER_BYTES = 8;
const MAX_FILE_BYTES = 72 * 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSupportedImage = (bytes: Uint8Array): boolean =>
  IMAGE_SIGNATURES.some(signature => signature.every((byte, index) => bytes[index] === byte));

const megabytes = (bytes: number): string => (bytes / 1024 / 1024).toFixed(1);

const readImageHeader = async (
  file: string,
  tool: string,
): Promise<{ header: Buffer; size: number }> => {
  const header = Buffer.alloc(HEADER_BYTES);
  const handle = await open(file, 'r');
  try {
    const stats = await handle.stat();
    if (stats.isDirectory()) throw new Error(`${tool}: ${file} is a directory, not an image file`);
    await handle.read(header, 0, HEADER_BYTES, 0);
    return { header, size: stats.size };
  } finally {
    await handle.close();
  }
};

const validateImage = (file: string, tool: string, header: Buffer, size: number): void => {
  if (!isSupportedImage(header)) {
    throw new Error(`${tool}: ${file} is not a PNG, JPEG or GIF image`);
  }
  if (size <= MAX_FILE_BYTES) return;
  throw new Error(
    `${tool}: ${file} is ${megabytes(size)}MB, over the ${megabytes(MAX_FILE_BYTES)}MB a ` +
      'single relay message can carry once base64-encoded — downscale or re-compress the file.',
  );
};

export const resolveImagePath = async (
  args: Record<string, unknown>,
  tool: string = IMPORT_IMAGE_TOOL_NAME,
): Promise<Record<string, unknown>> => {
  const { path, ...rest } = args;
  if (path === undefined) return args;
  if (typeof path !== 'string') throw new Error(`${tool}: path must be a string`);
  if (rest.data !== undefined || rest.url !== undefined) {
    throw new Error(`${tool}: provide exactly one of path, data or url`);
  }
  const file = resolve(path);
  const { header, size } = await readImageHeader(file, tool);
  validateImage(file, tool, header, size);
  const bytes = await readFile(file);
  return { ...rest, data: bytes.toString('base64') };
};

export const importImageError = (
  error: unknown,
  path: unknown,
  tool: string = IMPORT_IMAGE_TOOL_NAME,
): unknown => {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof path !== 'string' || !/too large/i.test(message)) return error;
  return new Error(
    `${tool}: Figma refused ${resolve(path)} (${message}). createImage accepts at most ` +
      '4096px in width and height — downscale the image, or place it at full resolution outside ' +
      'Figma and import a view that fits.',
    { cause: error },
  );
};

const resolveBatchOperation = async (operation: unknown): Promise<unknown> => {
  if (!isRecord(operation)) return operation;
  const { tool, params } = operation;
  if (typeof tool !== 'string' || !IMAGE_PATH_TOOLS.has(tool) || !isRecord(params)) {
    return operation;
  }
  return { ...operation, params: await resolveImagePath(params, tool) };
};

export const resolveBatchImagePaths = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  if (!Array.isArray(args.ops)) return args;
  return { ...args, ops: await Promise.all(args.ops.map(resolveBatchOperation)) };
};
