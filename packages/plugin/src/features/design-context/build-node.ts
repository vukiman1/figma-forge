import type { DesignContextNode, DetailLevel } from '@figma-forge/core';

import { inheritRepeat } from '../../serialize/serialize-node.js';
import { childrenOf } from './child-nodes.js';
import { depthBelow } from './depth.js';
import { hasDrawStroke } from './draw-stroke.js';
import { mainComponentRef } from './main-component.js';
import { motionSummary } from './motion-summary.js';
import { project } from './project-node.js';
import { collectPropertyOverrides } from './property-overrides.js';
import { collectTextOverrides } from './text-overrides.js';

export interface BuildContext {
  readonly detail: DetailLevel;
  readonly shouldDedupe: boolean;
  readonly seenMainComponents: Set<string>;
  readonly lookup: (id: string) => Promise<BaseNode | null>;
}

type NodeFields = Partial<DesignContextNode>;

interface InstanceView {
  readonly fields: NodeFields;
  readonly isCollapsed: boolean;
}

const collapsedFields = (node: InstanceNode): NodeFields => {
  const textOverrides = collectTextOverrides(node);
  const propertyOverrides = collectPropertyOverrides(node);
  return {
    deduped: true,
    ...(textOverrides.length > 0 && { textOverrides }),
    ...(propertyOverrides.length > 0 && { propertyOverrides }),
  };
};

const instanceView = async (node: InstanceNode, ctx: BuildContext): Promise<InstanceView> => {
  const main = await node.getMainComponentAsync();
  if (main === null) return { fields: {}, isCollapsed: false };
  const fields: NodeFields = {
    mainComponentId: main.id,
    ...(ctx.detail === 'full' && { mainComponent: mainComponentRef(main) }),
  };
  if (!ctx.shouldDedupe) return { fields, isCollapsed: false };
  if (!ctx.seenMainComponents.has(main.id) || hasDrawStroke(node)) {
    ctx.seenMainComponents.add(main.id);
    return { fields, isCollapsed: false };
  }
  return { fields: { ...fields, ...collapsedFields(node) }, isCollapsed: true };
};

const viewOf = async (node: SceneNode, ctx: BuildContext): Promise<InstanceView> =>
  node.type === 'INSTANCE' && (ctx.shouldDedupe || ctx.detail === 'full')
    ? instanceView(node, ctx)
    : { fields: {}, isCollapsed: false };

const childFields = async (
  node: SceneNode,
  remainingDepth: number,
  ctx: BuildContext,
): Promise<NodeFields> => {
  const children = childrenOf(node);
  if (children.length === 0) return {};
  if (remainingDepth === 0) return { truncated: true };
  const next = depthBelow(remainingDepth);
  return { children: await Promise.all(children.map(async child => buildNode(child, next, ctx))) };
};

const fullDetailFields = async (
  node: SceneNode,
  out: DesignContextNode,
  ctx: BuildContext,
): Promise<void> => {
  if (ctx.detail !== 'full') return;
  await inheritRepeat(node, out, ctx.lookup);
  const motion = motionSummary(node);
  if (motion !== undefined) out.motion = motion;
};

export const buildNode = async (
  node: SceneNode,
  remainingDepth: number,
  ctx: BuildContext,
): Promise<DesignContextNode> => {
  const out = project(node, ctx.detail);
  await fullDetailFields(node, out, ctx);
  const view = await viewOf(node, ctx);
  const children = view.isCollapsed ? {} : await childFields(node, remainingDepth, ctx);
  return { ...out, ...view.fields, ...children };
};
