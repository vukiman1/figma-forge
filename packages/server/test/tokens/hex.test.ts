import { describe, expect, it } from 'vitest';

import { normHex } from '../../src/tokens/hex.js';

describe('normHex', () => {
  it('expands shorthand and uppercases', () => {
    expect(normHex('#abc')).toBe('#AABBCC');
  });

  it('drops a fully opaque alpha so #RRGGBBFF equals #RRGGBB', () => {
    expect(normHex('#6266f0ff')).toBe('#6266F0');
  });

  it('keeps a translucent alpha', () => {
    expect(normHex('#6266F080')).toBe('#6266F080');
  });

  it('ignores surrounding whitespace', () => {
    expect(normHex('  #fff ')).toBe('#FFFFFF');
  });

  it('rejects anything that is not a plain hex literal', () => {
    expect(normHex('rgb(0,0,0)')).toBeNull();
    expect(normHex('#ggg')).toBeNull();
    expect(normHex('#12')).toBeNull();
  });
});
