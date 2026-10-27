import { describe, expect, it } from 'vitest';

import {
  checkPluginCompatibility,
  compareVersions,
  MIN_PLUGIN_VERSION,
  pluginSkewNotice,
  pluginSkewSummary,
  requiredPluginVersion,
} from '../../src/index.js';

describe('compareVersions', () => {
  it('orders by numeric core, not lexically', () => {
    expect(compareVersions('0.9.0', '0.10.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
    expect(compareVersions('0.4.0', '0.4.0')).toBe(0);
    expect(compareVersions('0.4.1', '0.4.0')).toBeGreaterThan(0);
  });

  it('ranks a prerelease below the release it leads to', () => {
    expect(compareVersions('0.4.0-beta.1', '0.4.0')).toBeLessThan(0);
    expect(compareVersions('0.4.0', '0.4.0-beta.1')).toBeGreaterThan(0);
    expect(compareVersions('0.4.0-beta.2', '0.4.0-beta.10')).toBeLessThan(0);
    expect(compareVersions('0.4.0-alpha', '0.4.0-beta')).toBeLessThan(0);
    expect(compareVersions('0.4.0-beta', '0.4.0-beta.1')).toBeLessThan(0);
  });

  it('ignores build metadata', () => {
    expect(compareVersions('0.4.0+abc', '0.4.0')).toBe(0);
  });

  it('reports null for anything this product could not have produced', () => {
    expect(compareVersions('0.4', '0.4.0')).toBeNull();
    expect(compareVersions('', '0.4.0')).toBeNull();
    expect(compareVersions('latest', '0.4.0')).toBeNull();
    expect(compareVersions('v0.4.0', '0.4.0')).toBeNull();
  });
});

describe('requiredPluginVersion', () => {
  it('is the floor once the server has caught up to it', () => {
    expect(requiredPluginVersion(MIN_PLUGIN_VERSION)).toBe(MIN_PLUGIN_VERSION);
    expect(requiredPluginVersion('9.9.9')).toBe(MIN_PLUGIN_VERSION);
  });

  it('never exceeds the server itself', () => {
    expect(requiredPluginVersion('0.4.0')).toBe('0.4.0');
    expect(requiredPluginVersion('0.3.0')).toBe('0.3.0');
    expect(requiredPluginVersion('0.1.0')).toBe('0.1.0');
  });
});

describe('pluginSkewNotice', () => {
  it('says what may be wrong, not merely that versions differ', () => {
    const notice = pluginSkewNotice('0.3.0', '0.4.0');
    expect(notice).toContain('v0.3.0');
    expect(notice).toContain('v0.4.0');
    expect(notice).toMatch(/silently ignored/i);
    expect(notice).toMatch(/only part of what was asked/i);
    expect(notice).toMatch(/unverified/i);
    expect(notice).toMatch(/Update the plugin/);
    expect(notice).not.toMatch(/tell the user/i);
    expect(notice).toContain('pnpm build');
    expect(notice).toContain('manifest.json and dist');
  });

  it('opens with the summary, so the two forms cannot drift apart', () => {
    expect(pluginSkewNotice('0.3.0', '0.4.0')).toContain(pluginSkewSummary('0.3.0', '0.4.0'));
  });

  it('states the consequence and both versions in the short form too', () => {
    const summary = pluginSkewSummary('0.3.0', '0.4.0');
    expect(summary).toContain('v0.3.0');
    expect(summary).toContain('v0.4.0');
    expect(summary).toMatch(/unverified/i);
    expect(summary.length).toBeLessThan(pluginSkewNotice('0.3.0', '0.4.0').length / 2);
  });

  it('quotes a version it cannot parse instead of dressing it up', () => {
    expect(pluginSkewNotice('nightly', '0.4.0')).toContain('"nightly"');
    expect(pluginSkewNotice('nightly', '0.4.0')).not.toContain('vnightly');
  });
});

describe('checkPluginCompatibility', () => {
  it('is satisfied at or above the threshold', () => {
    expect(checkPluginCompatibility('0.4.0', '0.4.0')).toBe(true);
    expect(checkPluginCompatibility('0.4.1', '0.4.0')).toBe(true);
    expect(checkPluginCompatibility('0.5.0', '0.4.0')).toBe(true);
  });

  it('is not satisfied below the threshold', () => {
    expect(checkPluginCompatibility('0.3.0', '0.4.0')).toBe(false);
    expect(checkPluginCompatibility('0.4.0-beta.1', '0.4.0')).toBe(false);
  });

  it('is satisfied by a same-generation plugin while the threshold is ahead of the release', () => {
    expect(checkPluginCompatibility('0.3.0', '0.3.0')).toBe(true);
  });

  it('is not satisfied by a version it cannot identify', () => {
    expect(checkPluginCompatibility('unknown', '0.4.0')).toBe(false);
    expect(checkPluginCompatibility('', '0.4.0')).toBe(false);
  });
});
