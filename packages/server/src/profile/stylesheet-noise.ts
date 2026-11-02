export const INTERPOLATION_MARK = '�';

const LINE_CONTINUATION = /\\\r?\n[ \t]*/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const QUOTED_STRING = /(['"])(?:\\.|(?!\1)[^\\\n])*\1/g;
const LINE_COMMENT = /\/\/[^\n]*/g;
const INTERPOLATION = /[#@$]\{[^}]*\}/g;

export const stripStylesheetNoise = (body: string): string =>
  body
    .replace(LINE_CONTINUATION, '')
    .replace(BLOCK_COMMENT, ' ')
    .replace(QUOTED_STRING, '""')
    .replace(LINE_COMMENT, ' ')
    .replace(INTERPOLATION, INTERPOLATION_MARK);
