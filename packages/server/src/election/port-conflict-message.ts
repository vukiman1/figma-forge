import type { PortHolder } from './port-holder.js';

const findPortHolderHint = (port: number): string =>
  process.platform === 'win32'
    ? `netstat -ano | findstr :${port}`
    : `lsof -iTCP:${port} -sTCP:LISTEN`;

const suspendedNote = (holder: PortHolder): string => {
  if (!holder.stopped) return '';
  if (!holder.resumed) {
    return ' It is suspended (Ctrl-Z or kill -STOP) and could not be resumed automatically.';
  }
  return (
    ' It is suspended (Ctrl-Z or kill -STOP); a SIGCONT was just sent, so if that revived it ' +
    'this clears within seconds.'
  );
};

export const portConflictMessage = (port: number, holder?: PortHolder): string => {
  if (holder === undefined) {
    return (
      `port ${port} is held by a process that isn't answering as a Figma Forge leader, so Figma Forge ` +
      `can't reach your plugin. Free that port (e.g. ${findPortHolderHint(port)}) and ` +
      `Figma Forge takes it over automatically.`
    );
  }
  return (
    `port ${port} is held by a Figma Forge server (pid ${holder.pid}, v${holder.serverVersion}) that ` +
    `has stopped answering — it still owns the relay, so no plugin is reachable and no other ` +
    `server can take over.${suspendedNote(holder)} If it doesn't recover, kill ${holder.pid} and Figma Forge ` +
    `takes the port over automatically.`
  );
};
