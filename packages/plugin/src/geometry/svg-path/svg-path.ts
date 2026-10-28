import { arcTo, cubicTo, quadTo, smoothCubicTo, smoothQuadTo } from './curve-commands.js';
import { closePath, horizontalLineTo, lineTo, moveTo, verticalLineTo } from './line-commands.js';
import { PathScanner } from './path-scanner.js';
import { createPathState, type ControlHandle, type PathState } from './path-state.js';
import { ORIGIN, type Point } from './point.js';

type CommandHandler = (
  path: PathState,
  scanner: PathScanner,
  origin: Point,
) => ControlHandle | null;

const isMoveTo = (letter: string): boolean => letter === 'M' || letter === 'm';

const isClosePath = (letter: string): boolean => letter === 'Z' || letter === 'z';

const nextCommand = (scanner: PathScanner, previous: string | null): string => {
  const letter = scanner.readCommand();
  if (letter !== null && (previous !== null || isMoveTo(letter))) return letter;
  if (previous === null) throw new SyntaxError(`a path starts with M, not ${letter ?? 'a number'}`);
  if (isClosePath(previous)) throw scanner.error('a command after Z');
  return previous;
};

const handlerFor = (upperLetter: string): CommandHandler => {
  switch (upperLetter) {
    case 'M':
      return moveTo;
    case 'L':
      return lineTo;
    case 'H':
      return horizontalLineTo;
    case 'V':
      return verticalLineTo;
    case 'C':
      return cubicTo;
    case 'S':
      return smoothCubicTo;
    case 'Q':
      return quadTo;
    case 'T':
      return smoothQuadTo;
    case 'A':
      return arcTo;
    default:
      return closePath;
  }
};

const runCommand = (path: PathState, scanner: PathScanner, letter: string): string => {
  const upperLetter = letter.toUpperCase();
  const isRelative = letter !== upperLetter;
  const origin = isRelative ? path.current : ORIGIN;
  path.lastHandle = handlerFor(upperLetter)(path, scanner, origin);
  if (!isMoveTo(letter)) return letter;
  return isRelative ? 'l' : 'L';
};

export const toFigmaPathData = (data: string): string => {
  const scanner = new PathScanner(data);
  const path = createPathState();
  let command: string | null = null;
  while (!scanner.isDone()) {
    command = runCommand(path, scanner, nextCommand(scanner, command));
  }
  if (path.segments.length === 0) throw new SyntaxError('no path commands');
  return path.segments.join(' ');
};
