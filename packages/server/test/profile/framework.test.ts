import { describe, expect, it } from 'vitest';

import { detectProfile } from '../../src/profile/project-profile.js';
import { baseInput } from './profile-fixtures.js';

describe('framework detection', () => {
  it('picks the meta-framework over the library it wraps (Next > React)', () => {
    const p = detectProfile(
      baseInput({ packageJson: { dependencies: { next: '^15.0.0', react: '^19.0.0' } } }),
    );
    expect(p.framework).toBe('next');
    expect(p.componentExtensions).toEqual(['.tsx', '.jsx']);
  });

  it('detects Nuxt over Vue and uses .vue extension', () => {
    const p = detectProfile(
      baseInput({ packageJson: { dependencies: { nuxt: '^3.0.0', vue: '^3.4.0' } } }),
    );
    expect(p.framework).toBe('nuxt');
    expect(p.componentExtensions).toEqual(['.vue']);
  });

  it('detects Solid from solid-js and scans the JSX extensions the React extractor parses', () => {
    const p = detectProfile(baseInput({ packageJson: { dependencies: { 'solid-js': '^1.8.0' } } }));
    expect(p.framework).toBe('solid');
    expect(p.componentExtensions).toEqual(['.tsx', '.jsx']);
  });

  it('detects Angular from @angular/core and scans .ts, where the scanner keeps @Component classes', () => {
    const p = detectProfile(
      baseInput({ packageJson: { dependencies: { '@angular/core': '^19.0.0' } } }),
    );
    expect(p.framework).toBe('angular');
    expect(p.componentExtensions).toEqual(['.ts']);
  });

  it('reports unknown and scans every component extension when no framework dependency is found', () => {
    const p = detectProfile(baseInput());
    expect(p.framework).toBe('unknown');
    expect(p.componentExtensions).toEqual(['.tsx', '.jsx', '.vue', '.svelte']);
  });
});
