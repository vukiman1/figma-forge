import type { SandboxToolHandler } from '../runtime/sandbox-handler.js';

export type HandlerFactory = (figmaCtx: typeof figma) => SandboxToolHandler;

export type HandlerFactories = Readonly<Record<string, HandlerFactory>>;
