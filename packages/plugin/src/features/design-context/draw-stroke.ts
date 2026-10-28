import { childrenOf } from './child-nodes.js';

const BASIC_STROKE = 'BASIC';
const UNIFORM_WIDTH = 'UNIFORM';

const drawsOwnStroke = (node: SceneNode): boolean => {
  const complex = 'complexStrokeProperties' in node ? node.complexStrokeProperties : undefined;
  if (complex !== undefined && complex.type !== BASIC_STROKE) return true;
  const width =
    'variableWidthStrokeProperties' in node ? node.variableWidthStrokeProperties : undefined;
  return width != null && width.widthProfile !== UNIFORM_WIDTH;
};

export const hasDrawStroke = (root: SceneNode): boolean => {
  if (!root.visible) return false;
  return drawsOwnStroke(root) || childrenOf(root).some(hasDrawStroke);
};
