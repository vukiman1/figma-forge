import { existsSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PROMPT_DEFINITIONS } from '../../src/mcp/prompts/registry.js';
import { ALL_TOOL_SPECS } from '../../src/tools/registry/registry.js';
import { annotationsFor } from '../../src/tools/result/annotations.js';
import { toToolDefinition } from '../tools/registry/tool-schema.js';
import {
  type AdvertisedTool,
  canonical,
  DIST_ENTRY,
  type JsonSchemaNode,
  LATEST_CLIENT_PROTOCOL,
  WireClient,
} from './mcp-wire-fixtures.js';

describe.skipIf(!existsSync(DIST_ENTRY))('MCP wire contract (built dist)', () => {
  let client: WireClient;

  let initResult: Record<string, unknown>;

  let tools: AdvertisedTool[];

  beforeAll(async () => {
    client = new WireClient();
    await client.start();
    initResult = await client.handshake(LATEST_CLIENT_PROTOCOL);
    const res = await client.send('tools/list');
    tools = (res.result?.tools ?? []) as AdvertisedTool[];
  }, 30_000);

  afterAll(async () => {
    await client?.stop();
  });

  it('negotiates the protocol version and advertises its capabilities', () => {
    expect(initResult.protocolVersion).toBe(LATEST_CLIENT_PROTOCOL);
    expect(initResult.serverInfo).toMatchObject({ name: 'figma-forge' });

    expect(initResult.capabilities).toMatchObject({ tools: {}, prompts: {} });
  });

  it('answers the transport-level ping this era still defines', async () => {
    const res = await client.send('ping');
    expect(res.error).toBeUndefined();
    expect(res.result).toEqual({});
  });

  it('sends instructions a client can fold into the model prompt', () => {
    const instructions = initResult.instructions as string | undefined;
    expect(instructions).toBeTypeOf('string');
    expect(instructions).toContain('get_design_context');
    expect(instructions).toContain('get_screenshot');

    expect(instructions?.length).toBeLessThan(2_000);

    const cited = [...new Set([...(instructions ?? '').matchAll(/`([a-z_]+)`/g)].map(m => m[1]))];
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.filter(name => !tools.some(t => t.name === name))).toEqual([]);
  });

  it('advertises exactly the registered tool set', () => {
    expect(tools.map(t => t.name).toSorted()).toEqual(ALL_TOOL_SPECS.map(s => s.name).toSorted());
  });

  it('advertises each tool with the JSON Schema its spec declares', () => {
    const mismatched = ALL_TOOL_SPECS.flatMap(spec => {
      const advertised = tools.find(t => t.name === spec.name);
      const expected = toToolDefinition(spec);
      if (advertised === undefined) return [{ tool: spec.name, got: '<not advertised>', want: '' }];
      const got = canonical(advertised.inputSchema);
      const want = canonical(expected.inputSchema);
      if (advertised.description === expected.description && got === want) return [];
      return [{ tool: spec.name, got, want }];
    });
    expect(mismatched.slice(0, 2)).toEqual([]);
  });

  it('advertises a variable-alias member, with a required string id, in each Motion slot', () => {
    const schemaOf = (name: string): JsonSchemaNode =>
      tools.find(t => t.name === name)?.inputSchema ?? {};
    const aliasIn = (union: JsonSchemaNode | undefined): JsonSchemaNode | undefined =>
      union?.anyOf?.find(member => member.properties?.type?.const === 'VARIABLE_ALIAS');
    const expectAlias = (member: JsonSchemaNode | undefined): void => {
      expect(member?.properties?.id).toMatchObject({ type: 'string' });
      expect(member?.required).toEqual(expect.arrayContaining(['type', 'id']));
    };

    const track = schemaOf('apply_manual_keyframe_track').properties?.track;
    expectAlias(aliasIn(track?.properties?.keyframes?.items?.properties?.easing));
    const props = schemaOf('apply_animation_style').properties?.config?.properties?.props;
    expectAlias(aliasIn(props?.additionalProperties));
  });

  it('advertises the JSON Schema dialect the current spec revision expects', () => {
    const dialects = new Set(tools.map(t => t.inputSchema.$schema));
    expect([...dialects]).toEqual(['https://json-schema.org/draft/2020-12/schema']);
  });

  it('advertises the annotation values each tool kind is supposed to carry', () => {
    const advertised = (name: string): unknown => tools.find(t => t.name === name)?.annotations;
    expect(advertised('get_node')).toEqual({ readOnlyHint: true });
    expect(advertised('analyze_project')).toEqual({ readOnlyHint: true });
    expect(advertised('set_fills')).toEqual({ readOnlyHint: false, destructiveHint: false });
    expect(advertised('delete_nodes')).toEqual({ readOnlyHint: false, destructiveHint: true });
  });

  it('advertises annotations derived from each spec', () => {
    const mismatched = ALL_TOOL_SPECS.filter(
      spec =>
        JSON.stringify(tools.find(t => t.name === spec.name)?.annotations) !==
        JSON.stringify(annotationsFor(spec)),
    );
    expect(mismatched.map(s => s.name)).toEqual([]);
  });

  it('advertises every registered prompt with its argument list', async () => {
    const res = await client.send('prompts/list');
    const prompts = (res.result?.prompts ?? []) as { name: string }[];
    expect(prompts.map(p => p.name)).toEqual(PROMPT_DEFINITIONS.map(p => p.name));
    expect(prompts).toEqual(PROMPT_DEFINITIONS.map(p => expect.objectContaining({ ...p })));
  });

  it('serves every prompt to a prompts/get that omits arguments', async () => {
    const refused: string[] = [];
    for (const { name } of PROMPT_DEFINITIONS) {
      const res = await client.send('prompts/get', { name });
      const messages = res.result?.messages as unknown[] | undefined;
      if (res.error !== undefined || !messages?.length) refused.push(name);
    }
    expect(refused).toEqual([]);
  });
});
