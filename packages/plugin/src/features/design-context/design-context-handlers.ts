import type { HandlerFactories } from '../handler-factories.js';
import { createGetDesignContextHandler } from './get-design-context.handler.js';

export const DESIGN_CONTEXT_READS: HandlerFactories = {
  get_design_context: createGetDesignContextHandler,
};
