const BYTES_PER_KILOBYTE = 1024;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const CLOCK_FIELD_WIDTH = 2;

export const formatSize = (bytes: number): string =>
  bytes < BYTES_PER_KILOBYTE ? `${bytes} B` : `${(bytes / BYTES_PER_KILOBYTE).toFixed(1)} KB`;

const padClockField = (value: number): string => String(value).padStart(CLOCK_FIELD_WIDTH, '0');

export const formatClockTime = (timestamp: number): string => {
  const at = new Date(timestamp);
  return [at.getHours(), at.getMinutes(), at.getSeconds()].map(padClockField).join(':');
};

export const formatRelativeTime = (timestamp: number, now: number): string => {
  const seconds = Math.max(0, Math.round((now - timestamp) / MS_PER_SECOND));
  if (seconds < 1) return 'now';
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  return minutes < MINUTES_PER_HOUR ? `${minutes}m` : `${Math.floor(minutes / MINUTES_PER_HOUR)}h`;
};
