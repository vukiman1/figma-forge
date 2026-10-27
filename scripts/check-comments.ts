import { globSync, readFileSync } from 'node:fs';

import { parseSync, type Comment } from 'oxc-parser';

interface Violation {
  readonly file: string;
  readonly line: number;
}

const LINT_DIRECTIVE = /^\s*(eslint|oxlint)-(disable(-next-line|-line)?\s+\S.*\s--\s\S|enable\b)/;
const TS_DIRECTIVE = /^\s*@ts-expect-error\s\S/;

const isAllowed = (comment: Comment): boolean =>
  LINT_DIRECTIVE.test(comment.value) || TS_DIRECTIVE.test(comment.value);

const lineOf = (source: string, offset: number): number =>
  source.slice(0, offset).split('\n').length;

const findViolations = (file: string): Violation[] => {
  const source = readFileSync(file, 'utf8');
  return parseSync(file, source)
    .comments.filter(comment => !isAllowed(comment))
    .map(comment => ({ file, line: lineOf(source, comment.start) }));
};

const IGNORED_SEGMENTS = ['/dist/', 'node_modules/'] as const;

const isSource = (file: string): boolean =>
  !IGNORED_SEGMENTS.some(segment => file.includes(segment));

const collectFiles = (patterns: readonly string[]): string[] => [
  ...new Set(patterns.flatMap(pattern => globSync(pattern)).filter(isSource)),
];

const printReport = (violations: readonly Violation[]): void => {
  const perFile = Map.groupBy(violations, violation => violation.file);
  const ranked = [...perFile].toSorted((a, b) => b[1].length - a[1].length);
  for (const [file, list] of ranked) console.log(`${String(list.length).padStart(5)}  ${file}`);
  console.log(`${violations.length} comments in ${perFile.size} files`);
};

const printViolations = (violations: readonly Violation[]): void => {
  for (const { file, line } of violations) console.error(`${file}:${line} comment not allowed`);
};

const [mode, ...patterns] = process.argv.slice(2);
const violations = collectFiles(patterns).flatMap(findViolations);

if (mode === '--report') printReport(violations);
if (mode === '--check') printViolations(violations);
if (mode === '--check' && violations.length > 0) process.exitCode = 1;
