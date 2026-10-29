import { COMPONENTS_WRITES, COMPONENTS_READS } from './components/components-handlers.js';
import { DESIGN_CONTEXT_READS } from './design-context/design-context-handlers.js';
import { EXPORT_READS } from './export/export-handlers.js';
import { FILES_WRITES, FILES_READS } from './files/files-handlers.js';
import type { HandlerFactories } from './handler-factories.js';
import { LAYOUT_WRITES } from './layout/layout-handlers.js';
import { MOTION_WRITES, MOTION_READS } from './motion/motion-handlers.js';
import { NODES_WRITES } from './nodes/nodes-handlers.js';
import { PAINT_WRITES } from './paint/paint-handlers.js';
import { PROTOTYPE_WRITES, PROTOTYPE_READS } from './prototype/prototype-handlers.js';
import { READ_READS } from './read/read-handlers.js';
import { STYLES_WRITES, STYLES_READS } from './styles/styles-handlers.js';
import { TEXT_WRITES } from './text/text-handlers.js';
import { VARIABLES_WRITES, VARIABLES_READS } from './variables/variables-handlers.js';
import { VECTOR_WRITES, VECTOR_READS } from './vector/vector-handlers.js';

export const WRITE_HANDLERS: HandlerFactories = {
  ...COMPONENTS_WRITES,
  ...FILES_WRITES,
  ...LAYOUT_WRITES,
  ...MOTION_WRITES,
  ...NODES_WRITES,
  ...PAINT_WRITES,
  ...PROTOTYPE_WRITES,
  ...STYLES_WRITES,
  ...TEXT_WRITES,
  ...VARIABLES_WRITES,
  ...VECTOR_WRITES,
};

export const READ_HANDLERS: HandlerFactories = {
  ...COMPONENTS_READS,
  ...DESIGN_CONTEXT_READS,
  ...EXPORT_READS,
  ...FILES_READS,
  ...MOTION_READS,
  ...PROTOTYPE_READS,
  ...READ_READS,
  ...STYLES_READS,
  ...VARIABLES_READS,
  ...VECTOR_READS,
};
