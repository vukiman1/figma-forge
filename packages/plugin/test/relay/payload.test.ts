import { describe, expect, it } from 'vitest';

import { LONG_STRING_THRESHOLD, PREVIEW_CAP, summarizePayload } from '../../ui/relay/payload.js';

describe('summarizePayload', () => {
  it('pretty-prints a small result and reports its byte size', () => {
    const p = summarizePayload({ ok: true, nodeId: '3:21' });
    expect(p.truncated).toBe(false);
    expect(p.preview).toContain('"nodeId": "3:21"');
    expect(p.preview).toBe(JSON.stringify({ ok: true, nodeId: '3:21' }, null, 2));
    expect(p.bytes).toBe(JSON.stringify({ ok: true, nodeId: '3:21' }).length);
  });

  it('elides long binary-ish strings (base64) from the preview but counts them in bytes', () => {
    const base64 = 'A'.repeat(LONG_STRING_THRESHOLD + 5000);
    const p = summarizePayload({ images: [{ nodeId: '1:2', base64 }] });
    expect(p.preview).not.toContain(base64);
    expect(p.preview).toContain('chars elided');
    expect(p.bytes).toBeGreaterThan(LONG_STRING_THRESHOLD);
    expect(p.preview).toContain('"nodeId": "1:2"');
  });

  it('elides raw export bytes, which JSON would expand into one key per byte and turn a 4.4MB export into 51MB', () => {
    const bytes = new Uint8Array(64_000);
    const started = Date.now();
    const p = summarizePayload({ images: [{ nodeId: '1:2', base64: null, bytes }] });
    expect(p.preview).toContain('bytes elided');
    expect(p.preview).not.toMatch(/"0":\s*0/);
    expect(p.preview.length).toBeLessThan(500);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('counts binary by its real byteLength, as a msgpack bin costs, not by the elision placeholder', () => {
    const bytes = new Uint8Array(50_000);
    const withBinary = summarizePayload({ nodeId: '1:2', bytes });
    const withoutBinary = summarizePayload({ nodeId: '1:2' });
    expect(withBinary.bytes - withoutBinary.bytes).toBeGreaterThanOrEqual(50_000);
    expect(withBinary.bytes).toBeLessThan(60_000);
  });

  it('caps the preview and flags truncation for a result of many short strings that no per-string elision shrinks', () => {
    const big = Array.from({ length: 20_000 }, (_, i) => `item-${i}`);
    const p = summarizePayload({ big });
    expect(p.truncated).toBe(true);
    expect(p.preview.length).toBeLessThanOrEqual(PREVIEW_CAP + 40);
    expect(p.preview).toContain('truncated');
  });

  it('falls back to a string preview and zero bytes for a non-serializable (circular) result', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const p = summarizePayload(circular);
    expect(typeof p.preview).toBe('string');
    expect(p.truncated).toBe(false);
    expect(p.bytes).toBe(0);
  });
});
