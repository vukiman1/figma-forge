import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIN_PLUGIN_VERSION } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { ALL_TOOL_SPECS } from '../src/tools/registry.js';
import {
  collect,
  derivePluginContract,
  diffContracts,
  type PluginToolContract,
  scanInjectedArgs,
} from './plugin-contract.js';

const CONTRACT_PATH = join(dirname(fileURLToPath(import.meta.url)), 'plugin-contract.json');

interface RecordedContract {
  minPluginVersion: string;
  tools: PluginToolContract;
}

const write = (contract: RecordedContract): void => {
  writeFileSync(CONTRACT_PATH, `${JSON.stringify(contract, null, 2)}\n`);
};

const derived = derivePluginContract();

if (process.env.UPDATE_PLUGIN_CONTRACT === '1') {
  write({ minPluginVersion: MIN_PLUGIN_VERSION, tools: derived });
}
if (!existsSync(CONTRACT_PATH)) {
  throw new Error(
    `${CONTRACT_PATH} is missing — it is committed, so this is a deleted or unmerged file, not a ` +
      'first run. Restore it from git; regenerate only if you know the recorded surface is wrong: ' +
      'UPDATE_PLUGIN_CONTRACT=1 pnpm test plugin-contract && pnpm format',
  );
}

const recorded = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8')) as RecordedContract;

const driftReport = (): string => {
  const drift = diffContracts(recorded.tools, derived);
  if (
    drift.addedTools.length === 0 &&
    drift.removedTools.length === 0 &&
    drift.addedArgs.length === 0 &&
    drift.removedArgs.length === 0
  ) {
    return '';
  }

  const lines = [
    'The plugin-facing argument surface changed. Decide what it means, then re-record:',
    '',
  ];

  if (drift.addedArgs.length > 0) {
    lines.push(
      `  SILENT on older plugins — ${drift.addedArgs.length} new argument(s) on existing tools:`,
      ...drift.addedArgs.map(a => `    + ${a}`),
      '    A handler that predates these drops them and still answers { ok: true }.',
      `    Raise MIN_PLUGIN_VERSION (now ${MIN_PLUGIN_VERSION}) to the version that ships them.`,
      '',
    );
  }
  if (drift.removedArgs.length > 0 || drift.removedTools.length > 0) {
    lines.push(
      '  REMOVED — a plugin still sending/expecting these is now wrong:',
      ...drift.removedArgs.map(a => `    - ${a}`),
      ...drift.removedTools.map(t => `    - ${t} (whole tool)`),
      '    Raise MIN_PLUGIN_VERSION.',
      '',
    );
  }
  if (drift.addedTools.length > 0) {
    lines.push(
      '  LOUD on older plugins — new tools:',
      ...drift.addedTools.map(t => `    + ${t}`),
      '    An older plugin answers METHOD_NOT_FOUND, which is visible rather than silent, so this',
      '    class alone does not require raising the floor.',
      '',
    );
  }

  lines.push(
    `  Recorded floor: ${recorded.minPluginVersion}   Current floor: ${MIN_PLUGIN_VERSION}`,
    '  Re-record with: UPDATE_PLUGIN_CONTRACT=1 pnpm test plugin-contract && pnpm format',
  );
  return lines.join('\n');
};

describe('plugin argument contract', () => {
  it('matches the recorded contract', () => {
    expect(driftReport()).toBe('');
  });

  it('was recorded against the floor in force', () => {
    expect(recorded.minPluginVersion).toBe(MIN_PLUGIN_VERSION);
  });

  it('covers every tool that reaches the plugin, and nothing that does not', () => {
    expect(Object.keys(derived).length).toBeGreaterThan(100);
    expect(derived).not.toHaveProperty('analyze_project');
    expect(derived.set_layout_props).toContain('layoutSizingHorizontal');
    expect(derived.get_screenshot).toContain('forVision');
  });

  it('makes every local tool state whether it has a sandbox handler of its own', () => {
    const undeclared = ALL_TOOL_SPECS.filter(
      spec => spec.kind === 'local' && spec.serverOnlyArgs === undefined,
    ).map(spec => spec.name);
    expect(undeclared).toEqual([]);

    const owns = ALL_TOOL_SPECS.filter(
      spec =>
        spec.kind === 'local' && spec.serverOnlyArgs !== undefined && spec.serverOnlyArgs !== null,
    ).map(spec => spec.name);
    expect(owns.toSorted()).toEqual(['export_pdf', 'export_video', 'save_image_fills']);
    for (const name of owns) expect(derived).toHaveProperty(name);

    expect(derived).not.toHaveProperty('save_screenshots');
  });

  it('only excludes arguments the tool actually has', () => {
    for (const spec of ALL_TOOL_SPECS) {
      const serverOnly = spec.serverOnlyArgs;
      if (serverOnly === undefined || serverOnly === null) continue;
      const own = new Set<string>();
      collect(spec.inputSchema, '', own);
      for (const arg of serverOnly) {
        expect({ tool: spec.name, arg, inSchema: own.has(arg) }).toEqual({
          tool: spec.name,
          arg,
          inSchema: true,
        });
      }
    }
  });

  it('records every argument a handler-owning local tool is seen to dispatch', () => {
    const toolsRoot = join(dirname(fileURLToPath(import.meta.url)), '../src/tools');
    for (const spec of ALL_TOOL_SPECS) {
      if (
        spec.kind !== 'local' ||
        spec.serverOnlyArgs === undefined ||
        spec.serverOnlyArgs === null
      )
        continue;
      const file = join(toolsRoot, `${spec.name.replaceAll('_', '-')}.handler.ts`);
      const seen = [...scanInjectedArgs(readFileSync(file, 'utf8'))].toSorted();
      const recordedArgs = new Set(derived[spec.name] ?? []);
      expect({ tool: spec.name, missing: seen.filter(arg => !recordedArgs.has(arg)) }).toEqual({
        tool: spec.name,
        missing: [],
      });

      expect(seen.length).toBeGreaterThan(0);
    }
  });

  it('descends into nested and array arguments', () => {
    const batch = derived.batch ?? [];
    expect(batch.some(path => path.includes('[]'))).toBe(true);
  });

  it('has a declaration for every argument the server injects into a dispatch', () => {
    const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../src');
    const injected = new Set<string>();
    for (const entry of readdirSync(srcRoot, { recursive: true, encoding: 'utf8' })) {
      if (!entry.endsWith('.ts')) continue;
      for (const arg of scanInjectedArgs(readFileSync(join(srcRoot, entry), 'utf8'))) {
        injected.add(arg);
      }
    }

    expect(injected).toContain('forVision');
    expect(injected).toContain('budget');
    expect(injected).toContain('requestId');

    const declared = new Set(ALL_TOOL_SPECS.flatMap(spec => spec.injectedArgs ?? []));

    declared.add('requestId');

    for (const paths of Object.values(derived)) {
      for (const path of paths) declared.add(path.split('.')[0] ?? path);
    }

    expect([...injected].filter(arg => !declared.has(arg))).toEqual([]);
  });
});
