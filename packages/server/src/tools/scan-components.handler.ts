import { scanComponentsParams } from '@figma-forge/core';

import { analyzeProject, type ProjectProfile } from '../profile/profile.js';
import { truncationNote } from '../repo-walk.js';
import { scanComponents, type ScannedComponent } from '../scan/scan.js';

export interface ScanComponentsResult {
  components: ScannedComponent[];
  profile: ProjectProfile;
  /**
   * Present only when the walk's file cap was reached: says the result covers a subset of the repo,
   * so an absent match reads as "not in the part that was read" rather than "not in the project".
   */
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
