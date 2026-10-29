import type { ScreenshotFormat, ScreenshotImage } from '@figma-forge/core';

import { exportPayload } from './export-payload.js';
import { rasterSize, resolveScale, type ScaleRequest, type Size } from './screenshot-scale.js';

export interface ScreenshotOptions {
  readonly format: ScreenshotFormat;
  readonly isBinary: boolean;
  readonly scale: Omit<ScaleRequest, 'shouldFit'>;
}

interface ClipGeometry {
  readonly absoluteRenderBounds?: Size | null;
  readonly absoluteBoundingBox?: Size | null;
  readonly visible?: boolean;
}

type ExportableNode = BaseNode & ExportMixin & ClipGeometry;

interface ExportPlan {
  readonly box: Size | null | undefined;
  readonly shouldFit: boolean;
  readonly useAbsoluteBounds: boolean;
}

const exportSettings = (
  format: ScreenshotFormat,
  scale: number,
  useAbsoluteBounds: boolean,
): ExportSettings => {
  const bounds = useAbsoluteBounds ? { useAbsoluteBounds } : {};
  if (format === 'SVG') return { format, ...bounds };
  return { format, constraint: { type: 'SCALE', value: scale }, ...bounds };
};

const isRecoverable = (node: ClipGeometry): boolean => {
  const box = node.absoluteBoundingBox;
  return node.visible !== false && box != null && box.width > 0 && box.height > 0;
};

const exportAt = async (
  figmaCtx: typeof figma,
  node: ExportableNode,
  options: ScreenshotOptions,
  { box, shouldFit, useAbsoluteBounds }: ExportPlan,
): Promise<ScreenshotImage> => {
  const scale = resolveScale(box, { ...options.scale, shouldFit });
  const bytes = await node.exportAsync(exportSettings(options.format, scale, useAbsoluteBounds));
  const dims = options.format === 'SVG' ? null : rasterSize(box, scale);
  return {
    nodeId: node.id,
    format: options.format,
    ...exportPayload(figmaCtx, bytes, options.isBinary),
    ...dims,
  };
};

export const exportScreenshot = async (
  figmaCtx: typeof figma,
  node: ExportableNode,
  options: ScreenshotOptions,
): Promise<ScreenshotImage> => {
  if (node.absoluteRenderBounds !== null) {
    const box = node.absoluteRenderBounds ?? node.absoluteBoundingBox;
    return exportAt(figmaCtx, node, options, { box, shouldFit: true, useAbsoluteBounds: false });
  }
  const recoverable = isRecoverable(node);
  const image = await exportAt(figmaCtx, node, options, {
    box: node.absoluteBoundingBox,
    shouldFit: recoverable,
    useAbsoluteBounds: recoverable,
  });
  return recoverable ? { ...image, recovered: true } : { ...image, empty: true };
};
