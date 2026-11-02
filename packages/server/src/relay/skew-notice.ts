import { checkPluginCompatibility, pluginSkewNotice, pluginSkewSummary } from '@figma-forge/core';

import type { Session } from './session.js';

export const skewNoticeFor = (session: Session, serverVersion: string): string | null => {
  if (checkPluginCompatibility(session.clientVersion, serverVersion)) return null;
  if (session.skewExplained) return pluginSkewSummary(session.clientVersion, serverVersion);
  session.skewExplained = true;
  return pluginSkewNotice(session.clientVersion, serverVersion);
};
