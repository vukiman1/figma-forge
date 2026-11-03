import { once } from 'node:events';
import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { onText } from './_helpers.js';

const SAMPLE = 'é get_node_motion’s raw read — 界 😀.';

const decodeInPieces = async (pieces: Buffer[]): Promise<string> => {
  const stream = new PassThrough();
  let received = '';
  onText(stream, text => {
    received += text;
  });
  for (const piece of pieces) stream.write(piece);
  stream.end();
  await once(stream, 'end');
  return received;
};

const BYTES = Buffer.from(SAMPLE, 'utf8');

const cutAt = (...offsets: number[]): Buffer[] =>
  [0, ...offsets].map((start, i) => BYTES.subarray(start, offsets[i] ?? BYTES.length));

const OFFSETS = Array.from({ length: BYTES.length - 1 }, (_, i) => i + 1);

describe('onText', () => {
  it('keeps every character whole when one boundary splits the text, wherever it falls', async () => {
    const decoded = await Promise.all(OFFSETS.map(a => decodeInPieces(cutAt(a))));
    expect(decoded.filter(text => text !== SAMPLE)).toEqual([]);
  });

  it('keeps every character whole when two boundaries split the text, wherever they fall', async () => {
    const pairs = OFFSETS.flatMap(a => OFFSETS.filter(b => b > a).map(b => [a, b]));
    const decoded = await Promise.all(pairs.map(pair => decodeInPieces(cutAt(...pair))));
    expect(decoded.filter(text => text !== SAMPLE)).toEqual([]);
  });

  it('keeps every character whole when the text arrives one byte per chunk', async () => {
    expect(await decodeInPieces(cutAt(...OFFSETS))).toBe(SAMPLE);
  });
});
