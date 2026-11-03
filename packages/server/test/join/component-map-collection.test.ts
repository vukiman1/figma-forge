import type { DesignContextNode } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { collectFigmaComponents, parseMapFile } from '../../src/join/component-map.js';

describe('collectFigmaComponents', () => {
  it('groups repeated instances by main component, unioning variant axes', () => {
    const tree: DesignContextNode = {
      id: '0:1',
      name: 'Page',
      type: 'FRAME',
      children: [
        {
          id: '1:1',
          name: 'Button',
          type: 'INSTANCE',
          mainComponent: { id: 'c1', name: 'Button', key: 'k1' },
          mainComponentId: 'c1',
          componentProperties: { Size: { type: 'VARIANT', value: 'sm' } },
        },
        {
          id: '1:2',
          name: 'Button',
          type: 'INSTANCE',
          mainComponent: { id: 'c1', name: 'Button', key: 'k1' },
          mainComponentId: 'c1',
          componentProperties: { State: { type: 'VARIANT', value: 'hover' } },
        },
      ],
    };
    const [u] = collectFigmaComponents([tree]);
    expect(u?.name).toBe('Button');
    expect(u?.instanceCount).toBe(2);
    expect(u?.instances).toEqual([
      { nodeId: '1:1', props: { Size: 'sm' } },
      { nodeId: '1:2', props: { State: 'hover' } },
    ]);
    expect(u?.variantAxes).toEqual(['Size', 'State']);
  });

  it('groups variant instances by the set carried on mainComponent — no setIndex needed', () => {
    const tree: DesignContextNode = {
      id: '0:1',
      name: 'Page',
      type: 'FRAME',
      children: [
        {
          id: '1:1',
          name: 'btn',
          type: 'INSTANCE',
          mainComponent: {
            id: 'v1',
            name: 'Size=Large',
            key: 'k1',
            componentSetId: 'set1',
            componentSetName: 'Button',
          },
          mainComponentId: 'v1',
        },
        {
          id: '1:2',
          name: 'btn',
          type: 'INSTANCE',
          mainComponent: {
            id: 'v2',
            name: 'Size=Small',
            key: 'k2',
            componentSetId: 'set1',
            componentSetName: 'Button',
          },
          mainComponentId: 'v2',
        },
      ],
    };
    const usages = collectFigmaComponents([tree]);
    expect(usages).toHaveLength(1);
    expect(usages[0]?.name).toBe('Button');
    expect(usages[0]?.mainComponentId).toBe('set1');
    expect(usages[0]?.instanceCount).toBe(2);
  });

  it('merges the same component across sibling top-level frames into one usage', () => {
    const frame = (frameId: string, instId: string): DesignContextNode => ({
      id: frameId,
      name: 'Frame',
      type: 'FRAME',
      children: [
        {
          id: instId,
          name: 'btn',
          type: 'INSTANCE',
          mainComponent: {
            id: 'v1',
            name: 'Size=Large',
            key: 'k',
            componentSetId: 'set1',
            componentSetName: 'Button',
          },
          mainComponentId: 'v1',
        },
      ],
    });
    const usages = collectFigmaComponents([frame('F:1', '1:1'), frame('F:2', '2:1')]);
    expect(usages).toHaveLength(1);
    expect(usages[0]?.name).toBe('Button');
    expect(usages[0]?.instanceCount).toBe(2);
    expect(usages[0]?.instances.map(i => i.nodeId)).toEqual(['1:1', '2:1']);
  });
});

describe('parseMapFile', () => {
  it('parses arrow lines and markdown table rows, skipping the header', () => {
    const md = [
      '| Figma | Code |',
      '| --- | --- |',
      '| Tooltip | src/ui/Tip.tsx |',
      'Badge -> src/ui/Badge.tsx',
    ].join('\n');
    const map = parseMapFile(md);
    expect(map.get('Tooltip')?.name).toBe('Tip');
    expect(map.get('Tooltip')?.filePath).toBe('src/ui/Tip.tsx');
    expect(map.get('Badge')?.name).toBe('Badge');
    expect(map.has('Figma')).toBe(false);
  });

  it('does not mistake a data row for the header (whole-cell header match)', () => {
    const md = [
      '| Figma | Code |',
      '| :---: | :--- |',
      '| Figma/Logo | src/brand/Component.tsx |',
    ].join('\n');
    const map = parseMapFile(md);
    expect(map.get('Figma/Logo')?.filePath).toBe('src/brand/Component.tsx');
    expect(map.has('Figma')).toBe(false);
    expect([...map.keys()].some(k => k.startsWith(':'))).toBe(false);
  });
});
