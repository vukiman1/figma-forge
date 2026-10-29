import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { GetReactionsResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createGetReactionsHandler } from '../../../src/features/prototype/get-reactions.handler.js';
import { createSetReactionsHandler } from '../../../src/features/prototype/set-reactions.handler.js';

const resolve = createRequire(import.meta.url).resolve;
const TYPINGS = readFileSync(resolve('@figma/plugin-typings/plugin-api.d.ts'), 'utf8');

const fieldsOf = (decl: string): string[] => {
  const start = TYPINGS.indexOf(`\n${decl}`);
  if (start === -1) throw new Error(`plugin-api.d.ts has no '${decl}' — the typings moved`);
  const body = TYPINGS.slice(start + 1);
  const end = body.search(/\n(?:\/\*\*|type |interface |declare )/);
  const region = end === -1 ? body : body.slice(0, end);
  const names = [...region.matchAll(/^\s+(?:readonly\s+)?([A-Za-z_]\w*)\??:/gm)].map(m => m[1]!);
  return [...new Set(names)];
};

const TRIGGER_FIELDS = fieldsOf('type Trigger =');
const ACTION_FIELDS = fieldsOf('type Action =');
const TRANSITION_FIELDS = [
  ...new Set([
    ...fieldsOf('interface SimpleTransition {'),
    ...fieldsOf('interface DirectionalTransition {'),
  ]),
];
const EASING_FIELDS = fieldsOf('interface Easing {');

const fill = (
  fields: readonly string[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> =>
  Object.fromEntries(fields.map(name => [name, overrides[name] ?? `<${name}>`]));

const reactionWithEveryField = () => ({
  trigger: fill(TRIGGER_FIELDS, {
    type: 'ON_KEY_DOWN',
    keyCodes: [65, 66],
    delay: 0.2,
    timeout: 1.5,
    mediaHitTime: 3,
    deprecatedVersion: false,
  }),
  actions: [
    fill(ACTION_FIELDS, {
      type: 'NODE',
      navigation: 'OVERLAY',
      amountToSkip: 5,
      newTimestamp: 7,
      openInNewTab: true,
      preserveScrollPosition: true,
      resetInteractiveComponents: false,
      resetScrollPosition: false,
      resetVideoPosition: true,
      overlayRelativePosition: { x: 0, y: 4 },
      transition: fill(TRANSITION_FIELDS, {
        type: 'MOVE_IN',
        direction: 'BOTTOM',
        matchLayers: true,
        duration: 0.3,
        easing: fill(EASING_FIELDS, {
          type: 'CUSTOM_CUBIC_BEZIER',
          easingFunctionCubicBezier: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
          easingFunctionSpring: { mass: 1, stiffness: 100, damping: 10 },
        }),
      }),
      conditionalBlocks: [
        { condition: { type: 'BOOLEAN', value: true }, actions: [{ type: 'BACK' }] },
      ],
      variableValue: { type: 'FLOAT', resolvedType: 'FLOAT', value: 12 },
    }),
  ],
});

describe('reaction round-trip fidelity', () => {
  it('reads the field surface out of the installed typings', () => {
    expect(TRIGGER_FIELDS).not.toHaveLength(0);
    expect(ACTION_FIELDS).not.toHaveLength(0);
    expect(TRANSITION_FIELDS).not.toHaveLength(0);
    expect(EASING_FIELDS).not.toHaveLength(0);
    expect(ACTION_FIELDS).toContain('overlayRelativePosition');
    expect(ACTION_FIELDS).toEqual(
      expect.arrayContaining(['variableId', 'mediaAction', 'conditionalBlocks']),
    );
    expect(TRIGGER_FIELDS).toEqual(expect.arrayContaining(['keyCodes', 'device', 'mediaHitTime']));
    expect(TRANSITION_FIELDS).toEqual(
      expect.arrayContaining(['direction', 'matchLayers', 'easing']),
    );
  });

  it('survives Figma → wire → Figma with every declared field intact', async () => {
    const reaction = reactionWithEveryField();
    const read = (await createGetReactionsHandler({
      getNodeByIdAsync: async () => ({ id: '1:1', reactions: [reaction] }),
    } as unknown as typeof figma)({ nodeId: '1:1' })) as GetReactionsResult;

    expect(read.reactions).toEqual([reaction]);

    const setReactionsAsync = vi.fn<() => Promise<void>>(async () => {});
    await createSetReactionsHandler({
      getNodeByIdAsync: async () => ({ id: '1:1', setReactionsAsync }),
    } as unknown as typeof figma)({ nodeId: '1:1', reactions: read.reactions });

    expect(setReactionsAsync).toHaveBeenCalledWith([reaction]);
  });

  it('anchors an overlay to its trigger without disturbing the rest of the action', async () => {
    const setReactionsAsync = vi.fn<() => Promise<void>>(async () => {});
    const action = {
      type: 'NODE',
      destinationId: '2:2',
      navigation: 'OVERLAY',
      transition: null,
      overlayRelativePosition: { x: 0, y: 4 },
    };
    await createSetReactionsHandler({
      getNodeByIdAsync: async () => ({ id: '1:1', setReactionsAsync }),
    } as unknown as typeof figma)({
      nodeId: '1:1',
      reactions: [{ trigger: { type: 'ON_CLICK' }, actions: [action] }],
    });

    expect(setReactionsAsync).toHaveBeenCalledWith([
      { trigger: { type: 'ON_CLICK' }, actions: [action] },
    ]);
  });
});
