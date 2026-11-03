import { existsSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeSocket, connectFakePlugin } from './_helpers.js';
import { DIST_ENTRY, LATEST_CLIENT_PROTOCOL, WireClient } from './mcp-wire-fixtures.js';

describe.skipIf(!existsSync(DIST_ENTRY))('MCP wire contract (built dist)', () => {
  let client: WireClient;

  beforeAll(async () => {
    client = new WireClient();
    await client.start();
    await client.handshake(LATEST_CLIENT_PROTOCOL);
  }, 30_000);

  afterAll(async () => {
    await client?.stop();
  });

  it('answers a real tools/call without a plugin connected', async () => {
    const res = await client.send('tools/call', { name: 'ping', arguments: {} });
    const content = res.result?.content as { type: string; text: string }[];
    expect(content[0]?.type).toBe('text');

    expect(JSON.parse(content[0]?.text ?? '{}')).toMatchObject({
      ok: true,
      hop: 'server-only',
      plugin: null,
      server: { role: 'leader' },
    });
  });

  it('warns on a real tools/call when the connected plugin is out of date', async () => {
    const server = new WireClient();
    await server.start();
    await server.handshake(LATEST_CLIENT_PROTOCOL);
    const plugin = await connectFakePlugin({
      port: server.port,
      clientVersion: '0.0.1',
      handlers: { get_selection: () => ({ pageId: '1:1', pageName: 'Page 1', nodes: [] }) },
    });

    try {
      const res = await server.send('tools/call', { name: 'get_selection', arguments: {} });
      const content = res.result?.content as { type: string; text: string }[];

      expect(JSON.parse(content[0]?.text ?? '{}')).toMatchObject({ pageName: 'Page 1' });

      expect(content).toHaveLength(2);
      expect(content[1]?.text).toMatch(/OUT OF DATE/);
      expect(content[1]?.text).toMatch(/older than this server/i);
    } finally {
      closeSocket(plugin);
      await server.stop();
    }
  }, 30_000);

  it('explains a METHOD_NOT_FOUND from an out-of-date plugin instead of leaving it bare', async () => {
    const server = new WireClient();
    await server.start();
    await server.handshake(LATEST_CLIENT_PROTOCOL);
    const plugin = await connectFakePlugin({
      port: server.port,
      clientVersion: '0.0.1',

      handlers: {},
    });

    try {
      const res = await server.send('tools/call', { name: 'get_selection', arguments: {} });

      expect(res.result?.isError).toBe(true);
      const content = res.result?.content as { type: string; text: string }[];
      const text = content.map(c => c.text).join('');
      expect(text).toMatch(/OUT OF DATE/);
      expect(text).toMatch(/older than this server/i);
    } finally {
      closeSocket(plugin);
      await server.stop();
    }
  }, 30_000);

  it('leaves a real tools/call alone when the plugin is current', async () => {
    const server = new WireClient();
    await server.start();
    await server.handshake(LATEST_CLIENT_PROTOCOL);
    const plugin = await connectFakePlugin({
      port: server.port,
      handlers: { get_selection: () => ({ pageId: '1:1', pageName: 'Page 1', nodes: [] }) },
    });

    try {
      const res = await server.send('tools/call', { name: 'get_selection', arguments: {} });
      const content = res.result?.content as { type: string; text: string }[];

      expect(content).toHaveLength(1);
    } finally {
      closeSocket(plugin);
      await server.stop();
    }
  }, 30_000);
});
