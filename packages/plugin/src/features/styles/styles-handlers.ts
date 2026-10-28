import type { HandlerFactories } from '../handler-factories.js';
import { createApplyStyleToNodeHandler } from './apply-style-to-node.handler.js';
import { createCreateEffectStyleHandler } from './create-effect-style.handler.js';
import { createCreateGridStyleHandler } from './create-grid-style.handler.js';
import { createCreatePaintStyleHandler } from './create-paint-style.handler.js';
import { createCreateTextStyleHandler } from './create-text-style.handler.js';
import { createDeleteStyleHandler } from './delete-style.handler.js';
import { createGetStylesHandler } from './get-styles.handler.js';
import { createImportStyleHandler } from './import-style.handler.js';
import { createUpdateEffectStyleHandler } from './update-effect-style.handler.js';
import { createUpdatePaintStyleHandler } from './update-paint-style.handler.js';
import { createUpdateTextStyleHandler } from './update-text-style.handler.js';

export const STYLES_WRITES: HandlerFactories = {
  create_paint_style: createCreatePaintStyleHandler,
  create_text_style: createCreateTextStyleHandler,
  create_effect_style: createCreateEffectStyleHandler,
  create_grid_style: createCreateGridStyleHandler,
  update_paint_style: createUpdatePaintStyleHandler,
  update_text_style: createUpdateTextStyleHandler,
  update_effect_style: createUpdateEffectStyleHandler,
  apply_style_to_node: createApplyStyleToNodeHandler,
  import_style: createImportStyleHandler,
  delete_style: createDeleteStyleHandler,
};

export const STYLES_READS: HandlerFactories = {
  get_styles: createGetStylesHandler,
};
