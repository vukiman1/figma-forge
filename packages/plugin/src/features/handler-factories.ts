import type { SandboxToolHandler } from '../dispatcher.js';

export type HandlerFactory = (figmaCtx: typeof figma) => SandboxToolHandler;

export type HandlerFactories = Readonly<Record<string, HandlerFactory>>;
