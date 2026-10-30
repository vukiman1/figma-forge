import { basename, dirname, extname } from 'node:path';

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const WORD_SEPARATORS = /[-_.\s]+/;
const INDEX_BASENAME = 'index';

export const isPascalCase = (name: string): boolean => PASCAL_CASE.test(name);

export const nameFromFile = (filePath: string): string => {
  const own = basename(filePath, extname(filePath));
  const base = own === INDEX_BASENAME ? basename(dirname(filePath)) : own;
  const words = base.split(WORD_SEPARATORS).filter(Boolean);
  const pascal = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  return pascal || base;
};
