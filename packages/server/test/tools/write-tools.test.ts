import {
  BATCH_TOOL_NAME,
  batchTool,
  CLONE_NODE_TOOL_NAME,
  cloneNodeTool,
  CREATE_FRAME_TOOL_NAME,
  createFrameTool,
  CREATE_INSTANCE_TOOL_NAME,
  createInstanceTool,
  CREATE_RECTANGLE_TOOL_NAME,
  createRectangleTool,
  CREATE_TEXT_TOOL_NAME,
  createTextTool,
  DELETE_NODES_TOOL_NAME,
  deleteNodesTool,
  LOCK_NODES_TOOL_NAME,
  lockNodesTool,
  MOVE_NODES_TOOL_NAME,
  moveNodesTool,
  RENAME_NODE_TOOL_NAME,
  renameNodeTool,
  RESIZE_NODES_TOOL_NAME,
  resizeNodesTool,
  ROTATE_NODES_TOOL_NAME,
  rotateNodesTool,
  SET_AUTO_LAYOUT_TOOL_NAME,
  setAutoLayoutTool,
  SET_BLEND_MODE_TOOL_NAME,
  setBlendModeTool,
  SET_CONSTRAINTS_TOOL_NAME,
  setConstraintsTool,
  SET_CORNER_RADIUS_TOOL_NAME,
  setCornerRadiusTool,
  SET_FILLS_TOOL_NAME,
  setFillsTool,
  SET_MASK_TOOL_NAME,
  setMaskTool,
  SET_OPACITY_TOOL_NAME,
  setOpacityTool,
  SET_STROKES_TOOL_NAME,
  setStrokesTool,
  SET_TEXT_PROPERTIES_TOOL_NAME,
  setTextPropertiesTool,
  SET_TEXT_TOOL_NAME,
  setTextTool,
  SET_VARIABLE_CODE_SYNTAX_TOOL_NAME,
  setVariableCodeSyntaxTool,
  SET_VISIBLE_TOOL_NAME,
  setVisibleTool,
  UNLOCK_NODES_TOOL_NAME,
  unlockNodesTool,
} from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { toToolDefinition } from '../tool-schema.js';

const batchToolDefinition = toToolDefinition(batchTool);
const cloneNodeToolDefinition = toToolDefinition(cloneNodeTool);
const createFrameToolDefinition = toToolDefinition(createFrameTool);
const createInstanceToolDefinition = toToolDefinition(createInstanceTool);
const createRectangleToolDefinition = toToolDefinition(createRectangleTool);
const createTextToolDefinition = toToolDefinition(createTextTool);
const deleteNodesToolDefinition = toToolDefinition(deleteNodesTool);
const lockNodesToolDefinition = toToolDefinition(lockNodesTool);
const moveNodesToolDefinition = toToolDefinition(moveNodesTool);
const renameNodeToolDefinition = toToolDefinition(renameNodeTool);
const resizeNodesToolDefinition = toToolDefinition(resizeNodesTool);
const rotateNodesToolDefinition = toToolDefinition(rotateNodesTool);
const setAutoLayoutToolDefinition = toToolDefinition(setAutoLayoutTool);
const setBlendModeToolDefinition = toToolDefinition(setBlendModeTool);
const setConstraintsToolDefinition = toToolDefinition(setConstraintsTool);
const setCornerRadiusToolDefinition = toToolDefinition(setCornerRadiusTool);
const setFillsToolDefinition = toToolDefinition(setFillsTool);
const setMaskToolDefinition = toToolDefinition(setMaskTool);
const setOpacityToolDefinition = toToolDefinition(setOpacityTool);
const setStrokesToolDefinition = toToolDefinition(setStrokesTool);
const setTextPropertiesToolDefinition = toToolDefinition(setTextPropertiesTool);
const setTextToolDefinition = toToolDefinition(setTextTool);
const setVariableCodeSyntaxToolDefinition = toToolDefinition(setVariableCodeSyntaxTool);
const setVisibleToolDefinition = toToolDefinition(setVisibleTool);
const unlockNodesToolDefinition = toToolDefinition(unlockNodesTool);

