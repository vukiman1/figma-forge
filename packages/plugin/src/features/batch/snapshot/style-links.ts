import { readField } from './values.js';

interface StyleLink {
  readonly idField: string;
  readonly setter: string;
}

export const STYLE_LINKS: Readonly<Record<string, StyleLink>> = {
  fills: { idField: 'fillStyleId', setter: 'setFillStyleIdAsync' },
  strokes: { idField: 'strokeStyleId', setter: 'setStrokeStyleIdAsync' },
  effects: { idField: 'effectStyleId', setter: 'setEffectStyleIdAsync' },
  layoutGrids: { idField: 'gridStyleId', setter: 'setGridStyleIdAsync' },
};

export type StyleLinkSnapshot = Record<string, string>;

export const captureStyleLinks = (node: BaseNode, props: readonly string[]): StyleLinkSnapshot =>
  Object.fromEntries(
    props.flatMap(prop => {
      const link = STYLE_LINKS[prop];
      const id = link === undefined || !(prop in node) ? undefined : readField(node, link.idField);
      return link !== undefined && typeof id === 'string' ? [[link.idField, id]] : [];
    }),
  );

const relink = async (node: BaseNode, link: StyleLink, id: string): Promise<void> => {
  const setter = readField(node, link.setter);
  if (typeof setter !== 'function') return;
  await Reflect.apply(setter, node, [id]);
};

export const restoreStyleLinks = async (
  node: BaseNode,
  styles: StyleLinkSnapshot,
): Promise<void> => {
  for (const link of Object.values(STYLE_LINKS)) {
    const id = styles[link.idField];
    if (id === undefined || readField(node, link.idField) === id) continue;
    // oxlint-disable-next-line no-await-in-loop -- at most four links, in a fixed order
    await relink(node, link, id);
  }
};
