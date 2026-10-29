import { describe, expect, it } from 'vitest';

import {
  editorLimitation,
  isEmbeddedInPanel,
  withEditorContext,
} from '../../protocol/editor-context.js';

describe('editorLimitation', () => {
  it('describes what Dev Mode and FigJam refuse', () => {
    expect(editorLimitation('dev')).toContain('blocks every write');
    expect(editorLimitation('figjam')).toContain('no components, variables or styles');
  });

  it('does not claim FigJam lacks frames, sections, shapes or text, which all work there (verified live)', () => {
    const figjam = editorLimitation('figjam') ?? '';

    expect(figjam).not.toContain('no frames');
    expect(figjam).toContain('frames, sections, shapes and text all work');
  });

  it('states the ban over every kind of write, since Dev Mode rejects pages, variables and styles as well as nodes (verified live)', () => {
    const dev = editorLimitation('dev') ?? '';

    expect(dev).toContain('nodes, pages, variables and styles');
    expect(dev).toContain('Design mode');
  });

  it('has nothing to say about Figma Design', () => {
    expect(editorLimitation('figma')).toBeNull();
  });

  it('stays silent for editors the manifest never opts into', () => {
    expect(editorLimitation('slides')).toBeNull();
    expect(editorLimitation('buzz')).toBeNull();
    expect(editorLimitation('')).toBeNull();
  });
});

describe('withEditorContext', () => {
  it('names the editor alongside the error the API already raised', () => {
    const message = withEditorContext('Cannot write to document', 'dev');

    expect(message).toContain('Cannot write to document');
    expect(message).toContain('editor: dev');
    expect(message).toContain('blocks every write');
  });

  it('keeps the original message intact, adding the environment rather than a diagnosis', () => {
    expect(withEditorContext('node 1:2 not found', 'figjam')).toMatch(/^node 1:2 not found /);
  });

  it('leaves Figma Design errors untouched', () => {
    expect(withEditorContext('boom', 'figma')).toBe('boom');
  });
});

describe('isEmbeddedInPanel', () => {
  it('is true only in Dev Mode’s Inspect panel', () => {
    expect(isEmbeddedInPanel('inspect')).toBe(true);
    expect(isEmbeddedInPanel('default')).toBe(false);
    expect(isEmbeddedInPanel('textreview')).toBe(false);
  });

  it('does not claim codegen, a mode this manifest cannot reach', () => {
    expect(isEmbeddedInPanel('codegen')).toBe(false);
  });
});
