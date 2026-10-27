import React from "react";

export enum Heat {
  Cold = "cold",
  Tempered = "tempered",
  Glowing = "glowing",
}

interface StatusBarProps {
  readonly heat: Heat;
  readonly headline: string;
  readonly detail: string;
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
}

export function StatusBar({
  heat,
  headline,
  detail,
  collapsed,
  onToggleCollapsed,
}: StatusBarProps): React.JSX.Element {
  return (
    <header className="status-bar">
      <span className={`heat-mark heat-${heat}`} aria-hidden="true" />
      <div className="status-text" role="status" aria-live="polite">
        <span className="status-headline">{headline}</span>
        {!collapsed && <span className="status-detail">{detail}</span>}
      </div>
      <button
        type="button"
        className="collapse-toggle"
        onClick={onToggleCollapsed}
        title={collapsed ? "Expand" : "Minimize"}
        aria-label={collapsed ? "Expand" : "Minimize"}
        aria-expanded={!collapsed}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M1 3.5 L5 7 L9 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </header>
  );
}
