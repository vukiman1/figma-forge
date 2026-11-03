import { DesignContextNodeSchema, LAYOUT_TIER_FIELDS } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

const COMPACT_BASE = [
  'id',
  'name',
  'type',
  'visible',
  'x',
  'y',
  'width',
  'height',
  'mainComponentId',
  'truncated',
  'deduped',
  'children',
] as const;

const APPEARANCE: Record<string, string> = {
  rotation: 'transform, not flow',
  opacity: 'appearance',
  cornerRadius: 'appearance',
  cornerRadii: 'appearance',
  cornerSmoothing: 'corner curvature, not layout',
  blendMode: 'appearance',
  isMask: 'appearance (clipping is realised from the mask layer, needs its geometry + paint)',
  maskType: 'appearance',
  arcData: 'shape geometry, rendered as SVG/gradient — appearance',
  fills: 'appearance',
  strokes: 'appearance',
  strokeWeight: 'appearance',
  strokeWeights: 'appearance',
  strokeAlign: 'appearance',
  dashPattern: 'appearance',
  strokeCap: 'appearance',
  strokeJoin: 'appearance',
  complexStrokeProperties: 'a brush / dynamic stroke — how the stroke looks',
  variableWidthStrokeProperties: 'a stroke width profile — how the stroke looks',
  textPathStartData: 'where text on a path starts — text styling, recovered on re-grounding',
  effects: 'appearance',
  fontSize: 'typography',
  fontName: 'typography',
  lineHeight: 'typography',
  letterSpacing: 'typography',
  textCase: 'typography',
  textDecoration: 'typography',
  paragraphSpacing: 'typography',
  paragraphIndent: 'typography',
  textWrapStyle: 'typography',
  hyperlink: 'content styling, recovered when the section is re-grounded',
  segments: 'per-run typography — the single largest text-side cost',
  styleIds: 'token binding',
  boundVariables: 'token binding — measured as the single largest field cost in a full payload',
  variableModes: 'which theme the colours resolve in — moot once this tier has dropped the colours',
  motion: 'animation, not layout',
  mainComponent: 'full-only resolved object; mainComponentId carries identity in the compact base',
  fill: 'globalVars ref (appearance)',
  stroke: 'globalVars ref (appearance)',
  effect: 'globalVars ref (appearance)',
  textStyle: 'globalVars ref (typography)',
  propertyOverrides: 'per-instance appearance; textOverrides carries the per-instance content',
};

const schemaFieldNames = (): string[] => Object.keys(DesignContextNodeSchema.shape);

describe('LAYOUT tier coverage', () => {
  const schemaFields = schemaFieldNames();

  it('reaches the schema shape', () => {
    expect(schemaFields).toContain('layout');
    expect(schemaFields).toContain('fills');
    expect(schemaFields.length).toBeGreaterThan(40);
  });

  it('classifies every schema field exactly once', () => {
    const classified = new Map<string, string>();
    const dupes: string[] = [];
    for (const [bucket, fields] of [
      ['compact-base', COMPACT_BASE as readonly string[]],
      ['layout-tier', LAYOUT_TIER_FIELDS as readonly string[]],
      ['appearance', Object.keys(APPEARANCE)],
    ] as const) {
      for (const f of fields) {
        if (classified.has(f)) dupes.push(`${f} (${classified.get(f) as string} + ${bucket})`);
        classified.set(f, bucket);
      }
    }
    expect(dupes).toEqual([]);

    const problems: string[] = [];
    const unclassified = schemaFields.filter(f => !classified.has(f));
    if (unclassified.length > 0) {
      problems.push(
        `New DesignContextNode field(s) [${unclassified.join(', ')}] — decide which side of the ` +
          'LAYOUT downgrade each belongs on: add it to LAYOUT_TIER_FIELDS if it describes how a box ' +
          'is sized, placed, flowed or what it says, or to APPEARANCE in this test (with a reason) ' +
          'if it is colour / typography / effects / tokens.',
      );
    }

    const stale = [...classified.keys()].filter(f => !schemaFields.includes(f));
    if (stale.length > 0) {
      problems.push(
        `Classified field(s) [${stale.join(', ')}] are no longer in DesignContextNodeSchema — ` +
          'renamed or removed; update the classification.',
      );
    }
    expect(problems).toEqual([]);
  });

  it('carries the fields the reported bug is about', () => {
    for (const f of ['layout', 'layoutSizingHorizontal', 'layoutSizingVertical', 'constraints']) {
      expect(LAYOUT_TIER_FIELDS as readonly string[]).toContain(f);
    }
  });
});
