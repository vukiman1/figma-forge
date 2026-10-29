import type { Server as HttpServer } from 'node:http';

export const isAddressInUse = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE';

const boundPort = (http: HttpServer, requestedPort: number): number => {
  const address = http.address();
  return typeof address === 'object' && address !== null ? address.port : requestedPort;
};

export const bindPort = (http: HttpServer, port: number, host: string): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    const onListening = (): void => {
      http.removeListener('error', onError);
      resolve(boundPort(http, port));
    };
    const onError = (error: Error): void => {
      http.removeListener('listening', onListening);
      reject(error);
    };
    http.once('error', onError);
    http.once('listening', onListening);
    http.listen(port, host);
  });

export const closeAllConnections = (http: HttpServer): Promise<void> =>
  new Promise<void>(resolve => {
    http.close(() => resolve());
    http.closeAllConnections();
  });
