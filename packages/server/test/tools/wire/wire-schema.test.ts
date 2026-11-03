import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ErrorCode } from '@figma-forge/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { handleAnalyzeProject } from '../../../src/tools/codegen/analyze-project.handler.js';
import { handleComponentMap } from '../../../src/tools/codegen/component-map.handler.js';
import { handleDesignDiff } from '../../../src/tools/codegen/design-diff.handler.js';
import { handleIconMap } from '../../../src/tools/codegen/icon-map.handler.js';
import { handleScanComponents } from '../../../src/tools/codegen/scan-components.handler.js';
import { handleTokenMap } from '../../../src/tools/codegen/token-map.handler.js';
import { handleExportPdf } from '../../../src/tools/export/export-pdf.handler.js';
import { handleExportVideo } from '../../../src/tools/export/export-video.handler.js';
import { handleSaveImageFills } from '../../../src/tools/export/save-image-fills.handler.js';
import { handleSaveScreenshots } from '../../../src/tools/export/save-screenshots.handler.js';
import { handleUseFile } from '../../../src/tools/files/use-file.handler.js';
import { handleDesignContext } from '../../../src/tools/read/design-context-guard.js';
import { ALL_TOOL_SPECS } from '../../../src/tools/registry/registry.js';
import {
  checkBatchOps,
  WIRE_TOOL_SCHEMAS,
  wireToolSchema,
} from '../../../src/tools/wire/wire-schema.js';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'figma-forge-wire-schema-'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'fixture' }), 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('wireToolSchema', () => {
  it('drops server-only fields and admits the ones the server injects', () => {
    const schema = wireToolSchema(ALL_TOOL_SPECS.find(s => s.name === 'export_pdf')!)!;
    expect(schema.safeParse({ nodeId: '1:1', binary: true }).success).toBe(true);
    expect(Object.keys(schema.shape).toSorted()).toEqual(['binary', 'nodeId']);
  });

  it('admits the requestId a write carries without listing it on any spec', () => {
    const schema = wireToolSchema(ALL_TOOL_SPECS.find(s => s.name === 'rename_node')!)!;
    expect(schema.safeParse({ nodeId: '1:1', name: 'x', requestId: 'r-1' }).success).toBe(true);

    const read = wireToolSchema(ALL_TOOL_SPECS.find(s => s.name === 'get_selection')!)!;
    expect('requestId' in read.shape).toBe(false);
  });

  it('has no schema for a tool that borrows another tool’s sandbox handler', () => {
    expect(wireToolSchema(ALL_TOOL_SPECS.find(s => s.name === 'save_screenshots')!)).toBeNull();
    expect(WIRE_TOOL_SCHEMAS.has('save_screenshots')).toBe(false);
    expect(WIRE_TOOL_SCHEMAS.has('get_screenshot')).toBe(true);
  });

  it('accepts a field it has never heard of rather than rejecting it', () => {
    const schema = WIRE_TOOL_SCHEMAS.get('rename_node')!;
    const parsed = schema.safeParse({ nodeId: '1:1', name: 'x', fieldFromTheFuture: 42 });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty('fieldFromTheFuture');
  });
});

const ABORT = 'wire-schema-probe-abort';

const capturingDispatch = (): {
  seen: { toolName: string; args: unknown }[];
  dispatch: (toolName: string, args: unknown) => Promise<never>;
} => {
  const seen: { toolName: string; args: unknown }[] = [];
  return {
    seen,
    dispatch: (toolName, args) => {
      seen.push({ toolName, args });
      return Promise.reject(new Error(ABORT));
    },
  };
};

