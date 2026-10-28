import type { HandlerFactories } from '../handler-factories.js';
import { createGetReactionsHandler } from './get-reactions.handler.js';
import { createRemoveReactionsHandler } from './remove-reactions.handler.js';
import { createSetReactionsHandler } from './set-reactions.handler.js';
import { createUpdateFlowsHandler } from './update-flows.handler.js';

export const PROTOTYPE_WRITES: HandlerFactories = {
  set_reactions: createSetReactionsHandler,
  remove_reactions: createRemoveReactionsHandler,
  update_flows: createUpdateFlowsHandler,
};

export const PROTOTYPE_READS: HandlerFactories = {
  get_reactions: createGetReactionsHandler,
};
