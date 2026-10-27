import React from "react";

interface ConnectionHelpProps {
  readonly serverAddress: string;
}

export function ConnectionHelp({ serverAddress }: ConnectionHelpProps): React.JSX.Element {
  return (
    <section className="connection-help">
      <p>Figma Forge reaches your AI tool through a small server on this computer.</p>
      <ol>
        <li>
          Add the <code>figma-forge</code> MCP server to your AI tool.
        </li>
        <li>Start or restart the AI tool. This window connects on its own.</li>
      </ol>
      <p className="connection-address">Looking for the server at {serverAddress}</p>
    </section>
  );
}
