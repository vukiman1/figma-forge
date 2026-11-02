const PLUGIN_ORIGINS = new Set(['null', 'https://www.figma.com', 'https://figma.com']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const allowAnyOrigin = (): boolean => process.env.FIGMA_FORGE_ALLOW_ANY_ORIGIN === '1';

const hostnameFromHostHeader = (host: string): string => {
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end < 0 ? host : host.slice(0, end + 1);
  }
  const colon = host.indexOf(':');
  return colon < 0 ? host : host.slice(0, colon);
};

export const isAllowedHost = (host: string | undefined): boolean =>
  host !== undefined &&
  host.length > 0 &&
  LOOPBACK_HOSTS.has(hostnameFromHostHeader(host.toLowerCase()));

export const isAllowedWsOrigin = (origin: string | undefined): boolean => {
  if (allowAnyOrigin()) return true;
  if (origin === undefined || origin.length === 0) return true;
  return PLUGIN_ORIGINS.has(origin);
};

export const isAllowedHttpOrigin = (origin: string | undefined): boolean =>
  allowAnyOrigin() || origin === undefined || origin.length === 0;

export const hasContentType = (header: string | undefined, expected: string): boolean => {
  if (header === undefined) return false;
  const [type] = header.split(';');
  return type?.trim().toLowerCase() === expected;
};
