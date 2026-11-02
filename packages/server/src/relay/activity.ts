import { ActivityParamsSchema } from '@figma-forge/core';

import type { Session } from './session.js';

export const applyActivity = (session: Session, params: unknown): void => {
  const parsed = ActivityParamsSchema.safeParse(params);
  if (parsed.success) {
    session.fileName = parsed.data.fileName;
    session.pageId = parsed.data.pageId;
    session.pageName = parsed.data.pageName;
  }
  if (!parsed.success || parsed.data.foreground !== false) {
    session.lastActivityAt = Date.now();
  }
};
