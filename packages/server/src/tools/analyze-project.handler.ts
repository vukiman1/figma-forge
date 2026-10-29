import { analyzeProjectParams } from '@figma-forge/core';

import { analyzeProject, type ProjectProfile } from '../profile/profile.js';

export const handleAnalyzeProject = async (rawArgs: unknown): Promise<ProjectProfile> => {
  const args = analyzeProjectParams.parse(rawArgs);
  return analyzeProject(args.rootDir ?? process.cwd());
};
