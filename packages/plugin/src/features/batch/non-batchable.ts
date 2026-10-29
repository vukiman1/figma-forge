export const NON_BATCHABLE: Readonly<Record<string, string>> = {
  import_variable:
    'a library import has no faithful inverse; import the variable before the batch and use its returned variableId',
  import_style:
    'a library import has no faithful inverse; import the style before the batch and use its returned styleId',
  delete_nodes: 'a deleted node cannot be brought back under its id',
  delete_page: 'a deleted page cannot be brought back under its id',
  delete_style:
    'a deleted style cannot be brought back under its id, and its consumers lose the link',
  delete_variable:
    'a deleted variable cannot be brought back under its id, and its bindings revert',
  delete_variable_mode:
    'adding a mode back mints a new mode id, so the value every variable held for the removed one does not return',
  delete_variable_collection:
    'a deleted collection cannot be brought back under its id, nor its variables and modes',
  delete_component_property:
    're-adding a property mints a new id, and the layers bound to the old one lose the binding',
  detach_instance: 'a detached instance is a plain frame that nothing can re-link to its component',
  boolean_nodes:
    'a boolean group takes its operands in as children, so undoing it means re-homing each one at its old index; run it outside the batch, then batch the edits around it',
  flatten_nodes:
    'flattening outlines the operands into a new vector and discards them, so there is nothing to restore; run it outside the batch',
  create_text_path:
    'the source shape is consumed and the text takes a new id, so the shape cannot come back under its own; run it outside the batch',
  ungroup_nodes: 'ungrouping deletes the group; grouping again makes a new group under a new id',
  remove_animation_style: 're-applying the preset mints a new applied-style id',
  remove_manual_keyframe_track:
    're-applying a removed track mints new track and keyframe ids (measured), so it cannot come back as it was',
};
