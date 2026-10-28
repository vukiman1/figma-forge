import type { HandlerFactories } from '../handler-factories.js';
import { createAddPageHandler } from './add-page.handler.js';
import { createDeletePageHandler } from './delete-page.handler.js';
import { createGetDocumentHandler } from './get-document.handler.js';
import { createGetMetadataHandler } from './get-metadata.handler.js';
import { createGetPagesHandler } from './get-pages.handler.js';
import { createGetSelectionHandler } from './get-selection.handler.js';
import { createGetViewportHandler } from './get-viewport.handler.js';
import { createListFilesHandler } from './list-files.handler.js';
import { createNavigateToPageHandler } from './navigate-to-page.handler.js';
import { createPingHandler } from './ping.handler.js';
import { createRenamePageHandler } from './rename-page.handler.js';

export const FILES_WRITES: HandlerFactories = {
  add_page: createAddPageHandler,
  delete_page: createDeletePageHandler,
  rename_page: createRenamePageHandler,
  navigate_to_page: createNavigateToPageHandler,
};

export const FILES_READS: HandlerFactories = {
  ping: createPingHandler,
  get_selection: createGetSelectionHandler,
  get_document: createGetDocumentHandler,
  get_metadata: createGetMetadataHandler,
  get_pages: createGetPagesHandler,
  get_viewport: createGetViewportHandler,
  list_files: createListFilesHandler,
};
