export type SandboxToolHandler = (params: unknown) => unknown;

export type SandboxHandlers = Record<string, SandboxToolHandler>;
