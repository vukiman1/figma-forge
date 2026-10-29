import { describe, expect, it } from 'vitest';

import { detectProfile } from '../../src/profile/project-profile.js';
import { baseInput } from './profile-fixtures.js';

describe('class naming verdict', () => {
  it('reports no habit when the project has no preprocessor stylesheet', () => {
    const p = detectProfile(baseInput());
    expect(p.styling.classNaming).toBeUndefined();
    expect(p.evidence).toContain('classNaming=none: no preprocessor stylesheet found');
  });

  it('separates "no stylesheets" from "stylesheets, but no compound class" in the evidence', () => {
    const p = detectProfile(
      baseInput({ classNamingTally: { ampersand: 0, flat: 0, filesScanned: 7, omitted: 0 } }),
    );
    expect(p.styling.classNaming).toBeUndefined();
    expect(p.evidence.some(e => e.startsWith('classNaming=none: no compound class name'))).toBe(
      true,
    );
  });

  it('follows the plurality in either direction', () => {
    expect(
      detectProfile(
        baseInput({ classNamingTally: { ampersand: 30, flat: 2, filesScanned: 9, omitted: 0 } }),
      ).styling.classNaming,
    ).toBe('ampersand');
    expect(
      detectProfile(
        baseInput({ classNamingTally: { ampersand: 2, flat: 30, filesScanned: 9, omitted: 0 } }),
      ).styling.classNaming,
    ).toBe('flat');
  });

  it('answers flat below the floor, since a wrong `&` imposes the unsearchable spelling', () => {
    const p = detectProfile(
      baseInput({ classNamingTally: { ampersand: 4, flat: 0, filesScanned: 60, omitted: 0 } }),
    );
    expect(p.styling.classNaming).toBe('flat');
    expect(p.evidence.some(e => e.includes('below the floor'))).toBe(true);
  });

  it('accepts an `&` habit once it is established rather than incidental', () => {
    expect(
      detectProfile(
        baseInput({ classNamingTally: { ampersand: 5, flat: 0, filesScanned: 60, omitted: 0 } }),
      ).styling.classNaming,
    ).toBe('ampersand');
  });

  it('breaks a tie toward flat, the spelling that can be searched for', () => {
    const p = detectProfile(
      baseInput({ classNamingTally: { ampersand: 4, flat: 4, filesScanned: 3, omitted: 0 } }),
    );
    expect(p.styling.classNaming).toBe('flat');
  });

  it('says how many stylesheets the class-naming vote did not see', () => {
    const p = detectProfile(
      baseInput({ classNamingTally: { ampersand: 9, flat: 1, filesScanned: 400, omitted: 2600 } }),
    );
    expect(p.styling.classNaming).toBe('ampersand');
    expect(p.evidence.some(e => e.includes('2600 more not read — file cap'))).toBe(true);
  });
});
