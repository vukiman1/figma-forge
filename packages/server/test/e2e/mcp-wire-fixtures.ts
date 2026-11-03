import { type ChildProcess, spawn } from 'node:child_process';
import { once as onExit } from 'node:events';
import { rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { leaderLockPath } from '../../src/election/leader-lock.js';
import { onText } from './_helpers.js';

export const DIST_ENTRY = join(import.meta.dirname, '..', '..', 'dist', 'index.mjs');
export const LATEST_CLIENT_PROTOCOL = '2025-11-25';
export const OLDEST_CLIENT_PROTOCOL = '2024-11-05';
export const MODERN_CLIENT_PROTOCOL = '2026-07-28';

export interface JsonRpcResponse {
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

export interface JsonSchemaNode {
  anyOf?: JsonSchemaNode[];
  additionalProperties?: JsonSchemaNode;
  const?: unknown;
  items?: JsonSchemaNode;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  type?: string;
}

export interface AdvertisedTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

const freePort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
};

export class WireClient {
  private child!: ChildProcess;
  private buffer = '';
  private readonly pending = new Map<number, (response: JsonRpcResponse) => void>();
  private nextId = 1;
  stderr = '';
  readonly lineBytes = new Map<number, number>();
  port = 0;

  async start(): Promise<void> {
    const port = await freePort();
    this.port = port;
    const child = spawn(process.execPath, [DIST_ENTRY], {
      env: { ...process.env, FIGMA_FORGE_PORT: String(port) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;
    onText(child.stderr, text => {
      this.stderr += text;
    });
    onText(child.stdout, text => {
      this.buffer += text;
      this.readMessages();
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    const wait = new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timed out waiting for ${method}\nstderr:\n${this.stderr}`));
      }, 15_000);
      timer.unref();
      this.pending.set(id, response => {
        clearTimeout(timer);
        resolve(response);
      });
    });
    this.child.stdin?.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return wait;
  }

  notify(method: string): void {
    this.child.stdin?.write(`${JSON.stringify({ jsonrpc: '2.0', method })}\n`);
  }

  async handshake(protocolVersion: string): Promise<Record<string, unknown>> {
    const response = await this.send('initialize', {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: 'figma-forge-wire-gate', version: '0' },
    });
    if (response.result === undefined) {
      throw new Error(`initialize failed: ${JSON.stringify(response.error)}`);
    }
    this.notify('notifications/initialized');
    return response.result;
  }

  async stop(): Promise<{ code: number | null; escalated: boolean }> {
    rmSync(leaderLockPath(this.port), { force: true });
    if (this.child.exitCode !== null) return { code: this.child.exitCode, escalated: false };
    const exited = onExit(this.child, 'exit');
    this.child.stdin?.end();
    let escalated = false;
    const escalate = setTimeout(() => {
      escalated = true;
      this.child.kill('SIGKILL');
    }, 5_000);
    escalate.unref();
    try {
      const [code] = (await exited) as [number | null];
      return { code, escalated };
    } finally {
      clearTimeout(escalate);
    }
  }

  private readMessages(): void {
    for (
      let newline = this.buffer.indexOf('\n');
      newline !== -1;
      newline = this.buffer.indexOf('\n')
    ) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line === '') continue;
      const message = JSON.parse(line) as JsonRpcResponse;
      this.lineBytes.set(message.id, Buffer.byteLength(line, 'utf8'));
      const resolve = this.pending.get(message.id);
      if (resolve === undefined) continue;
      this.pending.delete(message.id);
      resolve(message);
    }
  }
}

export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item: unknown) =>
    typeof item === 'object' && item !== null && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item as Record<string, unknown>).toSorted(([left], [right]) =>
            left < right ? -1 : 1,
          ),
        )
      : item,
  );
