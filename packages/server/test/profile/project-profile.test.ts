import { describe, expect, it } from 'vitest';

import { detectProfile } from '../../src/profile/project-profile.js';
import { baseInput } from './profile-fixtures.js';

describe('project profile', () => {
  it('flags ts when tsconfig present, js otherwise', () => {
    expect(detectProfile(baseInput({ hasTsconfig: true })).language).toBe('ts');
    expect(
      detectProfile(baseInput({ packageJson: { devDependencies: { typescript: '^5' } } })).language,
    ).toBe('ts');
    expect(detectProfile(baseInput()).language).toBe('js');
  });

  it('always records evidence for each conclusion', () => {
    const p = detectProfile(baseInput({ packageJson: { dependencies: { react: '^19' } } }));
    expect(p.evidence.some(e => e.startsWith('framework='))).toBe(true);
    expect(p.evidence.some(e => e.startsWith('styling='))).toBe(true);
    expect(p.evidence.some(e => e.startsWith('svg='))).toBe(true);
    expect(p.evidence.some(e => e.startsWith('classNaming='))).toBe(true);
  });
});