describe('M2 write tool definitions', () => {
  it('set_fills requires nodeId + fills', () => {
    expect(setFillsToolDefinition.name).toBe(SET_FILLS_TOOL_NAME);
    expect(setFillsToolDefinition.inputSchema).toMatchObject({
      type: 'object',
      required: ['nodeId', 'fills'],
      properties: { nodeId: { type: 'string' }, fills: { type: 'array' } },
    });
  });

  it('set_text requires nodeId + characters', () => {
    expect(setTextToolDefinition.name).toBe(SET_TEXT_TOOL_NAME);
    expect(setTextToolDefinition.inputSchema).toMatchObject({
      type: 'object',
      required: ['nodeId', 'characters'],
      properties: { nodeId: { type: 'string' }, characters: { type: 'string' } },
    });
  });

  it('create_frame has no required input and declares parent/size props', () => {
    expect(createFrameToolDefinition.name).toBe(CREATE_FRAME_TOOL_NAME);
    expect(createFrameToolDefinition.inputSchema).toMatchObject({
      type: 'object',
      properties: {
        parentId: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    });
    // All inputs optional → Zod omits `required` entirely (vs an empty array).
    expect(createFrameToolDefinition.inputSchema.required).toBeUndefined();
  });

  it('set_opacity / set_visible / rename_node declare nodeId + their value, required', () => {
    expect(setOpacityToolDefinition.name).toBe(SET_OPACITY_TOOL_NAME);
    expect(setOpacityToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId', 'opacity'],
      properties: { opacity: { type: 'number', minimum: 0, maximum: 1 } },
    });
    expect(setVisibleToolDefinition.name).toBe(SET_VISIBLE_TOOL_NAME);
    expect(setVisibleToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId', 'visible'],
      properties: { visible: { type: 'boolean' } },
    });
    expect(renameNodeToolDefinition.name).toBe(RENAME_NODE_TOOL_NAME);
    expect(renameNodeToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId', 'name'],
      properties: { name: { type: 'string' } },
    });
  });

  it('delete_nodes requires a nodeIds string array', () => {
    expect(deleteNodesToolDefinition.name).toBe(DELETE_NODES_TOOL_NAME);
    expect(deleteNodesToolDefinition.inputSchema).toMatchObject({
      required: ['nodeIds'],
      properties: { nodeIds: { type: 'array', items: { type: 'string' } } },
    });
  });

  it('create_text / create_rectangle declare their inputs', () => {
    expect(createTextToolDefinition.name).toBe(CREATE_TEXT_TOOL_NAME);
    expect(createTextToolDefinition.inputSchema).toMatchObject({
      required: ['characters'],
      properties: { characters: { type: 'string' } },
    });
    expect(createRectangleToolDefinition.name).toBe(CREATE_RECTANGLE_TOOL_NAME);
    expect(createRectangleToolDefinition.inputSchema.required).toBeUndefined();
  });

  it('set_corner_radius / set_strokes / move_nodes / resize_nodes declare their inputs', () => {
    expect(setCornerRadiusToolDefinition.name).toBe(SET_CORNER_RADIUS_TOOL_NAME);
    expect(setCornerRadiusToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId'],
      properties: {
        radius: { type: 'number' },
        topLeftRadius: { type: 'number' },
        bottomRightRadius: { type: 'number' },
      },
    });
    expect(setStrokesToolDefinition.name).toBe(SET_STROKES_TOOL_NAME);
    expect(setStrokesToolDefinition.inputSchema).toMatchObject({ required: ['nodeId', 'strokes'] });
    expect(moveNodesToolDefinition.name).toBe(MOVE_NODES_TOOL_NAME);
    expect(moveNodesToolDefinition.inputSchema).toMatchObject({ required: ['nodeIds'] });
    expect(resizeNodesToolDefinition.name).toBe(RESIZE_NODES_TOOL_NAME);
    expect(resizeNodesToolDefinition.inputSchema).toMatchObject({
      required: ['nodeIds', 'width', 'height'],
    });
  });

  it('set_auto_layout / set_blend_mode / set_constraints / rotate_nodes / clone_node / lock+unlock declare inputs', () => {
    expect(setAutoLayoutToolDefinition.name).toBe(SET_AUTO_LAYOUT_TOOL_NAME);
    expect(setAutoLayoutToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId', 'layoutMode'],
      properties: {
        layoutMode: { enum: ['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID'] },
        // Pinned for the same reason as set_text_properties below: plugin-typings widened this
        // union in 1.137.0 (SPACE_EVENLY / SPACE_AROUND), and nothing else in the suite would
        // notice the list drifting from what Figma accepts.
        primaryAxisAlignItems: {
          enum: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN', 'SPACE_EVENLY', 'SPACE_AROUND'],
        },
      },
    });
    expect(setBlendModeToolDefinition.name).toBe(SET_BLEND_MODE_TOOL_NAME);
    expect(setBlendModeToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId', 'blendMode'],
    });
    expect(setConstraintsToolDefinition.name).toBe(SET_CONSTRAINTS_TOOL_NAME);
    expect(setConstraintsToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId', 'horizontal', 'vertical'],
    });
    expect(setMaskToolDefinition.name).toBe(SET_MASK_TOOL_NAME);
    expect(setMaskToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId', 'isMask'],
      properties: { maskType: { enum: ['ALPHA', 'VECTOR', 'LUMINANCE'] } },
    });
    expect(rotateNodesToolDefinition.name).toBe(ROTATE_NODES_TOOL_NAME);
    expect(rotateNodesToolDefinition.inputSchema).toMatchObject({
      required: ['nodeIds', 'rotation'],
    });
    expect(cloneNodeToolDefinition.name).toBe(CLONE_NODE_TOOL_NAME);
    expect(cloneNodeToolDefinition.inputSchema).toMatchObject({ required: ['nodeId'] });
    expect(lockNodesToolDefinition.name).toBe(LOCK_NODES_TOOL_NAME);
    expect(unlockNodesToolDefinition.name).toBe(UNLOCK_NODES_TOOL_NAME);
    for (const def of [lockNodesToolDefinition, unlockNodesToolDefinition]) {
      expect(def.inputSchema).toMatchObject({ required: ['nodeIds'] });
    }
  });

  it('create_instance takes componentId/componentKey + placement, none required', () => {
    expect(createInstanceToolDefinition.name).toBe(CREATE_INSTANCE_TOOL_NAME);
    expect(createInstanceToolDefinition.inputSchema).toMatchObject({
      type: 'object',
      properties: {
        componentId: { type: 'string' },
        componentKey: { type: 'string' },
        parentId: { type: 'string' },
      },
    });
    expect(createInstanceToolDefinition.inputSchema.required).toBeUndefined();
  });

  it('set_text_properties requires nodeId; truncation/maxLines/autoResize/paragraph/wrap optional', () => {
    // The enums are pinned here on purpose: widening one to a bare string is invisible to the other
    // gates — plugin-contract.json records argument *names*, and the wire test derives the advertised
    // schema from this same spec, so both stay green while the model loses the value list.
    expect(setTextPropertiesToolDefinition.name).toBe(SET_TEXT_PROPERTIES_TOOL_NAME);
    expect(setTextPropertiesToolDefinition.inputSchema).toMatchObject({
      required: ['nodeId'],
      properties: {
        textTruncation: { enum: ['DISABLED', 'ENDING'] },
        maxLines: { type: ['number', 'null'] },
        textAutoResize: { enum: ['NONE', 'HEIGHT', 'WIDTH_AND_HEIGHT', 'TRUNCATE'] },
        paragraphSpacing: { type: 'number', minimum: 0 },
        paragraphIndent: { type: 'number', minimum: 0 },
        textWrapStyle: { enum: ['AUTO', 'BALANCE', 'PRETTY'] },
      },
    });
  });

  it('set_variable_code_syntax requires variableId + codeSyntax with nullable platform names', () => {
    expect(setVariableCodeSyntaxToolDefinition.name).toBe(SET_VARIABLE_CODE_SYNTAX_TOOL_NAME);
    expect(setVariableCodeSyntaxToolDefinition.inputSchema).toMatchObject({
      required: ['variableId', 'codeSyntax'],
      properties: {
        variableId: { type: 'string' },
        codeSyntax: {
          type: 'object',
          properties: {
            // string sets (non-empty), null removes — the set_text_properties partial idiom
            WEB: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
            ANDROID: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
            iOS: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
          },
        },
      },
    });
  });

  it('batch requires a non-empty ops array of { tool, params } and hides requestId', () => {
    expect(batchToolDefinition.name).toBe(BATCH_TOOL_NAME);
    expect(batchToolDefinition.inputSchema).toMatchObject({
      type: 'object',
      required: ['ops'],
      properties: {
        ops: {
          type: 'array',
          minItems: 1,
          items: { type: 'object', required: ['tool'], properties: { tool: { type: 'string' } } },
        },
      },
    });
    const props = batchToolDefinition.inputSchema.properties as Record<string, unknown>;
    expect(props.requestId).toBeUndefined();
  });

  it('write tools do not expose requestId in their MCP schema (server injects it)', () => {
    for (const def of [
      setFillsToolDefinition,
      setTextToolDefinition,
      createFrameToolDefinition,
      setOpacityToolDefinition,
      setVisibleToolDefinition,
      renameNodeToolDefinition,
      deleteNodesToolDefinition,
      createTextToolDefinition,
      createRectangleToolDefinition,
      setCornerRadiusToolDefinition,
      setStrokesToolDefinition,
      moveNodesToolDefinition,
      resizeNodesToolDefinition,
      setAutoLayoutToolDefinition,
      setBlendModeToolDefinition,
      setMaskToolDefinition,
      setConstraintsToolDefinition,
      rotateNodesToolDefinition,
      lockNodesToolDefinition,
      unlockNodesToolDefinition,
      cloneNodeToolDefinition,
    ]) {
      const props = def.inputSchema.properties as Record<string, unknown>;
      expect(props.requestId).toBeUndefined();
    }
  });
});
