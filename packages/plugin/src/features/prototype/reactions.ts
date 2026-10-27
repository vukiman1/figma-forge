import type { SerializedReaction } from '@figma-forge/core';

export type ReactionHost = BaseNode & ReactionMixin;

export const canHaveReactions = (node: BaseNode | null): node is ReactionHost =>
  node !== null && 'setReactionsAsync' in node && typeof node.setReactionsAsync === 'function';

export const requireReactionHost = async (
  figmaCtx: typeof figma,
  tool: string,
  nodeId: string,
): Promise<ReactionHost> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (canHaveReactions(node)) return node;
  throw new Error(`${tool}: node ${nodeId} not found or cannot have reactions`);
};

export const toFigmaReaction = (reaction: SerializedReaction): Reaction =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the wire shape mirrors Figma's Reaction field for field, and Figma validates it on write
  ({ trigger: reaction.trigger, actions: reaction.actions }) as unknown as Reaction;

export const serializeReaction = (reaction: Reaction): SerializedReaction => {
  const actions = reaction.actions ?? (reaction.action === undefined ? [] : [reaction.action]);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the wire shape mirrors Figma's Reaction field for field
  return {
    trigger: reaction.trigger,
    actions: [...actions],
  } as unknown as SerializedReaction;
};
