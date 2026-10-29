import {
  ADD_PAGE_TOOL_NAME,
  addPageParams,
  CLONE_NODE_TOOL_NAME,
  cloneNodeParams,
  CREATE_COMPONENT_TOOL_NAME,
  CREATE_ELLIPSE_TOOL_NAME,
  CREATE_FRAME_TOOL_NAME,
  CREATE_INSTANCE_TOOL_NAME,
  CREATE_RECTANGLE_TOOL_NAME,
  CREATE_SECTION_TOOL_NAME,
  CREATE_SHAPE_TOOL_NAME,
  CREATE_TEXT_TOOL_NAME,
  CREATE_VECTOR_TOOL_NAME,
  createComponentParams,
  createEllipseParams,
  createFrameParams,
  createInstanceParams,
  createRectangleParams,
  createSectionParams,
  createShapeParams,
  createTextParams,
  createVectorParams,
  IMPORT_IMAGE_TOOL_NAME,
  IMPORT_SVG_TOOL_NAME,
  importImageParams,
  importSvgParams,
} from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { createInverse, createSpec } from './create-inverse.js';

export const createFrameInverse: BatchInverse = createInverse(
  CREATE_FRAME_TOOL_NAME,
  createFrameParams,
);
export const createRectangleInverse: BatchInverse = createInverse(
  CREATE_RECTANGLE_TOOL_NAME,
  createRectangleParams,
);
export const createTextInverse: BatchInverse = createInverse(
  CREATE_TEXT_TOOL_NAME,
  createTextParams,
);
export const createEllipseInverse: BatchInverse = createInverse(
  CREATE_ELLIPSE_TOOL_NAME,
  createEllipseParams,
);
export const createShapeInverse: BatchInverse = createInverse(
  CREATE_SHAPE_TOOL_NAME,
  createShapeParams,
);
export const createSectionInverse: BatchInverse = createInverse(
  CREATE_SECTION_TOOL_NAME,
  createSectionParams,
);
export const importImageInverse: BatchInverse = createInverse(
  IMPORT_IMAGE_TOOL_NAME,
  importImageParams,
);
export const importSvgInverse: BatchInverse = createInverse(IMPORT_SVG_TOOL_NAME, importSvgParams);
export const createVectorInverse: BatchInverse = createInverse(
  CREATE_VECTOR_TOOL_NAME,
  createVectorParams,
);
export const createInstanceInverse: BatchInverse = createInverse(
  CREATE_INSTANCE_TOOL_NAME,
  createInstanceParams,
);
export const cloneNodeInverse: BatchInverse = createInverse(
  CLONE_NODE_TOOL_NAME,
  cloneNodeParams,
  false,
);
export const addPageInverse: BatchInverse = createInverse(ADD_PAGE_TOOL_NAME, addPageParams, false);

const COMPONENT_CREATE_SPEC = createSpec(CREATE_COMPONENT_TOOL_NAME);

export const createComponentInverse: BatchInverse = defineInverse(
  CREATE_COMPONENT_TOOL_NAME,
  createComponentParams,
  {
    ...COMPONENT_CREATE_SPEC,
    capture: async (figmaCtx, params) => {
      if (params.fromNodeId !== undefined) {
        throw new Error(
          `${batchTool(CREATE_COMPONENT_TOOL_NAME)}: fromNodeId is not batchable — componentizing a node consumes it and has no faithful inverse`,
        );
      }
      return COMPONENT_CREATE_SPEC.capture(figmaCtx, params);
    },
  },
);
