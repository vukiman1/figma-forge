import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const PLUGIN_ROOT = join(REPO_ROOT, 'packages/plugin');
const MCP_ROOT = join(REPO_ROOT, 'packages/mcp');
const BUNDLED_PLUGIN_DIR = join(MCP_ROOT, 'plugin');
const PLUGIN_FILES = ['manifest.json', 'dist/code.js', 'dist/index.html'] as const;
const LICENSE_FILE = 'LICENSE';

class MissingPluginBuildError extends Error {
  constructor(missing: readonly string[]) {
    super(`plugin build output missing — run the plugin build first: ${missing.join(', ')}`);
    this.name = 'MissingPluginBuildError';
  }
}

const assertPluginBuilt = (): void => {
  const missing = PLUGIN_FILES.map(file => join(PLUGIN_ROOT, file)).filter(
    path => !existsSync(path),
  );
  if (missing.length > 0) throw new MissingPluginBuildError(missing);
};

const bundlePlugin = (): void => {
  rmSync(BUNDLED_PLUGIN_DIR, { recursive: true, force: true });
  for (const file of PLUGIN_FILES) {
    const target = join(BUNDLED_PLUGIN_DIR, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(PLUGIN_ROOT, file), target);
  }
};

assertPluginBuilt();
bundlePlugin();
cpSync(join(REPO_ROOT, LICENSE_FILE), join(MCP_ROOT, LICENSE_FILE));
