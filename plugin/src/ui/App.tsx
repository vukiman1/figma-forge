import React, { useEffect, useState } from "react";
import { ActivityList } from "./ActivityList";
import { ActivityEntry, ActivityState } from "./activity";
import { ConnectionHelp } from "./ConnectionHelp";
import { Heat, StatusBar } from "./StatusBar";
import { WS_BASE_URL, useBridgeConnection } from "./useBridgeConnection";

interface PluginStatus {
  readonly fileName: string;
  readonly fileKey: string;
  readonly selectionCount: number;
}

const SERVER_ADDRESS = new URL(WS_BASE_URL).host;

const describeSelection = (count: number): string => {
  if (count === 0) return "Nothing selected";
  return count === 1 ? "1 layer selected" : `${count} layers selected`;
};

const describeHeat = (connected: boolean, runningEntry: ActivityEntry | undefined): Heat => {
  if (!connected) return Heat.Cold;
  return runningEntry ? Heat.Glowing : Heat.Tempered;
};

const describeHeadline = (heat: Heat, runningEntry: ActivityEntry | undefined): string => {
  if (heat === Heat.Cold) return "Waiting for the Forge server";
  return runningEntry ? `Working: ${runningEntry.label}` : "Connected";
};

export default function App(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<PluginStatus>({
    fileName: "Unknown file",
    fileKey: "",
    selectionCount: 0,
  });
  const { connected, activity } = useBridgeConnection(status.fileKey, status.fileName);

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const message = event.data?.pluginMessage;
      if (message?.type === "plugin-status") setStatus(message.payload);
      if (message?.type === "ui-collapse-state") setCollapsed(message.payload?.collapsed === true);
    };

    window.addEventListener("message", handleMessage);
    // The main thread reads the persisted state asynchronously, so ask for it
    // on mount rather than relying on a broadcast we may have missed.
    parent.postMessage({ pluginMessage: { type: "request-ui-state" } }, "*");
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const toggleCollapsed = (): void => {
    const next = !collapsed;
    setCollapsed(next);
    parent.postMessage({ pluginMessage: { type: "set-ui-collapsed", collapsed: next } }, "*");
  };

  const runningEntry = activity.find((entry) => entry.state === ActivityState.Running);
  const heat = describeHeat(connected, runningEntry);

  return (
    <div className="container">
      <StatusBar
        heat={heat}
        headline={describeHeadline(heat, runningEntry)}
        detail={`${status.fileName}, ${describeSelection(status.selectionCount)}`}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      {!collapsed && (
        <main className="body">
          {connected ? (
            <ActivityList activity={activity} />
          ) : (
            <ConnectionHelp serverAddress={SERVER_ADDRESS} />
          )}
        </main>
      )}
    </div>
  );
}
