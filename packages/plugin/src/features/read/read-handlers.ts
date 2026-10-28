import type { HandlerFactories } from '../handler-factories.js';
import { createGetAnnotationsHandler } from './get-annotations.handler.js';
import { createGetFontsHandler } from './get-fonts.handler.js';
import { createGetNodeHandler } from './get-node.handler.js';
import { createGetNodesInfoHandler } from './get-nodes-info.handler.js';
import { createScanNodesByTypesHandler } from './scan-nodes-by-types.handler.js';
import { createScanTextNodesHandler } from './scan-text-nodes.handler.js';
import { createSearchNodesHandler } from './search-nodes.handler.js';

export const READ_READS: HandlerFactories = {
  get_node: createGetNodeHandler,
  get_nodes_info: createGetNodesInfoHandler,
  search_nodes: createSearchNodesHandler,
  scan_text_nodes: createScanTextNodesHandler,
  scan_nodes_by_types: createScanNodesByTypesHandler,
  get_fonts: createGetFontsHandler,
  get_annotations: createGetAnnotationsHandler,
};
