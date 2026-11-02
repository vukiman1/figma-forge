export const iconLabel = (raw: string): string => {
  const segments = raw
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean);
  while (segments.length > 1 && /^ic(on)?s?$/i.test(segments[0] ?? '')) segments.shift();
  const last = segments.at(-1) ?? raw;
  return last.replace(/^ic(on)?s?[-_]/i, '').trim();
};
