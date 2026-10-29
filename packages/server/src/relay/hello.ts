import {
  checkPluginCompatibility,
  type Envelope,
  ErrorCode,
  type HelloParams,
  HelloParamsSchema,
  type HelloResult,
  pluginSkewNotice,
  PROTOCOL_VERSION,
  SystemMethod,
} from '@figma-forge/core';

import type { ErrorReply } from './envelopes.js';

export enum HelloVerdict {
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export type HelloOutcome =
  | { readonly verdict: HelloVerdict.Accepted; readonly params: HelloParams }
  | { readonly verdict: HelloVerdict.Rejected; readonly reply: ErrorReply };

const rejected = (reply: ErrorReply): HelloOutcome => ({ verdict: HelloVerdict.Rejected, reply });

const protocolMismatch = (requested: string): ErrorReply => ({
  code: ErrorCode.ProtocolMismatch,
  message:
    `protocol mismatch: server speaks ${PROTOCOL_VERSION}, plugin speaks ${requested} — ` +
    'update the older Figma Forge half so both match (server: @figma-forge/mcp, plugin: copy ' +
    'the latest release over the imported folder), then reopen this plugin in Figma',
  data: { reason: 'protocol', supported: PROTOCOL_VERSION, requested },
});

export const negotiateHello = (envelope: Envelope): HelloOutcome => {
  if (envelope.kind !== 'req' || envelope.method !== SystemMethod.Hello) {
    return rejected({ code: ErrorCode.InvalidRequest, message: 'first message must be $hello' });
  }
  const parsed = HelloParamsSchema.safeParse(envelope.params);
  if (!parsed.success) {
    return rejected({ code: ErrorCode.InvalidParams, message: 'invalid $hello params' });
  }
  if (parsed.data.protocolVersion !== PROTOCOL_VERSION) {
    return rejected(protocolMismatch(parsed.data.protocolVersion));
  }
  return { verdict: HelloVerdict.Accepted, params: parsed.data };
};

export const helloResult = (
  params: HelloParams,
  serverVersion: string,
  sessionResumed: boolean,
): HelloResult => ({
  serverVersion,
  protocolVersion: PROTOCOL_VERSION,
  sessionResumed,
  foregroundFlag: true,
  ...(checkPluginCompatibility(params.clientVersion, serverVersion)
    ? {}
    : { skewNotice: pluginSkewNotice(params.clientVersion, serverVersion) }),
});
