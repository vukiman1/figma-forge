import type { HandlerFactories } from '../handler-factories.js';
import { createAddComponentPropertyHandler } from './add-component-property.handler.js';
import { createBindComponentPropertyHandler } from './bind-component-property.handler.js';
import { createCombineAsVariantsHandler } from './combine-as-variants.handler.js';
import { createCreateComponentHandler } from './create-component.handler.js';
import { createCreateInstanceHandler } from './create-instance.handler.js';
import { createDeleteComponentPropertyHandler } from './delete-component-property.handler.js';
import { createDetachInstanceHandler } from './detach-instance.handler.js';
import { createEditComponentPropertyHandler } from './edit-component-property.handler.js';
import { createGetComponentApiHandler } from './get-component-api.handler.js';
import { createGetLocalComponentsHandler } from './get-local-components.handler.js';
import { createSetInstancePropertiesHandler } from './set-instance-properties.handler.js';
import { createSwapComponentHandler } from './swap-component.handler.js';

export const COMPONENTS_WRITES: HandlerFactories = {
  swap_component: createSwapComponentHandler,
  set_instance_properties: createSetInstancePropertiesHandler,
  add_component_property: createAddComponentPropertyHandler,
  bind_component_property: createBindComponentPropertyHandler,
  edit_component_property: createEditComponentPropertyHandler,
  delete_component_property: createDeleteComponentPropertyHandler,
  detach_instance: createDetachInstanceHandler,
  create_component: createCreateComponentHandler,
  create_instance: createCreateInstanceHandler,
  combine_as_variants: createCombineAsVariantsHandler,
};

export const COMPONENTS_READS: HandlerFactories = {
  get_local_components: createGetLocalComponentsHandler,
  get_component_api: createGetComponentApiHandler,
};
