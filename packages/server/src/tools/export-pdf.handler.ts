import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { EXPORT_PDF_TOOL_NAME, exportPdfParams, PdfExportSchema } from '@figma-forge/core';
import { type ExportPdfResult, type PdfExport } from '@figma-forge/core';

import { binaryPayload } from './binary-payload.js';

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

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

export const handleExportPdf = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<ExportPdfResult> => {
  const args = exportPdfParams.parse(rawArgs);
  const pluginArgs: Record<string, unknown> = {};
  pluginArgs.binary = true;
  if (args.nodeId !== undefined) pluginArgs.nodeId = args.nodeId;
  const pdf = PdfExportSchema.parse(await dispatch(EXPORT_PDF_TOOL_NAME, pluginArgs));
  return writeExportedPdf(args.outPath, pdf);
};
