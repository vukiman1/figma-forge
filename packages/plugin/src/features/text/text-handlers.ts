import type { HandlerFactories } from '../handler-factories.js';
import { createCreateTextPathHandler } from './create-text-path.handler.js';
import { createCreateTextHandler } from './create-text.handler.js';
import { createFindReplaceTextHandler } from './find-replace-text.handler.js';
import { createSetTextPathHandler } from './set-text-path.handler.js';
import { createSetTextPropertiesHandler } from './set-text-properties.handler.js';
import { createSetTextRangeHandler } from './set-text-range.handler.js';
import { createSetTextHandler } from './set-text.handler.js';

export const TEXT_WRITES: HandlerFactories = {
  set_text: createSetTextHandler,
  set_text_properties: createSetTextPropertiesHandler,
  set_text_range: createSetTextRangeHandler,
  create_text: createCreateTextHandler,
  create_text_path: createCreateTextPathHandler,
  set_text_path: createSetTextPathHandler,
  find_replace_text: createFindReplaceTextHandler,
};
