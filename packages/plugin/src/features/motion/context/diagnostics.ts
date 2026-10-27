import type { MotionDiagnostic } from '@figma-forge/core';

import { costOf, DIAGNOSTIC_TOKEN_BUDGET, MAX_DIAGNOSTICS, MAX_MESSAGE_CHARS } from './budget.js';

export interface DiagnosticLog {
  readonly entries: MotionDiagnostic[];
  omitted: number;
  add: (diagnostic: MotionDiagnostic) => void;
}

export const createDiagnosticLog = (): DiagnosticLog => {
  let spent = 0;
  const log: DiagnosticLog = {
    entries: [],
    omitted: 0,
    add: diagnostic => {
      const entry = { ...diagnostic, message: diagnostic.message.slice(0, MAX_MESSAGE_CHARS) };
      const cost = costOf(entry);
      if (log.entries.length < MAX_DIAGNOSTICS && spent + cost <= DIAGNOSTIC_TOKEN_BUDGET) {
        log.entries.push(entry);
        spent += cost;
      } else log.omitted += 1;
    },
  };
  return log;
};
