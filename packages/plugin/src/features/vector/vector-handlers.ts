import type { HandlerFactories } from '../handler-factories.js';
import { createCreateVectorHandler } from './create-vector.handler.js';
import { createGetVectorHandler } from './get-vector.handler.js';
import { createOutlineStrokeHandler } from './outline-stroke.handler.js';
import { createSetVectorHandler } from './set-vector.handler.js';

export const VECTOR_WRITES: HandlerFactories = {
  create_vector: createCreateVectorHandler,
  set_vector: createSetVectorHandler,
  outline_stroke: createOutlineStrokeHandler,
};

export const VECTOR_READS: HandlerFactories = {
  get_vector: createGetVectorHandler,
};
