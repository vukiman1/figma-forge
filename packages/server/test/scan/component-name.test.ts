import { describe, expect, it } from 'vitest';

import { nameFromFile } from '../../src/scan/component-name.js';

describe('nameFromFile', () => {
  it('PascalCases kebab and uses parent dir for index files', () => {
    expect(nameFromFile('ui/user-card.tsx')).toBe('UserCard');
    expect(nameFromFile('components/Button/index.tsx')).toBe('Button');
    expect(nameFromFile('a/b/data_table.vue')).toBe('DataTable');
  });
});
