import type { HandlerFactories } from '../handler-factories.js';
import { createAddVariableModeHandler } from './add-variable-mode.handler.js';
import { createBindVariableToNodeHandler } from './bind-variable-to-node.handler.js';
import { createBindVariableToPaintHandler } from './bind-variable-to-paint.handler.js';
import { createCreateVariableCollectionHandler } from './create-variable-collection.handler.js';
import { createCreateVariableHandler } from './create-variable.handler.js';
import { createDeleteVariableCollectionHandler } from './delete-variable-collection.handler.js';
import { createDeleteVariableModeHandler } from './delete-variable-mode.handler.js';
import { createDeleteVariableHandler } from './delete-variable.handler.js';
import { createGetVariableDefsHandler } from './get-variable-defs.handler.js';
import { createImportVariableHandler } from './import-variable.handler.js';
import { createRenameVariableHandler } from './rename-variable.handler.js';
import { createSetNodeVariableModeHandler } from './set-node-variable-mode.handler.js';
import { createSetVariableCodeSyntaxHandler } from './set-variable-code-syntax.handler.js';
import { createSetVariableValueHandler } from './set-variable-value.handler.js';
import { createUpdateVariableCollectionHandler } from './update-variable-collection.handler.js';

export const VARIABLES_WRITES: HandlerFactories = {
  create_variable_collection: createCreateVariableCollectionHandler,
  update_variable_collection: createUpdateVariableCollectionHandler,
  add_variable_mode: createAddVariableModeHandler,
  create_variable: createCreateVariableHandler,
  set_variable_value: createSetVariableValueHandler,
  bind_variable_to_node: createBindVariableToNodeHandler,
  bind_variable_to_paint: createBindVariableToPaintHandler,
  import_variable: createImportVariableHandler,
  set_node_variable_mode: createSetNodeVariableModeHandler,
  rename_variable: createRenameVariableHandler,
  set_variable_code_syntax: createSetVariableCodeSyntaxHandler,
  delete_variable: createDeleteVariableHandler,
  delete_variable_mode: createDeleteVariableModeHandler,
  delete_variable_collection: createDeleteVariableCollectionHandler,
};

export const VARIABLES_READS: HandlerFactories = {
  get_variable_defs: createGetVariableDefsHandler,
};
