import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { EXPORT_PDF_TOOL_NAME, exportPdfParams } from '@figma-forge/core';
import { type ExportPdfResult, type PdfExport } from '@figma-forge/core';

import { binaryPayload } from './binary-payload.js';

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

/**
 * Land the exported PDF bytes on the server filesystem. Pure-fs and dispatch-free so it can be
 * unit-tested against a temp directory.
 */
export const writeExportedPdf = async (
  outPath: string,
  pdf: PdfExport,
): Promise<ExportPdfResult> => {
  const empty = pdf.empty === true ? { empty: true } : {};
  const payload = binaryPayload(pdf);
  if (payload === null) return { nodeId: pdf.nodeId, path: null, ...empty };
  const path = resolve(outPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, payload);
  return { nodeId: pdf.nodeId, path, ...empty };
};

/** Reuses the plugin-side export_pdf handler to fetch the PDF bytes, then writes them to disk. */
export const handleExportPdf = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<ExportPdfResult> => {
  const args = exportPdfParams.parse(rawArgs);
  const pluginArgs: Record<string, unknown> = {};
  // These bytes go to disk, never to a model, so they ride the wire as a msgpack `bin`.
  pluginArgs.binary = true;
  if (args.nodeId !== undefined) pluginArgs.nodeId = args.nodeId;
  const pdf = (await dispatch(EXPORT_PDF_TOOL_NAME, pluginArgs)) as PdfExport;
  return writeExportedPdf(args.outPath, pdf);
};
