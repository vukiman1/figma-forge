import type { ActivityParams } from '@figma-forge/core';

import type { PluginContextEvent } from '../../protocol/bridge.js';

export interface ActivityClaimInputs {
  readonly context: PluginContextEvent | null;
  readonly isForeground: boolean;
  readonly canServerReadForegroundFlag: boolean;
}

export const activityClaim = ({
  context,
  isForeground,
  canServerReadForegroundFlag,
}: ActivityClaimInputs): ActivityParams | null => {
  if (context === null) return null;
  if (!isForeground && !canServerReadForegroundFlag) return null;
  return {
    fileName: context.fileName,
    pageId: context.pageId,
    pageName: context.pageName,
    foreground: isForeground,
  };
};
