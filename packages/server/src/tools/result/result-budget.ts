import {
  CLIENT_MESSAGE_LIMIT_BYTES,
  NODE_LIST_BUDGET_BYTES,
  TOOL_RESULT_LIMIT_BYTES,
} from '@figma-forge/core';
import type { CallToolResult } from '@modelcontextprotocol/server';

const megabytes = (bytes: number): string => (bytes / 1024 / 1024).toFixed(1);

const wireBytes = (text: string): number => Buffer.byteLength(JSON.stringify(text), 'utf8') - 2;

interface NodeListResult<Node> {
  note?: string | undefined;
  matchCount?: number | undefined;
  nodes: Node[];
}

export const fitNodeList = <Node>(
  result: NodeListResult<Node>,
  narrowWith: string,
  budgetBytes = NODE_LIST_BUDGET_BYTES,
): NodeListResult<Node> => {
  const total = result.matchCount ?? result.nodes.length;
  const sizes = result.nodes.map(node => wireBytes(JSON.stringify(node)));
  const noteFor = (kept: number): string =>
    `Showing the first ${kept.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} ` +
    'matching nodes, in document order: they do not all fit in one tool result ' +
    `(${megabytes(budgetBytes)} MB). To reach the rest, narrow the call — ${narrowWith}.`;
  const shell = (kept: number): number =>
    wireBytes(JSON.stringify({ note: noteFor(kept), matchCount: total, nodes: [] }));
  if (total === result.nodes.length) {
    const whole = wireBytes(JSON.stringify({ nodes: [] })) + sizes.reduce((a, b) => a + b, 0);
    if (whole + Math.max(0, sizes.length - 1) <= budgetBytes) return result;
  }
  let used = shell(total);
  let kept = 0;
  while (kept < sizes.length) {
    const next = used + (sizes[kept] ?? 0) + (kept > 0 ? 1 : 0);
    if (next > budgetBytes) break;
    used = next;
    kept += 1;
  }
  return { note: noteFor(kept), matchCount: total, nodes: result.nodes.slice(0, kept) };
};

const contentSizeCeiling = (result: CallToolResult): number =>
  result.content.reduce((total, block) => {
    if ('text' in block && typeof block.text === 'string') return total + block.text.length * 6;
    if ('data' in block && typeof block.data === 'string') return total + block.data.length;
    return total;
  }, 0);

export const assertWithinLimit = (
  tool: string,
  result: CallToolResult,
  limitBytes = TOOL_RESULT_LIMIT_BYTES,
): CallToolResult => {
  if (contentSizeCeiling(result) <= limitBytes) return result;
  const bytes = Buffer.byteLength(JSON.stringify(result.content), 'utf8');
  if (bytes <= limitBytes) return result;
  throw new Error(
    `${tool}: the result is ${megabytes(bytes)} MB, more than the ` +
      `${megabytes(CLIENT_MESSAGE_LIMIT_BYTES)} MB one MCP message can carry — sending it would ` +
      'drop the connection to this server. Ask for less in one call: scope it to a smaller subtree ' +
      'or split it into several calls.',
  );
};
