import { PLUGIN_DIR_ENV, type PluginInstallResult, PluginInstallStatus } from './install-plugin.js';

const importSteps = (manifestPath: string): string =>
  'The Figma Forge plugin is not connected. In the Figma desktop app (the browser version cannot ' +
  'import plugins), run Plugins → Development → Import plugin from manifest… and choose ' +
  `${manifestPath} — this is needed once per machine. Then run Plugins → Development → Figma Forge ` +
  'in the file to work on and wait for the panel to show Connected.';

export const pluginSetupHint = (result: PluginInstallResult): string => {
  switch (result.status) {
    case PluginInstallStatus.NotBundled:
      return (
        `This server build has no bundled plugin (${result.bundleDir} is missing). ` +
        'Run `pnpm build` in the figma-forge repo, or import packages/plugin/manifest.json from it.'
      );
    case PluginInstallStatus.Failed:
      return (
        `Copying the Figma Forge plugin to ${result.manifestPath} failed: ${result.reason}. ` +
        `Fix the folder permissions or set ${PLUGIN_DIR_ENV} to a writable folder, then restart.`
      );
    default:
      return importSteps(result.manifestPath);
  }
};

export const describePluginInstall = (result: PluginInstallResult): string => {
  switch (result.status) {
    case PluginInstallStatus.NotBundled:
      return `[figma-forge] no bundled plugin at ${result.bundleDir}`;
    case PluginInstallStatus.Failed:
      return `[figma-forge] plugin copy to ${result.manifestPath} failed: ${result.reason}`;
    default:
      return `[figma-forge] plugin ${result.status}: ${result.manifestPath}`;
  }
};
