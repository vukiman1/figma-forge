import { existsSync } from 'node:fs';

import { CLIENT_MESSAGE_LIMIT_BYTES, NODE_LIST_BUDGET_BYTES } from '@figma-forge/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ALL_TOOL_SPECS } from '../../src/tools/registry/registry.js';
import { closeSocket, connectFakePlugin } from './_helpers.js';
import {
  DIST_ENTRY,
  type JsonRpcResponse,
  LATEST_CLIENT_PROTOCOL,
  MODERN_CLIENT_PROTOCOL,
  OLDEST_CLIENT_PROTOCOL,
  WireClient,
} from './mcp-wire-fixtures.js';

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

  it('rejects a batch whose inner op could not have worked, without a plugin in the room', async () => {
    const res = await client.send('tools/call', {
      name: 'batch',
      arguments: {
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'fine' } },
          { tool: 'set_opacity', params: { nodeId: '1:1', opacity: 'half' } },
        ],
      },
    });
    expect(res.result?.isError).toBe(true);
    const content = res.result?.content as { type: string; text: string }[];
    expect(content[0]?.text).toMatch(/ops\[1\]/);
    expect(content[0]?.text).toMatch(/opacity/);
  });

  it('rejects a call to a tool it does not advertise', async () => {
    const res = await client.send('tools/call', { name: 'no_such_tool', arguments: {} });
    expect(res.error?.code).toBe(-32602);
  });

  describe('results near the client message limit', () => {
    const nodes = (count: number): Record<string, unknown>[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `1:${i}`,
        type: 'FRAME',
        name: 'n'.repeat(1_300),
      }));

    const textOf = (res: JsonRpcResponse): string => {
      const content = res.result?.content as { type: string; text: string }[] | undefined;
      return content?.[0]?.text ?? '';
    };

    const withPlugin = async (
      handlers: Record<string, (params: unknown) => unknown>,
      run: (server: WireClient) => Promise<void>,
    ): Promise<void> => {
      const server = new WireClient();
      await server.start();
      await server.handshake(LATEST_CLIENT_PROTOCOL);
      const plugin = await connectFakePlugin({ port: server.port, handlers });
      try {
        await run(server);

        const after = await server.send('tools/call', { name: 'ping', arguments: {} });
        expect(after.result).toBeDefined();
      } finally {
        closeSocket(plugin);
        await server.stop();
      }
    };

    it('trims a node list past the limit, leading with a note and the full match count', async () => {
      await withPlugin({ search_nodes: () => ({ nodes: nodes(9_000) }) }, async server => {
        const res = await server.send('tools/call', {
          name: 'search_nodes',
          arguments: { type: 'FRAME' },
        });
        expect(server.lineBytes.get(2)).toBeLessThan(CLIENT_MESSAGE_LIMIT_BYTES);
        const payload = JSON.parse(textOf(res)) as {
          note: string;
          matchCount: number;
          nodes: { id: string }[];
        };
        expect(Object.keys(payload)).toEqual(['note', 'matchCount', 'nodes']);
        expect(payload.matchCount).toBe(9_000);
        expect(payload.nodes.length).toBeGreaterThan(7_000);
        expect(payload.nodes.map(n => n.id)).toEqual(nodes(payload.nodes.length).map(n => n.id));
        expect(payload.note).toMatch(/of 9,000 matching nodes/);
      });
    }, 60_000);

    it('delivers a node list just under the limit whole, with no note', async () => {
      const escaped = (value: unknown): number =>
        Buffer.byteLength(JSON.stringify(JSON.stringify(value))) - 2;
      let used = escaped({ nodes: [] });
      let count = 0;
      for (const node of nodes(10_000)) {
        const next = used + escaped(node) + (count > 0 ? 1 : 0);
        if (next > NODE_LIST_BUDGET_BYTES - 1_024) break;
        used = next;
        count += 1;
      }
      await withPlugin({ search_nodes: () => ({ nodes: nodes(count) }) }, async server => {
        const res = await server.send('tools/call', {
          name: 'search_nodes',
          arguments: { type: 'FRAME' },
        });
        const payload = JSON.parse(textOf(res)) as { note?: string; nodes: unknown[] };
        expect(payload.note).toBeUndefined();
        expect(payload.nodes).toHaveLength(count);
      });
    }, 60_000);

    it('refuses a tree past the limit with an error the model can read, not a dropped line', async () => {
      const tree = { pageId: '0:1', pageName: 'Page', children: nodes(9_000) };
      await withPlugin({ get_document: () => tree }, async server => {
        const res = await server.send('tools/call', { name: 'get_document', arguments: {} });
        expect(res.result?.isError).toBe(true);
        expect(textOf(res)).toMatch(/get_document: the result is .* MB, more than the 10\.0 MB/);
      });
    }, 60_000);
  });

  it('still serves a client that opens with the oldest supported protocol revision', async () => {
    const old = new WireClient();
    await old.start();
    try {
      const result = await old.handshake(OLDEST_CLIENT_PROTOCOL);
      expect(result.protocolVersion).toBe(OLDEST_CLIENT_PROTOCOL);
      const res = await old.send('tools/list');
      expect((res.result?.tools as unknown[] | undefined)?.length).toBe(ALL_TOOL_SPECS.length);
    } finally {
      await old.stop();
    }
  }, 30_000);

  it('serves the 2026-07-28 revision to a client that claims it', async () => {
    const modern = new WireClient();
    await modern.start();
    try {
      const meta = {
        'io.modelcontextprotocol/protocolVersion': MODERN_CLIENT_PROTOCOL,
        'io.modelcontextprotocol/clientCapabilities': {},
      };
      const discover = await modern.send('server/discover', { _meta: meta });
      expect(discover.result?.supportedVersions).toEqual([MODERN_CLIENT_PROTOCOL]);
      expect(discover.result?.capabilities).toMatchObject({ tools: {}, prompts: {} });

      const res = await modern.send('tools/list', { _meta: meta });
      expect((res.result?.tools as unknown[] | undefined)?.length).toBe(ALL_TOOL_SPECS.length);

      const gone = await modern.send('ping', { _meta: meta });
      expect(gone.result).toBeUndefined();
      expect(gone.error?.code).toBe(-32_601);
    } finally {
      await modern.stop();
    }
  }, 30_000);

  it('exits cleanly when the client goes away mid-session', async () => {
    const live = new WireClient();
    await live.start();
    await live.handshake(LATEST_CLIENT_PROTOCOL);
    await live.send('tools/call', { name: 'ping', arguments: {} });

    const started = Date.now();
    const { code, escalated } = await live.stop();
    expect(escalated).toBe(false);
    expect(code).toBe(0);

    expect(Date.now() - started).toBeLessThan(4_000);
  }, 30_000);
});
