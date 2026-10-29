import { same } from '../snapshot/values.js';

const writableWidths = (widths: VariableWidthStrokeProperties): VariableWidthStrokeProperties =>
  widths.widthProfile === 'CUSTOM'
    ? { widthProfile: 'CUSTOM', variableWidthPoints: widths.variableWidthPoints }
    : { widthProfile: widths.widthProfile };

export const restoreWidthProfile = (
  node: ComplexStrokesMixin,
  widths: VariableWidthStrokeProperties,
): void => {
  if (same(node.variableWidthStrokeProperties, widths)) return;
  node.variableWidthStrokeProperties = writableWidths(widths);
};
