import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const nativeBigInt = globalThis.BigInt;
const global = globalThis as { BigInt?: unknown };

const SHIMS = '../../src/runtime/shims.js';
const loadShims = async () => {
  vi.resetModules();
  await import(SHIMS);
};

describe('sandbox shims: BigInt', () => {
  afterEach(() => {
    global.BigInt = nativeBigInt;
  });

  it("restores the engine's own BigInt where the global is missing, as Figma's Developer VM leaves it", async () => {
    delete global.BigInt;
    await loadShims();
    expect(global.BigInt).toBe(nativeBigInt);
    expect(BigInt('9007199254740993')).toBe(9007199254740993n);
  });

  it('leaves a BigInt the environment already provides untouched', async () => {
    const provided = (value: unknown) => value;
    global.BigInt = provided;
    await loadShims();
    expect(global.BigInt).toBe(provided);
  });
});

const SANDBOX_BUNDLE = join(import.meta.dirname, '..', '..', 'dist', 'code.js');

describe.skipIf(!existsSync(SANDBOX_BUNDLE))('sandbox bundle (built dist)', () => {
  it('runs the BigInt shim before the first BigInt call', () => {
    const bundle = readFileSync(SANDBOX_BUNDLE, 'utf8');
    const shim = bundle.indexOf('0n.constructor');
    const firstCall = bundle.indexOf('BigInt(');
    expect(shim).toBeGreaterThanOrEqual(0);
    expect(firstCall).toBeGreaterThan(shim);
  });
});
