import { STRING_ID_FIELDS } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { ALL_TOOL_SPECS } from '../../../src/tools/registry/registry.js';

describe('tool canvas id coverage', () => {
  it('covers every top-level canvas-id arg any advertised tool exposes', () => {
    const NON_CANVAS_ID_FIELDS = new Set([
      'styleId',
      'variableId',
      'collectionId',
      'propertyId',
      'modeId',
      'animationStyleId',
      'timelineId',
      'sessionId',
    ]);
    const covered = new Set<string>([...STRING_ID_FIELDS, 'nodeIds']);
    const offenders: string[] = [];
    for (const spec of ALL_TOOL_SPECS) {
      for (const key of Object.keys(spec.inputSchema.shape)) {
        const idShaped = /Ids?$/.test(key) || key === 'root';
        if (!idShaped || NON_CANVAS_ID_FIELDS.has(key)) continue;
        if (!covered.has(key)) offenders.push(`${spec.name}.${key}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
