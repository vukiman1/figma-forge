export type Tab = 'activity' | 'context' | 'debug';

export const TABS = [
  ['activity', 'Activity'],
  ['context', 'Context'],
  ['debug', 'Debug'],
] as const satisfies ReadonlyArray<readonly [Tab, string]>;
