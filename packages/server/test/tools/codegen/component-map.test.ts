import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { COMPONENT_MAP_TOOL_NAME } from '@figma-forge/core';
import { GET_DESIGN_CONTEXT_TOOL_NAME, type GetDesignContextResult } from '@figma-forge/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  handleComponentMap,
  type ToolDispatcher,
} from '../../../src/tools/codegen/component-map.handler.js';

const fakeContext: GetDesignContextResult = {
  nodes: [
    {
      id: '0:1',
      name: 'Screen',
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
          name: 'Tooltip',
          type: 'INSTANCE',
          mainComponent: { id: 'c2', name: 'Tooltip', key: 'k2' },
          mainComponentId: 'c2',
        },
      ],
    },
  ],
};

describe('handleComponentMap', () => {
  let dir: string;

  const dispatch: ToolDispatcher = async tool => {
    if (tool === GET_DESIGN_CONTEXT_TOOL_NAME) return fakeContext;
    throw new Error(`unexpected dispatch: ${tool}`);
  };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'compmap-test-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { react: '^19.0.0' }, devDependencies: { typescript: '^5' } }),
    );
    await mkdir(join(dir, 'src', 'components'), { recursive: true });
    await writeFile(
      join(dir, 'src', 'components', 'Button.tsx'),
      'export function Button({ size }) { return <button/>; }',
    );
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('maps Button to the scanned component and flags Tooltip unmapped', async () => {
    const result = await handleComponentMap(dispatch, { rootDir: dir });
    const button = result.mappings.find(m => m.figmaComponentName === 'Button');
    const tooltip = result.mappings.find(m => m.figmaComponentName === 'Tooltip');

    expect(button?.candidate?.name).toBe('Button');
    expect(button?.status).toBe('high');
    expect(button?.candidate?.matchedProps).toEqual(['Size']);
    expect(tooltip?.status).toBe('unmapped');
    expect(result.unmapped).toContain('Tooltip');
    expect(result.profile.framework).toBe('react');
    expect(result.scannedComponentCount).toBe(1);
  });

  it('honors a docs/figma-component-map.md override for the otherwise-unmapped component', async () => {
    await mkdir(join(dir, 'docs'), { recursive: true });

    await mkdir(join(dir, 'src', 'ui'), { recursive: true });
    await writeFile(join(dir, 'src', 'ui', 'Tip.tsx'), 'export function Tip() { return <div/>; }');
    await writeFile(join(dir, 'docs', 'figma-component-map.md'), 'Tooltip -> src/ui/Tip.tsx\n');
    const result = await handleComponentMap(dispatch, { rootDir: dir });
    const tooltip = result.mappings.find(m => m.figmaComponentName === 'Tooltip');
    expect(tooltip?.candidate?.name).toBe('Tip');
    expect(tooltip?.source).toBe('map-file');
    expect(tooltip?.staleOverride).toBeUndefined();
    expect(result.unmapped).not.toContain('Tooltip');
    expect(result.staleOverrides).toBeUndefined();
  });

  it('reports a stale override (target gone from disk) and degrades instead of a phantom import', async () => {
    await mkdir(join(dir, 'docs'), { recursive: true });
    await writeFile(join(dir, 'docs', 'figma-component-map.md'), 'Tooltip -> src/ui/Gone.tsx\n');
    const result = await handleComponentMap(dispatch, { rootDir: dir });
    const tooltip = result.mappings.find(m => m.figmaComponentName === 'Tooltip');

    expect(tooltip?.source).toBe('scan');
    expect(tooltip?.candidate?.filePath).not.toBe('src/ui/Gone.tsx');
    expect(tooltip?.staleOverride).toEqual({ name: 'Gone', filePath: 'src/ui/Gone.tsx' });
    expect(result.staleOverrides).toEqual([
      { figmaComponentName: 'Tooltip', name: 'Gone', filePath: 'src/ui/Gone.tsx' },
    ]);
  });

  it('groups variant instances by their component set, not the variant name', async () => {
    const variantContext: GetDesignContextResult = {
      nodes: [
        {
          id: '0:1',
          name: 'Screen',
          type: 'FRAME',
          children: [
            {
              id: '1:1',
              name: 'btn/Default',
              type: 'INSTANCE',
              mainComponent: {
                id: 'v1',
                name: 'Size=Large, State=Hover',
                key: 'k1',
                componentSetId: 'set1',
                componentSetName: 'btn/Default',
              },
              mainComponentId: 'v1',
              componentProperties: { Size: { type: 'VARIANT', value: 'Large' } },
            },
            {
              id: '1:2',
              name: 'btn/Default',
              type: 'INSTANCE',
              mainComponent: {
                id: 'v2',
                name: 'Size=Small, State=Default',
                key: 'k2',
                componentSetId: 'set1',
                componentSetName: 'btn/Default',
              },
              mainComponentId: 'v2',
              componentProperties: { Size: { type: 'VARIANT', value: 'Small' } },
            },
          ],
        },
      ],
    };
    const variantDispatch: ToolDispatcher = async tool => {
      if (tool === GET_DESIGN_CONTEXT_TOOL_NAME) return variantContext;
      throw new Error(`unexpected dispatch: ${tool}`);
    };

    await writeFile(
      join(dir, 'docs', 'figma-component-map.md'),
      'btn/Default -> src/components/Button.tsx\n',
    );
    const result = await handleComponentMap(variantDispatch, { rootDir: dir });

    const btn = result.mappings.filter(m => m.figmaComponentName === 'btn/Default');
    expect(btn).toHaveLength(1);
    expect(btn[0]?.instanceCount).toBe(2);

    expect(btn[0]?.instances).toEqual([
      { nodeId: '1:1', props: { Size: 'Large' } },
      { nodeId: '1:2', props: { Size: 'Small' } },
    ]);

    expect(btn[0]?.source).toBe('map-file');
    expect(btn[0]?.candidate?.name).toBe('Button');
  });

  it('exposes a stable tool name', () => {
    expect(COMPONENT_MAP_TOOL_NAME).toBe('component_map');
  });
});
