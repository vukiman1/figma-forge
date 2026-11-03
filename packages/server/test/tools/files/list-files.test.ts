import type { ListFilesResult } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { PluginSessionInfo } from '../../../src/routing/sessions.js';
import { clearFileTarget, setFileTarget } from '../../../src/routing/target.js';
import {
  handleListFiles,
  type SessionDispatch,
} from '../../../src/tools/files/list-files.handler.js';

const session = (
  id: string,
  fileName: string | null,
  pageName: string | null = 'Page 1',
): PluginSessionInfo => ({ id, fileName, pageName, lastActivityAt: 1, pluginVersion: '0.5.0' });

const replying =
  (byId: Record<string, string>): SessionDispatch =>
  async (sessionId): Promise<ListFilesResult> => {
    const fileName = byId[sessionId];
    if (fileName === undefined) throw new Error(`plugin request timeout (session=${sessionId})`);
    return { files: [{ fileKey: null, fileName, currentPage: { id: 'p1', name: 'Page 1' } }] };
  };

afterEach(() => {
  clearFileTarget();
});

describe('handleListFiles', () => {
  it('asks every connected session, marking the routed one', async () => {
    const { files } = await handleListFiles(
      [session('s-1', 'Brand'), session('s-2', 'Marketing')],
      replying({ 's-1': 'Brand', 's-2': 'Marketing' }),
    );
    expect(files.map(f => [f.sessionId, f.fileName, f.routed, f.bound])).toEqual([
      ['s-1', 'Brand', true, false],
      ['s-2', 'Marketing', false, false],
    ]);
  });

  it('marks the claimed file', async () => {
    setFileTarget({ sessionId: 's-2', fileName: 'Marketing' });
    const { files } = await handleListFiles(
      [session('s-1', 'Brand'), session('s-2', 'Marketing')],
      replying({ 's-1': 'Brand', 's-2': 'Marketing' }),
    );

    expect(files.map(f => [f.sessionId, f.routed, f.bound])).toEqual([
      ['s-1', true, false],
      ['s-2', false, true],
    ]);
  });

  it('fills in a name the server never learned by asking the plugin', async () => {
    const { files } = await handleListFiles(
      [session('s-2', null, null)],
      replying({ 's-2': 'Hidden' }),
    );
    expect(files[0]?.fileName).toBe('Hidden');
    expect(files[0]?.error).toBeUndefined();
  });

  it('flags duplicate names, ignoring case', async () => {
    const { files } = await handleListFiles(
      [session('s-1', 'Brand'), session('s-2', 'brand'), session('s-3', 'Other')],
      replying({ 's-1': 'Brand', 's-2': 'brand', 's-3': 'Other' }),
    );
    expect(files.map(f => f.duplicateName)).toEqual([true, true, undefined]);
  });

  it('keeps listing the other files when one plugin does not answer', async () => {
    const { files } = await handleListFiles(
      [session('s-1', 'Brand'), session('s-2', 'Marketing')],
      replying({ 's-1': 'Brand' }),
    );
    expect(files[0]).toMatchObject({ fileName: 'Brand' });

    expect(files[1]).toMatchObject({ fileName: 'Marketing' });
    expect(files[1]?.error).toMatch(/timeout/);
  });

  it('is an empty list when no plugin is connected', async () => {
    expect(await handleListFiles([], replying({}))).toEqual({ files: [] });
  });
});
