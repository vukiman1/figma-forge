import type { FontUsage } from '@figma-forge/core';

import { serializeFontName } from '../../serializer.js';

type TextLike = TextNode | TextPathNode;

const isTextLike = (node: SceneNode): node is TextLike =>
  node.type === 'TEXT' || node.type === 'TEXT_PATH';

const isFontName = (value: unknown): value is FontName =>
  typeof value === 'object' && value !== null && 'family' in value && 'style' in value;

const usageKey = (font: FontName): string => {
  const settings = font.variationSettings ?? {};
  const axes = Object.keys(settings)
    .toSorted()
    .map(tag => `${tag}=${String(settings[tag])}`)
    .join(',');
  return `${font.family} ${font.style} ${axes}`;
};

const fontsOf = (node: TextLike): FontName[] =>
  isFontName(node.fontName)
    ? [node.fontName]
    : node.getStyledTextSegments(['fontName']).map(segment => segment.fontName);

const byUsage = (a: FontUsage, b: FontUsage): number =>
  b.count - a.count ||
  a.fontName.family.localeCompare(b.fontName.family) ||
  a.fontName.style.localeCompare(b.fontName.style);

export const tallyFonts = (nodes: Iterable<SceneNode>): FontUsage[] => {
  const usage = new Map<string, FontUsage>();
  for (const node of nodes) {
    if (!isTextLike(node)) continue;
    for (const font of fontsOf(node)) {
      const key = usageKey(font);
      const entry = usage.get(key) ?? { fontName: serializeFontName(font), count: 0 };
      usage.set(key, { ...entry, count: entry.count + 1 });
    }
  }
  return [...usage.values()].toSorted(byUsage);
};
