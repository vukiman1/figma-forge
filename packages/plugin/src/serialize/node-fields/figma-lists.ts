export const isPaintList = (value: unknown): value is readonly Paint[] => Array.isArray(value);

export const isEffectList = (value: unknown): value is readonly Effect[] => Array.isArray(value);

export const isLayoutGridList = (value: unknown): value is readonly LayoutGrid[] =>
  Array.isArray(value);

export const isAnnotationList = (value: unknown): value is readonly Annotation[] =>
  Array.isArray(value);
