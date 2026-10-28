import { describe, expect, it } from 'vitest';

import { PluginInstallStatus } from '../../src/plugin-install/install-plugin.js';
import { pluginSetupHint } from '../../src/plugin-install/setup-hint.js';

const MANIFEST_PATH = '/Users/me/Figma Forge/manifest.json';

describe('pluginSetupHint', () => {
  it('walks the user through the one-time manifest import', () => {
    const hint = pluginSetupHint({
      status: PluginInstallStatus.UpToDate,
      manifestPath: MANIFEST_PATH,
    });
    expect(hint).toContain('Import plugin from manifest');
    expect(hint).toContain(MANIFEST_PATH);
    expect(hint).toContain('Figma desktop app');
  });

  it('points a source checkout at the build when no plugin is bundled', () => {
    const hint = pluginSetupHint({
      status: PluginInstallStatus.NotBundled,
      bundleDir: '/repo/packages/mcp/plugin/',
    });
    expect(hint).toContain('pnpm build');
  });

  it('names the failure and the override variable when the copy failed', () => {
    const hint = pluginSetupHint({
      status: PluginInstallStatus.Failed,
      manifestPath: MANIFEST_PATH,
      reason: 'EACCES: permission denied',
    });
    expect(hint).toContain('EACCES');
    expect(hint).toContain('FIGMA_FORGE_PLUGIN_DIR');
  });
});
