const EDITOR_LIMITATIONS: Readonly<Record<string, string>> = {
  dev:
    'Dev Mode blocks every write — nodes, pages, variables and styles alike. Reads, exports ' +
    '(screenshots, PDF) and plugin data still work. Switch the file to Design mode to make ' +
    'changes.',
  figjam:
    'FigJam has no components, variables or styles, so the tools that read or edit them fail ' +
    'there — frames, sections, shapes and text all work. Open a Figma Design file for the rest.',
};

const INSPECT_MODE = 'inspect';

export const editorLimitation = (editorType: string): string | null =>
  EDITOR_LIMITATIONS[editorType] ?? null;

export const withEditorContext = (message: string, editorType: string): string => {
  const limitation = editorLimitation(editorType);
  return limitation === null ? message : `${message} (editor: ${editorType} — ${limitation})`;
};

export const isEmbeddedInPanel = (mode: string): boolean => mode === INSPECT_MODE;
