import { describe, expect, it } from 'vitest';

import { placeOutline } from '../../../src/features/vector/place-outline.js';
import { add, container, leaf, painted } from './outline-fake.js';
import { at } from './vector-fake.js';

describe('placeOutline', () => {
  it('puts the outline just above its source, at the spot the stroke was drawn', () => {
    const page = container('0:1', 'PAGE', at(0, 0));
    const frame = add(page, container('F', 'FRAME', at(100, 50))) as ReturnType<typeof container>;
    const source = add(frame, leaf('S', at(10, 10)));
    add(frame, { id: 'above' });
    const outline = add(page, leaf('O', at(6, 7)));
    placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
    expect(frame.children.map(c => c.id)).toEqual(['S', 'O', 'above']);
    expect(outline.relativeTransform).toEqual(at(6, 7));
    expect(outline.absoluteTransform).toEqual(at(106, 57));
  });

  it('measures from a group’s own box, though its children are placed in the parent’s space', () => {
    const page = container('0:1', 'PAGE', at(0, 0));
    const frame = add(page, container('F', 'FRAME', at(100, 0))) as ReturnType<typeof container>;
    const group = add(frame, container('G', 'GROUP', at(130, 20))) as ReturnType<typeof container>;
    const source = add(group, leaf('S', at(40, 30)));
    const outline = add(page, leaf('O', at(5, 6)));
    placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
    expect(group.children.map(c => c.id)).toEqual(['S', 'O']);
    expect(outline.absoluteTransform).toEqual(at(135, 26));
    expect(outline.relativeTransform).toEqual(at(35, 26));
  });

  it.each(['INSTANCE', 'BOOLEAN_OPERATION', 'TRANSFORM_GROUP'])(
    'goes above a %s holding the source, which cannot take it',
    type => {
      const page = container('0:1', 'PAGE', at(0, 0));
      const frame = add(page, container('F', 'FRAME', at(0, 0))) as ReturnType<typeof container>;
      const holder = add(frame, container('H', type, at(0, 0))) as ReturnType<typeof container>;
      const inner = add(holder, container('I', 'FRAME', at(0, 0))) as ReturnType<typeof container>;
      const source = add(inner, leaf('S', at(0, 0)));
      const outline = add(page, leaf('O', at(1, 2)));
      placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
      expect(frame.children.map(c => c.id)).toEqual(['H', 'O']);
      expect(inner.children.map(c => c.id)).toEqual(['S']);
    },
  );

  it('is absolutely positioned in an auto-layout parent, so the flow does not move', () => {
    const page = container('0:1', 'PAGE', at(0, 0));
    const row = add(page, container('A', 'FRAME', at(0, 0), { layoutMode: 'HORIZONTAL' }));
    const source = add(row as ReturnType<typeof container>, leaf('S', at(0, 0)));
    const outline = add(page, leaf('O', at(0, -2), { layoutPositioning: 'AUTO' }));
    placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
    expect(outline.layoutPositioning).toBe('ABSOLUTE');
  });

  it('lines the outline’s paint up with the stroke’s, whatever the transform rule left', () => {
    const page = container('0:1', 'PAGE', at(0, 0));
    const frame = add(page, container('F', 'FRAME', at(0, 0))) as ReturnType<typeof container>;
    const source = add(frame, painted('S', at(100, 50), [-20, -5, 60, 30]));
    const outline = add(page, painted('O', at(7, 3), [0, 0, 60, 30]));
    placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
    expect((outline.absoluteRenderBounds as Rect).x).toBeCloseTo(80, 6);
    expect((outline.absoluteRenderBounds as Rect).y).toBeCloseTo(45, 6);
  });

  it('leaves an outline whose paint is clipped to another size where the rule put it', () => {
    const page = container('0:1', 'PAGE', at(0, 0));
    const frame = add(page, container('F', 'FRAME', at(0, 0))) as ReturnType<typeof container>;
    const source = add(frame, painted('S', at(100, 50), [-20, -5, 30, 30]));
    const outline = add(page, painted('O', at(7, 3), [0, 0, 60, 30]));
    placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
    expect(outline.relativeTransform).toEqual(at(7, 3));
  });

  it('goes beside a group an auto-layout frame lays out, so the group does not grow and move', () => {
    const page = container('0:1', 'PAGE', at(0, 0));
    const column = add(
      page,
      container('C', 'FRAME', at(0, 0), { layoutMode: 'VERTICAL' }),
    ) as ReturnType<typeof container>;
    const outer = add(column, container('G1', 'GROUP', at(0, 0))) as ReturnType<typeof container>;
    const inner = add(outer, container('G2', 'GROUP', at(0, 0))) as ReturnType<typeof container>;
    const source = add(inner, leaf('S', at(10, 10)));
    const outline = add(page, leaf('O', at(0, 0), { layoutPositioning: 'AUTO' }));
    placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
    expect(column.children.map(c => c.id)).toEqual(['G1', 'O']);
    expect(inner.children.map(c => c.id)).toEqual(['S']);
    expect(outline.layoutPositioning).toBe('ABSOLUTE');
  });

  it('drops the aspect ratio it inherits from the stroke before it joins a layout', () => {
    const page = container('0:1', 'PAGE', at(0, 0));
    const row = add(page, container('A', 'FRAME', at(0, 0), { layoutMode: 'HORIZONTAL' }));
    const source = add(row as ReturnType<typeof container>, leaf('S', at(0, 0)));
    const log: string[] = [];
    const outline = add(page, leaf('O', at(0, 0), { targetAspectRatio: { x: 16, y: 1 } }));
    outline.unlockAspectRatio = () => {
      log.push(`unlock, in ${(outline.parent as { id: string }).id}`);
      outline.targetAspectRatio = null;
    };
    placeOutline(source as unknown as SceneNode, outline as unknown as SceneNode);
    expect(log).toEqual(['unlock, in 0:1']);
    expect(outline.targetAspectRatio).toBeNull();
  });
});
