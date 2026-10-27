import { omitKeys } from '../object/omit-keys.js';
import type { DesignContextNode } from './node.js';
import type { GlobalVars } from './result.js';
import { simplifyEffect } from './simplify-effect.js';
import { simplifyPaint } from './simplify-paint.js';
import { createStyleRegistry, type StyleRegistry } from './style-registry.js';
import { extractTextStyle, TYPOGRAPHY_KEYS } from './text-style.js';

type DedupeStep = (node: DesignContextNode, registry: StyleRegistry) => DesignContextNode;

const dedupeFills: DedupeStep = (node, registry) => {
  if (!Array.isArray(node.fills) || node.fills.length === 0) return node;
  return {
    ...omitKeys(node, ['fills']),
    fill: registry.register(node.fills.map(simplifyPaint), 'fill'),
  };
};

const dedupeStrokes: DedupeStep = (node, registry) => {
  if (node.strokes === undefined || node.strokes.length === 0) return node;
  return {
    ...omitKeys(node, ['strokes']),
    stroke: registry.register(node.strokes.map(simplifyPaint), 'stroke'),
  };
};

const dedupeEffects: DedupeStep = (node, registry) => {
  if (node.effects === undefined || node.effects.length === 0) return node;
  return {
    ...omitKeys(node, ['effects']),
    effect: registry.register(node.effects.map(simplifyEffect), 'effect'),
  };
};

const dedupeTextStyle: DedupeStep = (node, registry) => {
  const bundle = extractTextStyle(node);
  if (bundle === null) return node;
  const consumed = TYPOGRAPHY_KEYS.filter(key => key in bundle);
  return {
    ...omitKeys(node, ['fontSize', 'fontName', ...consumed]),
    textStyle: registry.register(bundle, 'text'),
  };
};

const DEDUPE_STEPS = [dedupeFills, dedupeStrokes, dedupeEffects, dedupeTextStyle] as const;

export const dedupeStyles = (
  nodes: readonly DesignContextNode[],
): { nodes: DesignContextNode[]; globalVars: GlobalVars } => {
  const registry = createStyleRegistry();
  const dedupeTree = (node: DesignContextNode): DesignContextNode => {
    const { children, ...rest } = node;
    const deduped = DEDUPE_STEPS.reduce((current, step) => step(current, registry), rest);
    return children === undefined ? deduped : { ...deduped, children: children.map(dedupeTree) };
  };
  return { nodes: nodes.map(dedupeTree), globalVars: { styles: registry.styles } };
};
