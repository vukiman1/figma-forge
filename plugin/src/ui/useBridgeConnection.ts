import { useEffect, useRef, useState } from "react";
import { ActivityEntry, ActivityState, MAX_ACTIVITY_ENTRIES, describeRequest } from "./activity";

interface ServerRequest {
  readonly type: string;
  readonly requestId: string;
  readonly nodeIds?: readonly string[];
  readonly params?: Record<string, unknown>;
}

interface PluginResponse {
  readonly type: string;
  readonly requestId: string;
  readonly data?: unknown;
  readonly error?: string;
}

export interface BridgeConnection {
  readonly connected: boolean;
  readonly activity: readonly ActivityEntry[];
}

// `||` (not `??`) so an empty build-time value falls back to the default.
// A custom endpoint must also be listed in manifest.json's
// networkAccess.allowedDomains or Figma will block the connection.
export const WS_BASE_URL = import.meta.env.VITE_FIGMA_BRIDGE_WS || "ws://localhost:1994/ws";

const RECONNECT_DELAY_MS = 1500;

const isPluginResponse = (message: unknown): message is PluginResponse =>
  typeof message === "object" && message !== null && "requestId" in message;

const withRequest = (
  activity: readonly ActivityEntry[],
  request: ServerRequest
): readonly ActivityEntry[] => {
  const entry: ActivityEntry = {
    requestId: request.requestId,
    label: describeRequest(request.type),
    nodeCount: request.nodeIds?.length ?? 0,
    startedAt: performance.now(),
    state: ActivityState.Running,
  };
  return [entry, ...activity].slice(0, MAX_ACTIVITY_ENTRIES);
};

const withResponse = (
  activity: readonly ActivityEntry[],
  response: PluginResponse
): readonly ActivityEntry[] =>
  activity.map((entry) =>
    entry.requestId === response.requestId
      ? {
          ...entry,
          state: response.error ? ActivityState.Failed : ActivityState.Done,
          durationMs: performance.now() - entry.startedAt,
          error: response.error,
        }
      : entry
  );

export const useBridgeConnection = (fileKey: string, fileName: string): BridgeConnection => {
  const [connected, setConnected] = useState(false);
  const [activity, setActivity] = useState<readonly ActivityEntry[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const message: unknown = event.data?.pluginMessage;
      if (!isPluginResponse(message)) return;

      setActivity((previous) => withResponse(previous, message));
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify(message));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!fileKey) return;

    let disposed = false;

    const detach = (ws: WebSocket): void => {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
    };

    const connect = (): void => {
      if (disposed) return;
      if (socketRef.current) detach(socketRef.current);

      const wsUrl = `${WS_BASE_URL}?fileKey=${encodeURIComponent(fileKey)}&fileName=${encodeURIComponent(fileName)}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        parent.postMessage({ pluginMessage: { type: "ui-ready" } }, "*");
      };

      ws.onclose = () => {
        if (disposed || socketRef.current !== ws) return;
        setConnected(false);
        if (reconnectTimer.current === null) {
          reconnectTimer.current = window.setTimeout(() => {
            reconnectTimer.current = null;
            connect();
          }, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        if (disposed || socketRef.current !== ws) return;
        setConnected(false);
      };

      ws.onmessage = (event) => {
        if (disposed || socketRef.current !== ws) return;
        const request = JSON.parse(event.data) as ServerRequest;
        setActivity((previous) => withRequest(previous, request));
        parent.postMessage({ pluginMessage: { type: "server-request", payload: request } }, "*");
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (socketRef.current) {
        detach(socketRef.current);
        socketRef.current = null;
      }
    };
  }, [fileKey, fileName]);

  return { connected, activity };
};
