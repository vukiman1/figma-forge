import { casefold } from './casefold.js';
import type { ComponentOverride } from './component-mapping.js';

const MAP_HEADER_CELLS = new Set([
  'figma',
  'figma name',
  'figmaname',
  'name',
  'code',
  'path',
  'component',
  'token',
  'ref',
  'value',
  'css',
  'var',
  'cssvar',
  'mapping',
]);

const isSeparatorCell = (value: string): boolean => /^:?-+:?$/.test(value);

const parseArrowLine = (line: string): [string, string] | null => {
  const cells = line.split('->');
  if (cells.length !== 2 || cells[0] === undefined || cells[1] === undefined) return null;
  return [cells[0].trim(), cells[1].trim()];
};

const parseTableLine = (line: string): [string, string] | null => {
  if (!line.trim().startsWith('|')) return null;
  const cells = line
    .split('|')
    .map(cell => cell.trim())
    .filter(Boolean);
  return cells[0] === undefined || cells[1] === undefined ? null : [cells[0], cells[1]];
};

const isHeader = (figmaName: string, target: string): boolean =>
  MAP_HEADER_CELLS.has(figmaName.toLowerCase()) && MAP_HEADER_CELLS.has(target.toLowerCase());

export const parseMapLine = (line: string): [string, string] | null => {
  const mapping = line.includes('->') ? parseArrowLine(line) : parseTableLine(line);
  if (mapping === null) return null;
  const [figmaName, target] = mapping;
  if (figmaName.length === 0 || target.length === 0) return null;
  if (isSeparatorCell(target) || isHeader(figmaName, target)) return null;
  return mapping;
};

const createOverride = (target: string): ComponentOverride => {
  const filename = target.split('/').pop() ?? target;
  return { name: filename.replace(/\.[a-z]+$/i, ''), filePath: target };
};

export const parseMapFile = (markdown: string): Map<string, ComponentOverride> => {
  const mappings = new Map<string, ComponentOverride>();
  for (const line of markdown.split('\n')) {
    const row = parseMapLine(line);
    if (row === null) continue;
    const [figmaName, target] = row;
    const override = createOverride(target);
    mappings.set(figmaName, override);
    mappings.set(casefold(figmaName), override);
  }
  return mappings;
};
