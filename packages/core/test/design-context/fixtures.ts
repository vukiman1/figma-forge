import type { DesignContextNode } from '../../src/index.js';

export const solid = (r: number, g: number, b: number, opacity = 1) => ({
  type: 'SOLID' as const,
  visible: true,
  opacity,
  color: { r, g, b },
});

export const textNode = (
  id: string,
  family: string,
  style: string,
  size: number,
): DesignContextNode => ({
  id,
  name: id,
  type: 'TEXT',
  fontSize: size,
  fontName: { family, style },
});
