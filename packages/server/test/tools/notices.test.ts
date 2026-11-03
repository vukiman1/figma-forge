import type { CallToolResult } from '@modelcontextprotocol/server';
import { describe, expect, it } from 'vitest';

import { captureNotices, reportSkew, withSkewNotice } from '../../src/tools/notices.js';

const result = (text: string): CallToolResult => ({ content: [{ type: 'text', text }] });
const NOTICE = 'Figma Forge plugin v0.3.0 is older than this server (v0.4.0).';

const textOf = (from: CallToolResult, index: number): string => {
  const block = from.content[index];
  return block !== undefined && block.type === 'text' ? block.text : '';
};

describe('captureNotices', () => {
  it('scopes a report to the call that caused it', async () => {
    const captured = await captureNotices(
      async () => {
        reportSkew(NOTICE);
        return result('{}');
      },
      (r, notices) => withSkewNotice(r, notices.skew),
    );

    expect(captured.content).toHaveLength(2);
  });

  it('carries the warning on the very first call, not from the call before', async () => {
    let first: string | null = 'unset';
    await captureNotices(
      async () => {
        reportSkew(NOTICE);
        return result('{}');
      },
      (r, notices) => {
        first = notices.skew;
        return r;
      },
    );

    expect(first).toBe(NOTICE);
  });

  it('does not leak a warning into the next call', async () => {
    await captureNotices(
      async () => {
        reportSkew(NOTICE);
        return result('{}');
      },
      r => r,
    );

    let second: string | null = 'unset';
    await captureNotices(
      async () => result('{}'),
      (r, notices) => {
        second = notices.skew;
        return r;
      },
    );

    expect(second).toBeNull();
  });

  it('keeps the warning when a call reaches several plugins and any one is old', async () => {
    let notice: string | null = 'unset';
    await captureNotices(
      async () => {
        reportSkew(NOTICE);
        reportSkew(null);
        return result('{}');
      },
      (r, notices) => {
        notice = notices.skew;
        return r;
      },
    );

    expect(notice).toBe(NOTICE);
  });

  it('attaches the warning to a failure, where it explains the failure', async () => {
    await expect(
      captureNotices(
        async () => {
          reportSkew(NOTICE);
          throw new Error('METHOD_NOT_FOUND: no sandbox handler (method=export_video)');
        },
        r => r,
      ),
    ).rejects.toThrow(/METHOD_NOT_FOUND[\s\S]*OUT OF DATE[\s\S]*older than this server/);
  });

  it('leaves a failure untouched when the plugin is current', async () => {
    const original = new Error('node not found');
    await expect(
      captureNotices(
        () => Promise.reject(original),
        r => r,
      ),
    ).rejects.toBe(original);
  });

  it('ignores a report made outside any call', () => {
    expect(() => reportSkew(NOTICE)).not.toThrow();
  });
});

describe('withSkewNotice', () => {
  it('appends the warning without disturbing the result the agent asked for', () => {
    const out = withSkewNotice(result('{"nodes":[]}'), NOTICE);

    expect(out.content).toHaveLength(2);
    expect(out.content[0]).toEqual({ type: 'text', text: '{"nodes":[]}' });
    expect(textOf(out, 1)).toContain(NOTICE);
  });

  it('separates the warning from the payload it warns about', () => {
    const out = withSkewNotice(result('{"ok":true}'), NOTICE);
    const appended = textOf(out, 1);

    expect(appended.startsWith('\n\n')).toBe(true);
    expect(appended).toMatch(/OUT OF DATE/);
  });

  it('warns regardless of how the tool is labelled, since a notice means it dispatched', () => {
    expect(withSkewNotice(result('{"ok":true}'), NOTICE).content).toHaveLength(2);
    expect(withSkewNotice(result('{"components":[]}'), NOTICE).content).toHaveLength(2);
  });

  it('leaves a result alone when nothing dispatched', () => {
    const untouched = result('{"framework":"vue"}');
    expect(withSkewNotice(untouched, null)).toBe(untouched);
  });
});
