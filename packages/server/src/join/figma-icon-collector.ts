import type { DesignContextNode } from '@figma-forge/core';

import { casefold } from './casefold.js';
import { iconLabel } from './icon-label.js';
import type { FigmaIconUsage, IconFill } from './icon-mapping.js';

const ICON_MARKER = /(^|[\s/_-])ic(on)?s?([\s/_-]|$)/i;
const DEFAULT_VECTOR_NAME =
  /^(vector|union|subtract|intersect|exclude|rectangle|ellipse|line|polygon|star|group|frame|shape|path|oval|boolean)\s*\d*$/i;
const VECTOR_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION']);

const carriesMarker = (node: DesignContextNode): boolean =>
  ICON_MARKER.test(node.name) ||
  (node.mainComponent !== undefined &&
    (ICON_MARKER.test(node.mainComponent.name) ||
      (node.mainComponent.componentSetName !== undefined &&
        ICON_MARKER.test(node.mainComponent.componentSetName))));

const sourceName = (node: DesignContextNode): string =>
  node.mainComponent?.componentSetName ?? node.mainComponent?.name ?? node.name;

const toHexPart = (value: number): string =>
  Math.round(Math.max(0, Math.min(1, value)) * 255)
    .toString(16)
    .padStart(2, '0');

const findFill = (node: DesignContextNode): IconFill | undefined => {
  const fill: IconFill = {};
  if (Array.isArray(node.fills)) {
    const solid = node.fills.find(paint => paint.type === 'SOLID' && (paint.visible ?? true));
    if (solid?.type === 'SOLID') {
      fill.hex =
        `#${toHexPart(solid.color.r)}${toHexPart(solid.color.g)}${toHexPart(solid.color.b)}`.toUpperCase();
    }
  }
  if ((node.boundVariables?.fills?.length ?? 0) > 0) fill.variable = true;
  return fill.hex === undefined && fill.variable === undefined ? undefined : fill;
};

const recordIcon = (node: DesignContextNode, usages: Map<string, FigmaIconUsage>): void => {
  const figmaName = sourceName(node);
  const name = iconLabel(figmaName);
  if (name.length === 0) return;
  const key = casefold(name);
  const usage = usages.get(key) ?? { name, figmaName, nodeIds: [] };
  usage.nodeIds.push(node.id);
  const fill = findFill(node);
  if (usage.fill === undefined && fill !== undefined) usage.fill = fill;
  usages.set(key, usage);
};

const isIconRoot = (node: DesignContextNode): boolean =>
  carriesMarker(node) ||
  (VECTOR_TYPES.has(node.type) && !DEFAULT_VECTOR_NAME.test(node.name.trim()));

const visitNode = (node: DesignContextNode, usages: Map<string, FigmaIconUsage>): void => {
  if (isIconRoot(node)) {
    recordIcon(node, usages);
    return;
  }
  for (const child of node.children ?? []) visitNode(child, usages);
};

export const collectFigmaIcons = (roots: readonly DesignContextNode[]): FigmaIconUsage[] => {
  const usages = new Map<string, FigmaIconUsage>();
  for (const root of roots) visitNode(root, usages);
  return [...usages.values()];
};
