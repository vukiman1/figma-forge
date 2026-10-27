import React from "react";
import { ActivityEntry, ActivityState, formatDuration } from "./activity";

interface ActivityListProps {
  readonly activity: readonly ActivityEntry[];
}

const STATE_SYMBOL = {
  [ActivityState.Running]: "",
  [ActivityState.Done]: "✓",
  [ActivityState.Failed]: "✕",
} as const satisfies Record<ActivityState, string>;

const describeEntry = (entry: ActivityEntry): string =>
  entry.nodeCount > 1 ? `${entry.label}, ${entry.nodeCount} layers` : entry.label;

export function ActivityList({ activity }: ActivityListProps): React.JSX.Element {
  if (activity.length === 0) {
    return (
      <p className="empty-note">
        Ask your AI tool to read or change this file. Each action it takes shows up here.
      </p>
    );
  }

  return (
    <ol className="activity-list" aria-label="Recent AI actions">
      {activity.map((entry) => (
        <li key={entry.requestId} className={`activity-row activity-${entry.state}`}>
          <span className="activity-symbol" aria-hidden="true">
            {STATE_SYMBOL[entry.state]}
          </span>
          <span className="activity-label">{describeEntry(entry)}</span>
          <span className="activity-time">
            {entry.durationMs === undefined ? "working" : formatDuration(entry.durationMs)}
          </span>
          {entry.error && <span className="activity-error">{entry.error}</span>}
        </li>
      ))}
    </ol>
  );
}
