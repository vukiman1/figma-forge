import { describe, expect, it } from 'vitest';

import { casefold } from '../../src/join/casefold.js';

describe('casefold', () => {
  it('folds the separator and case conventions the two sides disagree on', () => {
    for (const variant of ['Show icon', 'show-icon', 'show_icon', 'showIcon', 'SHOW ICON'])
      expect(casefold(variant)).toBe('showicon');
  });

  it('strips Latin diacritics so an accented label matches an ASCII identifier', () => {
    expect(casefold('Café')).toBe(casefold('Cafe'));
    expect(casefold('Ünï-Tëst')).toBe('unitest');
  });

  it('keeps letters and digits in every script, distinctly', () => {
    const folded = ['按鈕', 'ボタン', '버튼', 'Кнопка', 'κουμπί'].map(casefold);
    expect(folded.every(f => f.length > 0)).toBe(true);
    expect(new Set(folded).size).toBe(folded.length);
  });

  it('recomposes so Hangul stays syllables rather than decomposed jamo', () => {
    expect(casefold('버튼')).toBe('버튼');
    expect(Array.from(casefold('버튼'))).toHaveLength(2);
  });

  it('drops separators and symbols entirely', () => {
    expect(casefold('Button/Primary')).toBe('buttonprimary');
    expect(casefold('🔍 Search')).toBe('search');
    expect(casefold('   ')).toBe('');
  });
});
