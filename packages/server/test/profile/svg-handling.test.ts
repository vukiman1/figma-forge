import { describe, expect, it } from 'vitest';

import { detectProfile } from '../../src/profile/project-profile.js';
import { baseInput } from './profile-fixtures.js';

describe('svg import handling', () => {
  it('detects svg component mode + loader-specific import hint', () => {
    const svgr = detectProfile(
      baseInput({ packageJson: { dependencies: { 'vite-plugin-svgr': '^4' } } }),
    ).svg;
    expect(svgr).toEqual({
      mode: 'component',
      loader: 'vite-plugin-svgr',
      importHint: "import Icon from './icon.svg?react'",
    });

    const vue = detectProfile(
      baseInput({ packageJson: { dependencies: { 'vite-svg-loader': '^5' } } }),
    ).svg;
    expect(vue.mode).toBe('component');
    expect(vue.importHint).toContain('?component');

    const webpackSvgr = detectProfile(
      baseInput({ packageJson: { devDependencies: { '@svgr/webpack': '^8' } } }),
    ).svg;
    expect(webpackSvgr.importHint).toContain('ReactComponent');
  });

  it('resolves the Solid svg loader to its component-solid import form', () => {
    const p = detectProfile(
      baseInput({
        packageJson: {
          dependencies: { 'solid-js': '^1.8.0' },
          devDependencies: { 'vite-plugin-solid-svg': '^0.8.0' },
        },
      }),
    );
    expect(p.svg.mode).toBe('component');
    expect(p.svg.importHint).toBe("import Icon from './icon.svg?component-solid'");
  });

  it('falls back to svg url mode (no loader → no <Icon/>, just a URL)', () => {
    const svg = detectProfile(baseInput({ packageJson: { dependencies: { react: '^19' } } })).svg;
    expect(svg).toEqual({ mode: 'url' });
  });
});
