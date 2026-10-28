import type { HandlerFactories } from '../handler-factories.js';
import { createExportPdfHandler } from './export-pdf.handler.js';
import { createExportVideoHandler } from './export-video.handler.js';
import { createGetScreenshotHandler } from './get-screenshot.handler.js';
import { createSaveImageFillsHandler } from './save-image-fills.handler.js';

export const EXPORT_READS: HandlerFactories = {
  get_screenshot: createGetScreenshotHandler,
  save_image_fills: createSaveImageFillsHandler,
  export_pdf: createExportPdfHandler,
  export_video: createExportVideoHandler,
};