describe('server-built plugin payloads satisfy the schema the leader validates', () => {
  const cases = (): {
    tool: string;
    label: string;
    run: (dispatch: (toolName: string, args: unknown) => Promise<never>) => Promise<unknown>;
    expected: string[];
  }[] => [
    {
      tool: 'get_design_context',
      label: 'get_design_context (guarded public path)',
      run: d => handleDesignContext(d, { nodeId: '1:1' }),
      expected: ['get_design_context'],
    },
    {
      tool: 'get_design_context',
      label: 'get_design_context (no nodeId — the selection path)',
      run: d => handleDesignContext(d, {}),
      expected: ['get_design_context'],
    },
    {
      tool: 'component_map',
      label: 'component_map',
      run: d => handleComponentMap(d, { rootDir: root, nodeId: '1:1' }),
      expected: ['get_design_context'],
    },
    {
      tool: 'design_diff',
      label: 'design_diff',
      run: d => handleDesignDiff(d, { rootDir: root, nodeId: '1:1' }),
      expected: ['get_design_context'],
    },
    {
      tool: 'token_map',
      label: 'token_map',
      run: d => handleTokenMap(d, { rootDir: root }),
      expected: ['get_variable_defs', 'get_styles'],
    },
    {
      tool: 'save_screenshots',
      label: 'save_screenshots (defaults)',
      run: d => handleSaveScreenshots(d, { nodeIds: ['1:1'], outDir: root }),
      expected: ['get_screenshot'],
    },
    {
      tool: 'save_screenshots',
      label: 'save_screenshots (explicit format and scale)',
      run: d =>
        handleSaveScreenshots(d, { nodeIds: ['1:1'], outDir: root, format: 'JPG', scale: 2 }),
      expected: ['get_screenshot'],
    },
    {
      tool: 'save_image_fills',
      label: 'save_image_fills',
      run: d => handleSaveImageFills(d, { nodeIds: ['1:1'], outDir: root }),
      expected: ['save_image_fills'],
    },
    {
      tool: 'export_pdf',
      label: 'export_pdf (with nodeId)',
      run: d => handleExportPdf(d, { nodeId: '1:1', outPath: join(root, 'out.pdf') }),
      expected: ['export_pdf'],
    },
    {
      tool: 'export_pdf',
      label: 'export_pdf (current page)',
      run: d => handleExportPdf(d, { outPath: join(root, 'out.pdf') }),
      expected: ['export_pdf'],
    },
    {
      tool: 'export_video',
      label: 'export_video',
      run: d =>
        handleExportVideo(d, { nodeId: '1:1', format: 'MP4', outPath: join(root, 'out.mp4') }),
      expected: ['export_video'],
    },
    {
      tool: 'icon_map',
      label: 'icon_map',
      run: d => handleIconMap(d, { rootDir: root, nodeId: '1:1' }),
      expected: ['get_design_context'],
    },
    {
      tool: 'use_file',
      label: 'use_file (asks every connected session which file it is in)',

      run: d =>
        handleUseFile(
          {},
          async () => [
            {
              id: 's-1',
              fileName: 'A',
              pageName: 'Page 1',
              lastActivityAt: 1,
              pluginVersion: '0.5.0',
            },
          ],
          (_sessionId, toolName, args) => d(toolName, args),
        ),
      expected: ['list_files'],
    },
  ];

  it.each(cases())('$label', async ({ run, expected }) => {
    const { seen, dispatch } = capturingDispatch();
    await run(dispatch).catch((err: unknown) => {
      if (!(err instanceof Error) || err.message !== ABORT) throw err;
    });

    expect(seen.map(s => s.toolName)).toEqual(expected);
    for (const { toolName, args } of seen) {
      const schema = WIRE_TOOL_SCHEMAS.get(toolName);

      expect(schema, `no wire schema for ${toolName}`).toBeDefined();
      const parsed = schema!.safeParse(args ?? {});
      expect(
        parsed.success ? null : `${toolName}: ${JSON.stringify(parsed.error?.issues)}`,
      ).toBeNull();

      const allowed = new Set(Object.keys(schema!.shape));
      const stray = Object.keys((args ?? {}) as Record<string, unknown>).filter(
        key => !allowed.has(key),
      );
      expect(stray, `${toolName} payload carries keys the plugin has no argument for`).toEqual([]);
    }
  });

  it('covers every local tool that builds a plugin payload', async () => {
    const noDispatch: Record<string, (rawArgs: unknown) => Promise<unknown>> = {
      analyze_project: handleAnalyzeProject,
      scan_components: handleScanComponents,
    };
    for (const [name, handler] of Object.entries(noDispatch)) {
      expect(handler.length, `${name} takes a dispatcher — it belongs in the case list`).toBe(1);
    }

    const covered = new Set([...cases().map(c => c.tool), ...Object.keys(noDispatch)]);
    const uncovered = ALL_TOOL_SPECS.filter(
      spec => spec.kind === 'local' && !covered.has(spec.name),
    ).map(spec => spec.name);
    expect(uncovered).toEqual([]);
  });
});

describe('checkBatchOps', () => {
  const batch = (ops: unknown[]): unknown => ({ ops });

  it('passes a batch whose ops each match the schema of the tool they name', () => {
    expect(
      checkBatchOps(
        batch([
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'set_opacity', params: { nodeId: '1:1', opacity: 0.5 } },
          { tool: 'move_nodes', params: { nodeIds: ['1:2'], dx: 5, dy: -5 } },
        ]),
      ),
    ).toBeNull();
  });

  it('names the op index and its tool when arguments are missing', () => {
    const rejection = checkBatchOps(
      batch([
        { tool: 'rename_node', params: { nodeId: '1:1', name: 'ok' } },
        { tool: 'set_fills', params: { nodeId: '1:1' } },
      ]),
    );
    expect(rejection?.code).toBe(ErrorCode.InvalidParams);
    expect(rejection?.message).toMatch(/ops\[1\]/);
    expect(rejection?.message).toMatch(/set_fills/);
    expect(rejection?.message).toMatch(/fills/);
  });

  it('catches an argument of the wrong type, which the sandbox would act on', () => {
    const rejection = checkBatchOps(
      batch([{ tool: 'set_opacity', params: { nodeId: '1:1', opacity: 'half' } }]),
    );
    expect(rejection?.code).toBe(ErrorCode.InvalidParams);
    expect(rejection?.message).toMatch(/opacity/);
  });

  it('refuses an op naming a tool no sandbox handler exists for', () => {
    for (const tool of ['not_a_tool', 'token_map']) {
      const rejection = checkBatchOps(batch([{ tool, params: {} }]));
      expect(rejection?.code).toBe(ErrorCode.MethodNotFound);
      expect(rejection?.message).toMatch(new RegExp(tool));
    }
  });

  it('leaves "which tools may be batched" to the plugin', () => {
    expect(
      checkBatchOps(batch([{ tool: 'delete_nodes', params: { nodeIds: ['1:1'] } }])),
    ).toBeNull();
  });

  it('treats an omitted params the way the sandbox does', () => {
    expect(checkBatchOps(batch([{ tool: 'create_frame' }]))).toBeNull();
    expect(checkBatchOps(batch([{ tool: 'rename_node' }]))?.code).toBe(ErrorCode.InvalidParams);
  });

  it('accepts a field it has never heard of, exactly as the top level does', () => {
    expect(
      checkBatchOps(
        batch([{ tool: 'rename_node', params: { nodeId: '1:1', name: 'x', fromTheFuture: 1 } }]),
      ),
    ).toBeNull();
  });

  it('says nothing about a shape the batch schema itself rejects', () => {
    expect(checkBatchOps({})).toBeNull();
    expect(checkBatchOps({ ops: 'nope' })).toBeNull();
    expect(checkBatchOps(batch([{ params: {} }]))).toBeNull();
  });
});
