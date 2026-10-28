import { describe, expect, it } from 'vitest';

import { toFigmaPathData } from '../../src/geometry/svg-path/svg-path.js';

type Segment = readonly [command: string, numbers: readonly number[]];

const FIGMA_DIALECT = /^[MLCQZ](?: -?\d+(?:\.\d+)?)*(?: [MLCQZ](?: -?\d+(?:\.\d+)?)*)*$/;

const segmentsOf = (d: string): Segment[] =>
  d
    .split(/ (?=[MLCQZ])/)
    .map(part => [part.charAt(0), part.slice(1).trim().split(' ').filter(Boolean).map(Number)]);

const approximately = (segments: readonly Segment[]): unknown[] =>
  segments.map(([command, numbers]) => [command, numbers.map(n => expect.closeTo(n, 5))]);

const lastPointOf = (d: string): readonly number[] => segmentsOf(d).at(-1)?.[1].slice(-2) ?? [];

describe('toFigmaPathData', () => {
  it('leaves Figma’s own form as it is', () => {
    const d = 'M 0 11.547 C 40 -28.453 80 51.547 120 11.547 L 3 4 Q 1 2 3 4 Z';
    expect(toFigmaPathData(d)).toBe(d);
  });

  it.each([
    ['H / V become lines', 'M 0 0 H 50 V 30', 'M 0 0 L 50 0 L 50 30'],
    [
      'relative commands, from the current point',
      'm 1 2 l 10 10 h 5 v -3',
      'M 1 2 L 11 12 L 16 12 L 16 9',
    ],
    ['pairs after a moveto are linetos', 'M 0 0 10 0 10 10', 'M 0 0 L 10 0 L 10 10'],
    ['pairs after a relative moveto are relative linetos', 'm 5 5 1 0 0 1', 'M 5 5 L 6 5 L 6 6'],
    ['commas and numbers run together', 'M1.5.5-1-2L3,4', 'M 1.5 0.5 L -1 -2 L 3 4'],
    ['exponents', 'M 1e1 2E-1 L 0 0', 'M 10 0.2 L 0 0'],
    [
      'repeated curve arguments',
      'M0 0c1 1 2 1 3 0 1-1 2-1 3 0',
      'M 0 0 C 1 1 2 1 3 0 C 4 -1 5 -1 6 0',
    ],
  ])('%s', (_label, input, output) => {
    expect(toFigmaPathData(input)).toBe(output);
  });

  it('spells out S and T: the reflected handle, or the current point when nothing precedes', () => {
    expect(toFigmaPathData('M 0 0 C 10 10 20 10 30 0 S 50 -10 60 0')).toBe(
      'M 0 0 C 10 10 20 10 30 0 C 40 -10 50 -10 60 0',
    );
    expect(toFigmaPathData('M 0 0 L 5 5 S 10 0 20 0')).toBe('M 0 0 L 5 5 C 5 5 10 0 20 0');
    expect(toFigmaPathData('M 0 0 Q 5 10 10 0 T 20 0 T 30 0')).toBe(
      'M 0 0 Q 5 10 10 0 Q 15 -10 20 0 Q 25 10 30 0',
    );
    expect(toFigmaPathData('M 0 0 T 10 0')).toBe('M 0 0 Q 0 0 10 0');
  });

  it('reflects only a handle of the same curve family: S after Q starts at the current point', () => {
    expect(toFigmaPathData('M 0 0 Q 5 10 10 0 S 20 0 30 0')).toBe(
      'M 0 0 Q 5 10 10 0 C 10 0 20 0 30 0',
    );
  });

  it('starts a command after Z where the closed subpath began', () => {
    expect(toFigmaPathData('M 2 2 h 20 v 20 z l 3 3 Z m 1 1 l 1 0')).toBe(
      'M 2 2 L 22 2 L 22 22 Z M 2 2 L 5 5 Z M 3 3 L 4 3',
    );
  });

  it('rewrites an arc as cubic Béziers of at most a quarter turn each, on the circle', () => {
    const k = 10 * 0.5522847498;
    expect(segmentsOf(toFigmaPathData('M 0 0 A 10 10 0 0 1 20 0'))).toEqual(
      approximately([
        ['M', [0, 0]],
        ['C', [0, -k, 10 - k, -10, 10, -10]],
        ['C', [10 + k, -10, 20, -k, 20, 0]],
      ]),
    );
  });

  it('sends an arc with the other sweep flag round the other side of the chord', () => {
    const below = segmentsOf(toFigmaPathData('M 0 0 A 10 10 0 0 0 20 0'));
    expect(below[1]?.[1][5]).toBeCloseTo(10, 5);
  });

  it('reads compact arc flags, as minified icon paths write them', () => {
    expect(toFigmaPathData('M10 10a5 5 0 105 5')).toBe(toFigmaPathData('M 10 10 a 5 5 0 1 0 5 5'));
    expect(toFigmaPathData('M0 0a1 1 0 0010 0')).toBe(toFigmaPathData('M0 0 a 1 1 0 0 0 10 0'));
  });

  it.each([
    ['M 0 0 A 1 1 0 0 1 20 0', 20, 0],
    ['M 3 4 a 7 3 30 1 0 -9 11', -6, 15],
    ['M 0 0 A 5 9 -45 1 1 4 4', 4, 4],
  ])('ends the arc %j exactly on its end point', (d, endX, endY) => {
    const out = toFigmaPathData(d);
    const [x, y] = lastPointOf(out);
    expect(x).toBeCloseTo(endX, 6);
    expect(y).toBeCloseTo(endY, 6);
    expect(segmentsOf(out).length).toBeGreaterThan(2);
  });

  it('scales up arc radii too small to reach the end point, as SVG 1.1 F.6.6 prescribes', () => {
    expect(toFigmaPathData('M 0 0 A 1 1 0 0 1 20 0')).toBe(
      toFigmaPathData('M 0 0 A 10 10 0 0 1 20 0'),
    );
  });

  it('keeps every point of a three-quarter arc within 0.027% of the radius from its circle', () => {
    const out = segmentsOf(toFigmaPathData('M 10 0 A 10 10 0 1 1 0 -10'));
    let [px, py] = [10, 0];
    for (const [, c] of out.slice(1)) {
      const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0] = c;
      for (let t = 0; t <= 1; t += 1 / 16) {
        const m = 1 - t;
        const x = m ** 3 * px + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t ** 3 * x3;
        const y = m ** 3 * py + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t ** 3 * y3;
        expect(Math.abs(Math.hypot(x, y) - 10)).toBeLessThan(10 * 2.8e-4);
      }
      [px, py] = [x3, y3];
    }
    expect(out).toHaveLength(4);
  });

  it('draws a zero-radius arc as a line and drops one that goes nowhere', () => {
    expect(toFigmaPathData('M 0 0 A 0 5 0 0 1 10 0')).toBe('M 0 0 L 10 0');
    expect(toFigmaPathData('M 0 0 A 5 5 0 0 1 0 0 L 1 1')).toBe('M 0 0 L 1 1');
  });

  it('always writes Figma’s dialect: no exponents, no negative zero', () => {
    const out = toFigmaPathData('M 1e-9 -0 L 1e14 0.0000001 a 3 3 0 0 1 6 0 s 1 1 2 0 t 4 0');
    expect(out).toMatch(FIGMA_DIALECT);
    expect(out.startsWith('M 0 0 L')).toBe(true);
  });

  it('rounds to six decimals, far below a pixel', () => {
    expect(toFigmaPathData('M 0.1234567 -2.0000004')).toBe('M 0.123457 -2');
  });

  it('refuses a number past 1e15, which would print in exponent form Figma cannot read', () => {
    expect(toFigmaPathData('M 0 0 L 999999999999999 0')).toBe('M 0 0 L 999999999999999 0');
    expect(() => toFigmaPathData('M 0 0 L 1e15 0')).toThrow(
      new RangeError('coordinate 1000000000000000 is out of range'),
    );
  });

  it('allows at most one comma between numbers', () => {
    expect(() => toFigmaPathData('M 0 0 L 1,,2')).toThrow(
      new SyntaxError('expected a number at character 10 (",2")'),
    );
  });

  it.each([
    ['L 1 1', 'a path starts with M, not L'],
    ['5 5', 'a path starts with M, not a number'],
    ['M 0 0 L 1e21 0', 'coordinate 1e+21 is out of range'],
    ['M 0 0 Z 4 4', 'expected a command after Z at character 8'],
    ['M 0 0 L 1', 'expected a number at character 9 (end of data)'],
    ['M 0 0 A 1 1 0 2 0 3 3', 'expected an arc flag (0 or 1) at character 14'],
    ['M 0 0 X 1', 'expected a number at character 6 ("X 1")'],
    ['   ', 'no path commands'],
  ])('names where %j goes wrong', (input, message) => {
    expect(() => toFigmaPathData(input)).toThrow(message);
  });
});
