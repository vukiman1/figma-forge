const fieldOf = (value: object, key: string): unknown => Reflect.get(value, key);

export const assertKeyframeField = (field: unknown, tool: string): void => {
  if (typeof field !== 'object' || field === null) {
    throw new TypeError(`${tool}: field must be an object`);
  }
  const needsSubField =
    fieldOf(field, 'type') === 'INDEXED_ITEM' &&
    fieldOf(field, 'collection') === 'effects' &&
    fieldOf(field, 'field') === undefined &&
    fieldOf(field, 'propertyId') === undefined;
  if (needsSubField) {
    throw new TypeError(`${tool}: an effects INDEXED_ITEM field needs "field" or "propertyId"`);
  }
};
