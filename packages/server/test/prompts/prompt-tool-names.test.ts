import { describe, expect, it } from 'vitest';

import { PROMPTS } from '../../src/prompts/registry.js';
import { ALL_TOOL_SPECS } from '../../src/tools/registry.js';

const TOOL_NAMES = new Set(ALL_TOOL_SPECS.map(spec => spec.name));

const ALLOWLIST = new Set<string>([]);

const SNAKE_CASE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;

describe('prompt tool-name guard', () => {
  for (const prompt of PROMPTS) {
    it(`${prompt.definition.name}: every snake_case token is a registry tool or allowlisted`, () => {
      const result = prompt.build({});
      const text = result.messages
        .map(m => (m.content.type === 'text' ? m.content.text : ''))
        .join('\n');
      expect(text.length).toBeGreaterThan(0);
      const tokens = [...new Set([...text.matchAll(SNAKE_CASE)].map(m => m[0]))];

      expect(tokens.length).toBeGreaterThan(0);
      const offenders = tokens.filter(t => !TOOL_NAMES.has(t) && !ALLOWLIST.has(t));
      expect(offenders).toEqual([]);
    });
  }
});
