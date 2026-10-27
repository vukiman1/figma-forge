import type { DesignContextNode } from './node.js';
import type { DesignContextMetrics, GetDesignContextResult } from './result.js';

const BYTES_PER_KB = 1024;
const KB_DECIMALS = 2;

interface TreeStats {
  nodeCount: number;
  maxDepth: number;
}

const treeStats = (nodes: readonly DesignContextNode[], depth = 1): TreeStats =>
  nodes.reduce<TreeStats>(
    (stats, node) => {
      const below = treeStats(node.children ?? [], depth + 1);
      return {
        nodeCount: stats.nodeCount + 1 + below.nodeCount,
        maxDepth: Math.max(stats.maxDepth, depth, below.maxDepth),
      };
    },
    { nodeCount: 0, maxDepth: 0 },
  );

const sizeKb = (value: unknown): number =>
  Number((JSON.stringify(value).length / BYTES_PER_KB).toFixed(KB_DECIMALS));

export const computeMetrics = (
  inlineNodes: readonly DesignContextNode[],
  result: Pick<GetDesignContextResult, 'nodes' | 'globalVars' | 'variables' | 'styles'>,
): DesignContextMetrics => ({
  ...treeStats(result.nodes),
  styleCount: result.globalVars ? Object.keys(result.globalVars.styles).length : 0,
  tokenCount: Object.keys(result.variables ?? {}).length + Object.keys(result.styles ?? {}).length,
  inlineSizeKb: sizeKb(inlineNodes),
  dedupedSizeKb: sizeKb({ nodes: result.nodes, globalVars: result.globalVars }),
});
