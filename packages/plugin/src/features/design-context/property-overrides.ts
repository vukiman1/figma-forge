import { type DesignContextNode, MIXED, pickDefined, simplifyPaint } from '@figma-forge/core';

import { childrenOf } from './child-nodes.js';
import { project } from './project-node.js';

export type PropertyOverride = NonNullable<DesignContextNode['propertyOverrides']>[number];

const VISUAL_OVERRIDE_FIELDS: ReadonlySet<string> = new Set([
  'fills',
  'strokes',
  'strokeWeight',
  'strokeAlign',
  'effects',
  'cornerRadius',
  'cornerRadii',
  'cornerSmoothing',
  'opacity',
  'blendMode',
]);
const PLAIN_VISUAL_FIELDS = [
  'strokeAlign',
  'effects',
  'cornerRadii',
  'cornerSmoothing',
  'opacity',
  'blendMode',
] as const;
const VISIBLE_FIELD = 'visible';
const MODES_FIELD = 'explicitVariableModes';
const SMOOTHING_FIELD = 'cornerSmoothing';

type OverriddenFields = ReadonlyMap<string, readonly string[]>;

const isVisualOverride = (fields: readonly string[]): boolean =>
  fields.some(
    field => field === VISIBLE_FIELD || field === MODES_FIELD || VISUAL_OVERRIDE_FIELDS.has(field),
  );

const overriddenFieldsOf = (instance: InstanceNode): OverriddenFields =>
  new Map(
    (instance.overrides ?? []).flatMap(({ id, overriddenFields }) => {
      const fields: readonly string[] = overriddenFields;
      return id !== instance.id && isVisualOverride(fields) ? [[id, fields] as const] : [];
    }),
  );

const unlessMixed = <T>(value: T | typeof MIXED | undefined): T | undefined =>
  value === MIXED ? undefined : value;

const visualFieldsOf = (projected: DesignContextNode): Omit<PropertyOverride, 'name'> => {
  const fills = unlessMixed(projected.fills);
  const strokeWeight = unlessMixed(projected.strokeWeight);
  const cornerRadius = unlessMixed(projected.cornerRadius);
  return {
    ...(fills !== undefined && { fills: fills.map(simplifyPaint) }),
    ...(projected.strokes !== undefined && { strokes: projected.strokes.map(simplifyPaint) }),
    ...(strokeWeight !== undefined && { strokeWeight }),
    ...(cornerRadius !== undefined && { cornerRadius }),
    ...pickDefined(projected, PLAIN_VISUAL_FIELDS),
  };
};

const smoothingOverride = (
  node: SceneNode,
  fields: readonly string[],
): { cornerSmoothing?: number } =>
  fields.includes(SMOOTHING_FIELD) && 'cornerSmoothing' in node
    ? { cornerSmoothing: node.cornerSmoothing }
    : {};

const overrideEntry = (node: SceneNode, fields: readonly string[]): PropertyOverride => {
  const projected = project(node, 'full');
  return {
    name: node.name,
    ...(!node.visible && { visible: false }),
    ...smoothingOverride(node, fields),
    ...visualFieldsOf(projected),
    ...(fields.includes(MODES_FIELD) && { variableModes: projected.variableModes ?? {} }),
  };
};

const entriesUnder = (node: SceneNode, overridden: OverriddenFields): PropertyOverride[] => {
  const fields = overridden.get(node.id);
  const entry = fields === undefined ? null : overrideEntry(node, fields);
  const own = entry !== null && Object.keys(entry).length > 1 ? [entry] : [];
  return [...own, ...childrenOf(node).flatMap(child => entriesUnder(child, overridden))];
};

export const collectPropertyOverrides = (instance: InstanceNode): PropertyOverride[] => {
  const overridden = overriddenFieldsOf(instance);
  if (overridden.size === 0) return [];
  return childrenOf(instance).flatMap(child => entriesUnder(child, overridden));
};
