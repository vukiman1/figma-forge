import { access, cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { compareVersions } from '@figma-forge/core';

export const PLUGIN_DIR_ENV = 'FIGMA_FORGE_PLUGIN_DIR';

const DEFAULT_PLUGIN_DIR_NAME = 'Figma Forge';
const MANIFEST_FILE = 'manifest.json';
const VERSION_STAMP_FILE = '.version';

export enum PluginInstallStatus {
  Installed = 'installed',
  UpToDate = 'up-to-date',
  NewerPresent = 'newer-present',
  NotBundled = 'not-bundled',
  Failed = 'failed',
}

type CopyDecision =
  | PluginInstallStatus.Installed
  | PluginInstallStatus.UpToDate
  | PluginInstallStatus.NewerPresent;

export type PluginInstallResult =
  | { readonly status: CopyDecision; readonly manifestPath: string }
  | { readonly status: PluginInstallStatus.NotBundled; readonly bundleDir: string }
  | {
      readonly status: PluginInstallStatus.Failed;
      readonly manifestPath: string;
      readonly reason: string;
    };

export interface PluginInstallOptions {
  readonly bundleDir: string;
  readonly installDir: string;
  readonly version: string;
}

export const resolvePluginInstallDir = (override: string | undefined, home: string): string =>
  override === undefined || override === ''
    ? join(home, DEFAULT_PLUGIN_DIR_NAME)
    : resolve(override);

const exists = async (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

const readInstalledVersion = async (installDir: string): Promise<string | null> => {
  if (!(await exists(join(installDir, MANIFEST_FILE)))) return null;
  return readFile(join(installDir, VERSION_STAMP_FILE), 'utf8').then(
    text => text.trim(),
    () => null,
  );
};

const decideCopy = (installed: string | null, version: string): CopyDecision => {
  if (installed === null) return PluginInstallStatus.Installed;
  const order = compareVersions(installed, version);
  if (order === null || order < 0) return PluginInstallStatus.Installed;
  return order === 0 ? PluginInstallStatus.UpToDate : PluginInstallStatus.NewerPresent;
};

const copyBundle = async (options: PluginInstallOptions): Promise<void> => {
  await cp(options.bundleDir, options.installDir, { recursive: true, force: true });
  await writeFile(join(options.installDir, VERSION_STAMP_FILE), `${options.version}\n`);
};

export const installPlugin = async (
  options: PluginInstallOptions,
): Promise<PluginInstallResult> => {
  if (!(await exists(join(options.bundleDir, MANIFEST_FILE)))) {
    return { status: PluginInstallStatus.NotBundled, bundleDir: options.bundleDir };
  }
  const manifestPath = join(options.installDir, MANIFEST_FILE);
  try {
    const decision = decideCopy(await readInstalledVersion(options.installDir), options.version);
    if (decision === PluginInstallStatus.Installed) await copyBundle(options);
    return { status: decision, manifestPath };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: PluginInstallStatus.Failed, manifestPath, reason };
  }
};
