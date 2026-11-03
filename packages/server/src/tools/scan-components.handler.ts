import { scanComponentsParams } from '@figma-forge/core';

import { analyzeProject, type ProjectProfile } from '../profile/project-profile.js';
import { truncationNote } from '../repo-walk.js';
import { scanComponents } from '../scan/scan-components.js';
import type { ScannedComponent } from '../scan/scanned-component.js';

export interface ScanComponentsResult {
  components: ScannedComponent[];
  profile: ProjectProfile;
  truncationNote?: string;
}

export const handleScanComponents = async (rawArgs: unknown): Promise<ScanComponentsResult> => {
  const args = scanComponentsParams.parse(rawArgs);
  const rootDir = args.rootDir ?? process.cwd();
  const profile = await analyzeProject(rootDir);
  const extensions = args.extensions ?? profile.componentExtensions;
  const scanned = await scanComponents(rootDir, extensions);
  return {
    components: scanned.components,
    profile,
    ...(scanned.omitted > 0
      ? { truncationNote: truncationNote('source files', scanned.omitted) }
      : {}),
  };
};
