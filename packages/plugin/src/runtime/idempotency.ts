import type { SandboxToolHandler } from './sandbox-handler.js';

export const DEFAULT_IDEMPOTENCY_TTL_MS = 60_000;

interface Entry {
  readonly result: unknown;
  readonly ts: number;
}

export interface IdempotencyCache {
  run(requestId: string | undefined, fn: () => unknown): Promise<unknown>;
  size(): number;
}

export const createIdempotencyCache = (
  ttlMs: number = DEFAULT_IDEMPOTENCY_TTL_MS,
  now: () => number = Date.now,
): IdempotencyCache => {
  const entries = new Map<string, Entry>();
  const prune = (): void => {
    const cutoff = now() - ttlMs;
    for (const [key, entry] of entries) if (entry.ts < cutoff) entries.delete(key);
  };
  return {
    async run(requestId, fn) {
      if (requestId === undefined) return fn();
      const hit = entries.get(requestId);
      if (hit !== undefined && now() - hit.ts < ttlMs) return hit.result;
      const result: unknown = await fn();
      entries.set(requestId, { result, ts: now() });
      prune();
      return result;
    },
    size: () => entries.size,
  };
};

const requestIdOf = (params: unknown): string | undefined => {
  if (typeof params !== 'object' || params === null || !('requestId' in params)) return undefined;
  return typeof params.requestId === 'string' ? params.requestId : undefined;
};

export const idempotent =
  (cache: IdempotencyCache, handler: SandboxToolHandler): SandboxToolHandler =>
  async params =>
    cache.run(requestIdOf(params), () => handler(params));
