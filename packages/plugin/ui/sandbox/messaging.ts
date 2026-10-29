import {
  isPluginContextEvent,
  type PluginBridgeMessage,
  type PluginContextEvent,
} from '../../protocol/bridge.js';
import type { HostYieldMessage } from '../../protocol/host-yield.js';
import type { PanelControlMessage } from '../../protocol/panel-control.js';

export type SandboxOutbound = PluginBridgeMessage | PanelControlMessage | HostYieldMessage;

type ParentFrame = { postMessage: (message: unknown, targetOrigin: string) => void };

type MessageTarget = {
  addEventListener?: (type: string, fn: (event: MessageEvent) => void) => void;
  removeEventListener?: (type: string, fn: (event: MessageEvent) => void) => void;
};

export const postToSandbox = (message: SandboxOutbound): void => {
  (globalThis as { parent?: ParentFrame }).parent?.postMessage({ pluginMessage: message }, '*');
};

export const onSandboxMessage = (listener: (message: unknown) => void): (() => void) => {
  const target = globalThis as MessageTarget;
  const onMessage = (event: MessageEvent): void => {
    const data: unknown = event.data;
    if (data === null || typeof data !== 'object') return;
    if ('pluginMessage' in data) listener(data.pluginMessage);
  };
  target.addEventListener?.('message', onMessage);
  return () => target.removeEventListener?.('message', onMessage);
};

export const onSandboxContext = (listener: (event: PluginContextEvent) => void): (() => void) =>
  onSandboxMessage(message => {
    if (isPluginContextEvent(message)) listener(message);
  });
