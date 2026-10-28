import { initialTextShape, pickDefined } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { errorMessage } from '../error-message.js';
import { createSetAutoLayoutHandler } from '../layout/set-auto-layout.handler.js';
import { createSetLayoutPropsHandler } from '../layout/set-layout-props.handler.js';
import { createSetCornerRadiusHandler } from '../paint/set-corner-radius.handler.js';
import { createSetFillsHandler } from '../paint/set-fills.handler.js';
import { createSetStrokesHandler } from '../paint/set-strokes.handler.js';
import { InvalidParamsError } from '../parse-params.js';
import { createSetTextPropertiesHandler } from '../text/set-text-properties.handler.js';

export type InitialProps = Readonly<Record<string, unknown>>;

interface Step {
  readonly label: string;
  readonly handler: (figmaCtx: typeof figma) => SandboxToolHandler;
  readonly args: Record<string, unknown> | undefined;
}

const STROKE_KEYS = ['strokes', 'strokeWeight', 'strokeAlign'] as const;
const LAYOUT_KEYS = ['layoutSizingHorizontal', 'layoutSizingVertical', 'clipsContent'] as const;
const TEXT_KEYS = Object.keys(initialTextShape);

const present = (args: Record<string, unknown>): Record<string, unknown> | undefined =>
  Object.keys(args).length === 0 ? undefined : args;

const stepsFor = (props: InitialProps): Step[] => [
  {
    label: 'fills',
    handler: createSetFillsHandler,
    args: props.fills === undefined ? undefined : { fills: props.fills },
  },
  {
    label: 'strokes',
    handler: createSetStrokesHandler,
    args: props.strokes === undefined ? undefined : pickDefined(props, STROKE_KEYS),
  },
  {
    label: 'cornerRadius',
    handler: createSetCornerRadiusHandler,
    args: props.cornerRadius === undefined ? undefined : { radius: props.cornerRadius },
  },
  {
    label: 'autoLayout',
    handler: createSetAutoLayoutHandler,
    args:
      typeof props.autoLayout === 'object' && props.autoLayout !== null
        ? { ...props.autoLayout }
        : undefined,
  },
  {
    label: 'layout',
    handler: createSetLayoutPropsHandler,
    args: present(pickDefined(props, LAYOUT_KEYS)),
  },
  {
    label: 'text',
    handler: createSetTextPropertiesHandler,
    args: present(pickDefined(props, TEXT_KEYS)),
  },
];

const requireStrokesForStrokeFields = (
  node: SceneNode,
  props: InitialProps,
  tool: string,
): void => {
  if (props.strokes !== undefined) return;
  if (props.strokeWeight === undefined && props.strokeAlign === undefined) return;
  node.remove();
  throw new InvalidParamsError(
    `${tool}: strokeWeight / strokeAlign need strokes — pass the stroke paints too (the new ` +
      'layer was removed)',
  );
};

const runStep = async (
  figmaCtx: typeof figma,
  node: SceneNode,
  step: Step,
  tool: string,
): Promise<void> => {
  try {
    await step.handler(figmaCtx)({ nodeId: node.id, ...step.args });
  } catch (error) {
    node.remove();
    throw new Error(`${tool}: ${step.label} — ${errorMessage(error)} (the new layer was removed)`, {
      cause: error,
    });
  }
};

export const applyInitialProps = async (
  figmaCtx: typeof figma,
  node: SceneNode,
  props: InitialProps,
  tool: string,
): Promise<void> => {
  requireStrokesForStrokeFields(node, props, tool);
  for (const step of stepsFor(props).filter(candidate => candidate.args !== undefined)) {
    // oxlint-disable-next-line no-await-in-loop -- each step builds on the one before
    await runStep(figmaCtx, node, step, tool);
  }
};
