import type { ProjectInput } from '../../src/profile/project-input.js';

export const baseInput = (over: Partial<ProjectInput> = {}): ProjectInput => ({
  rootDir: '/proj',
  packageJson: null,
  hasTsconfig: false,
  presentConfigFiles: [],
  cssScanOmitted: 0,
  ...over,
});
