export const MAX_ACTIVITY_ENTRIES = 30;

export enum ActivityState {
  Running = "running",
  Done = "done",
  Failed = "failed",
}

export interface ActivityEntry {
  readonly requestId: string;
  readonly label: string;
  readonly nodeCount: number;
  readonly startedAt: number;
  readonly state: ActivityState;
  readonly durationMs?: number;
  readonly error?: string;
}

const VERB_BY_PREFIX = {
  get: "Read",
  set: "Update",
  create: "Create",
  delete: "Delete",
  duplicate: "Duplicate",
  remove: "Remove",
  apply: "Apply",
  run: "Run",
} as const satisfies Record<string, string>;

const isKnownPrefix = (prefix: string): prefix is keyof typeof VERB_BY_PREFIX =>
  prefix in VERB_BY_PREFIX;

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

export const describeRequest = (requestType: string): string => {
  const [prefix, ...rest] = requestType.split("_");
  const verb = isKnownPrefix(prefix) ? VERB_BY_PREFIX[prefix] : capitalize(prefix);
  return [verb, ...rest].join(" ");
};

export const formatDuration = (durationMs: number): string =>
  durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(1)} s`;
