// oxlint-disable-next-line no-underscore-dangle -- compile-time defines use dunder names
declare const __FIGMA_FORGE_BUILD_ID__: string | undefined;

export const BUILD_ID: number =
  typeof __FIGMA_FORGE_BUILD_ID__ === 'string' ? Number(__FIGMA_FORGE_BUILD_ID__) : 0;
