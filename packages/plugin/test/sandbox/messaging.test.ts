import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPluginContextEvent, createToolResult } from '../../protocol/bridge.js';
import { createPanelHide } from '../../protocol/panel-control.js';
import { onSandboxContext, onSandboxMessage, postToSandbox } from '../../ui/sandbox/messaging.js';

const postMessage = vi.fn<(message: unknown, targetOrigin: string) => void>();

const context = createPluginContextEvent({
  fileName: 'Design File',
  pageId: 'page-1',
  pageName: 'Page 1',
  selectionCount: 0,
  selection: [],
  editorType: 'figma',
  mode: 'default',
  apiVersion: '1.0.0',
});

const deliver = (pluginMessage: unknown): void => {
  globalThis.dispatchEvent(new MessageEvent('message', { data: { pluginMessage } }));
};

describe('postToSandbox', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps the message in a pluginMessage envelope', () => {
    vi.stubGlobal('parent', { postMessage });

    postToSandbox(createPanelHide());

    expect(postMessage).toHaveBeenCalledWith({ pluginMessage: createPanelHide() }, '*');
  });

  it('is a no-op without a parent frame, so the panel still renders in tests and plain browser tabs', () => {
    vi.stubGlobal('parent', undefined);

    expect(() => postToSandbox(createPanelHide())).not.toThrow();
  });
});

describe('onSandboxMessage', () => {
  const stops: Array<() => void> = [];

  beforeEach(() => {
    stops.length = 0;
  });

  afterEach(() => {
    while (stops.length > 0) stops.pop()?.();
  });

  const listen = (): ReturnType<typeof vi.fn> => {
    const listener = vi.fn<(message: unknown) => void>();
    stops.push(onSandboxMessage(listener));
    return listener;
  };

  it('unwraps the envelope before handing the message over', () => {
    const listener = listen();

    deliver({ hello: true });

    expect(listener).toHaveBeenCalledWith({ hello: true });
  });

  it('ignores Figma’s own iframe traffic, which carries no pluginMessage envelope', () => {
    const listener = listen();

    globalThis.dispatchEvent(new MessageEvent('message', { data: { other: 1 } }));
    globalThis.dispatchEvent(new MessageEvent('message', { data: null }));
    globalThis.dispatchEvent(new MessageEvent('message', { data: 'a string' }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers an explicitly sent null payload, leaving its rejection to the channel’s validator', () => {
    const listener = listen();

    deliver(null);

    expect(listener).toHaveBeenCalledWith(null);
  });

  it('stops delivering once unsubscribed', () => {
    const listener = vi.fn<(message: unknown) => void>();
    const stop = onSandboxMessage(listener);

    stop();
    deliver({ hello: true });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('onSandboxContext', () => {
  const stops: Array<() => void> = [];

  afterEach(() => {
    while (stops.length > 0) stops.pop()?.();
  });

  const listen = (): ReturnType<typeof vi.fn> => {
    const listener = vi.fn<(event: unknown) => void>();
    stops.push(onSandboxContext(listener));
    return listener;
  };

  it('delivers context pushes', () => {
    const listener = listen();

    deliver(context);

    expect(listener).toHaveBeenCalledWith(context);
  });

  it('passes over tool traffic and anything else on the wire rather than treating it as malformed', () => {
    const listener = listen();

    deliver(createToolResult({ id: 'req-1', result: { ok: true } }));
    deliver({ tag: '@figma-forge/bridge', kind: 'context' });
    deliver('not an object');

    expect(listener).not.toHaveBeenCalled();
  });
});
