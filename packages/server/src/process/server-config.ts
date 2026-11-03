import { DEFAULT_PORT } from '@figma-forge/core';

import pkg from '../../package.json' with { type: 'json' };

export const SERVER_NAME = 'figma-forge';
export const SERVER_VERSION = pkg.version;

const MAX_PORT = 65_535;

const envPort = Number(process.env.FIGMA_FORGE_PORT);

export const SERVER_PORT =
  Number.isInteger(envPort) && envPort > 0 && envPort <= MAX_PORT ? envPort : DEFAULT_PORT;

export const log = (message: string): void => {
  process.stderr.write(`${message}\n`);
};
