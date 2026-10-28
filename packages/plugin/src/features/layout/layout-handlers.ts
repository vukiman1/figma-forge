import type { HandlerFactories } from '../handler-factories.js';
import { createSetAutoLayoutHandler } from './set-auto-layout.handler.js';
import { createSetConstraintsHandler } from './set-constraints.handler.js';
import { createSetLayoutGridsHandler } from './set-layout-grids.handler.js';
import { createSetLayoutPropsHandler } from './set-layout-props.handler.js';

export const LAYOUT_WRITES: HandlerFactories = {
  set_auto_layout: createSetAutoLayoutHandler,
  set_layout_props: createSetLayoutPropsHandler,
  set_layout_grids: createSetLayoutGridsHandler,
  set_constraints: createSetConstraintsHandler,
};
