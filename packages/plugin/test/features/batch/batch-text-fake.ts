import { SEGMENT_FIELDS } from '../../../src/features/batch/snapshot/text-fields.js';
import { MIXED, SOLID } from './batch-fake.js';

export type Fn = (...args: never[]) => unknown;
export type Run = Record<string, unknown>;

export const RUN_DEFAULTS: Run = {
  fontName: { family: 'Inter', style: 'Regular' },
  fontSize: 12,
  textCase: 'ORIGINAL',
  textDecoration: 'NONE',
  textDecorationStyle: null,
  textDecorationOffset: null,
  textDecorationThickness: null,
  textDecorationColor: null,
  textDecorationSkipInk: null,
  lineHeight: { unit: 'AUTO' },
  letterSpacing: { unit: 'PIXELS', value: 0 },
  fills: [SOLID(0)],
  listOptions: { type: 'NONE' },
  listSpacing: 0,
  indentation: 0,
  paragraphIndent: 0,
  paragraphSpacing: 0,
  textWrapStyle: 'AUTO',
  hyperlink: null,
  textStyleId: '',
  fillStyleId: '',
  boundVariables: {},
  openTypeFeatures: {},
};

export const TEXT_STYLED = new Set([
  'fontName',
  'fontSize',
  'textCase',
  'textDecoration',
  'lineHeight',
  'letterSpacing',
  'paragraphIndent',
  'paragraphSpacing',
]);
export const NO_RAW_SETTER = new Set([
  'textStyleId',
  'fillStyleId',
  'boundVariables',
  'openTypeFeatures',
]);
export const capital = (s: string): string => s[0]!.toUpperCase() + s.slice(1);

export const fakeText = (
  id: string,
  characters: string,
  base: Run = {},
): Record<string, unknown> => {
  let chars = characters;
  let runs: Run[] = Array.from(chars).map(() => Object.assign({}, RUN_DEFAULTS, base));
  const writeRun = (s: number, e: number, field: string, value: unknown): void => {
    for (let i = s; i < e; i += 1) {
      const run: Run = { ...runs[i]!, [field]: value };
      if (TEXT_STYLED.has(field)) run.textStyleId = '';
      if (field === 'fills') run.fillStyleId = '';
      const bound = { ...(run.boundVariables as Run) };
      delete bound[field];
      run.boundVariables = bound;
      runs[i] = run;
    }
  };
  const uniform = (field: string): unknown => {
    if (runs.length === 0) return { ...RUN_DEFAULTS, ...base }[field];
    const first = JSON.stringify(runs[0]![field]);
    return runs.every(r => JSON.stringify(r[field]) === first) ? runs[0]![field] : MIXED;
  };
  let nodeBound: Run = {};
  const node: Record<string, unknown> = {
    id,
    type: 'TEXT',
    parent: null,
    width: 100,
    height: 20,
    textAutoResize: 'WIDTH_AND_HEIGHT',
    textTruncation: 'DISABLED',
    maxLines: null,
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
    leadingTrim: 'NONE',
    hangingPunctuation: false,
    hangingList: false,
    getRangeAllFontNames: (s: number, e: number) => {
      const seen = new Map<string, unknown>();
      for (const r of runs.slice(s, e)) seen.set(JSON.stringify(r.fontName), r.fontName);
      return [...seen.values()];
    },
    getStyledTextSegments: (fields: string[]) => {
      const out: Run[] = [];
      runs.forEach((run, i) => {
        const pick = Object.fromEntries(fields.map(f => [f, run[f]]));
        const last = out.at(-1);
        if (
          last !== undefined &&
          JSON.stringify(fields.map(f => last[f])) === JSON.stringify(fields.map(f => pick[f]))
        ) {
          last.end = i + 1;
          last.characters = chars.slice(last.start as number, i + 1);
        } else {
          out.push({ characters: chars[i], start: i, end: i + 1, ...pick });
        }
      });
      return out;
    },
    resizeWithoutConstraints: (w: number, h: number) => {
      node.width = w;
      node.height = h;
      node.textAutoResize = 'NONE';
    },
    getRangeTextStyleId: (s: number, e: number) => {
      const ids = new Set(runs.slice(s, e).map(r => r.textStyleId));
      return ids.size === 1 ? [...ids][0] : MIXED;
    },
    getRangeFillStyleId: (s: number, e: number) => {
      const ids = new Set(runs.slice(s, e).map(r => r.fillStyleId));
      return ids.size === 1 ? [...ids][0] : MIXED;
    },
    setRangeTextStyleIdAsync: async (s: number, e: number, styleId: string) => {
      for (let i = s; i < e; i += 1) runs[i] = { ...runs[i]!, textStyleId: styleId };
    },
    setRangeFillStyleIdAsync: async (s: number, e: number, styleId: string) => {
      for (let i = s; i < e; i += 1) runs[i] = { ...runs[i]!, fillStyleId: styleId };
    },
    setRangeBoundVariable: (
      s: number,
      e: number,
      field: string,
      variable: { id: string } | null,
    ) => {
      for (let i = s; i < e; i += 1) {
        const bound = { ...(runs[i]!.boundVariables as Run) };
        if (variable === null) delete bound[field];
        else bound[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
        runs[i] = { ...runs[i]!, boundVariables: bound };
      }
    },
  };
  node.setBoundVariable = (field: string, variable: { id: string } | null) => {
    if (variable === null) {
      const { [field]: _gone, ...rest } = nodeBound;
      nodeBound = rest;
      for (let i = 0; i < runs.length; i += 1) {
        const bound = { ...(runs[i]!.boundVariables as Run) };
        delete bound[field];
        runs[i] = { ...runs[i]!, boundVariables: bound };
      }
      return;
    }
    if (field === 'characters') {
      nodeBound = { ...nodeBound, characters: { type: 'VARIABLE_ALIAS', id: variable.id } };
      return;
    }
    nodeBound = { ...nodeBound, [field]: [{ type: 'VARIABLE_ALIAS', id: variable.id }] };
    for (let i = 0; i < runs.length; i += 1) {
      const bound = {
        ...(runs[i]!.boundVariables as Run),
        [field]: { type: 'VARIABLE_ALIAS', id: variable.id },
      };
      runs[i] = { ...runs[i]!, boundVariables: bound };
    }
  };
  node.patchRun = (i: number, patch: Run) => {
    runs[i] = { ...runs[i]!, ...patch };
  };
  Object.defineProperty(node, 'characters', {
    enumerable: true,
    get: () => chars,
    set: (value: string) => {
      const { characters: _dropped, ...rest } = nodeBound;
      nodeBound = rest;
      const first = runs[0] ?? { ...RUN_DEFAULTS, ...base };
      chars = value;
      runs = Array.from(value).map(() => Object.assign({}, first));
    },
  });
  node.insertCharacters = (start: number, inserted: string, useStyle = 'BEFORE') => {
    const { characters: _dropped, ...rest } = nodeBound;
    nodeBound = rest;
    const from = useStyle === 'BEFORE' ? start - 1 : start;
    const style = runs[from] ?? runs[start] ?? runs[start - 1] ?? { ...RUN_DEFAULTS, ...base };
    chars = chars.slice(0, start) + inserted + chars.slice(start);
    runs.splice(start, 0, ...Array.from(inserted).map(() => Object.assign({}, style)));
  };
  node.deleteCharacters = (start: number, end: number) => {
    const { characters: _dropped, ...rest } = nodeBound;
    nodeBound = rest;
    chars = chars.slice(0, start) + chars.slice(end);
    runs.splice(start, end - start);
  };
  Object.defineProperty(node, 'boundVariables', { enumerable: true, get: () => nodeBound });
  for (const field of Object.keys(RUN_DEFAULTS).filter(f => f !== 'boundVariables')) {
    if (!NO_RAW_SETTER.has(field)) {
      node[`setRange${capital(field)}`] = (s: number, e: number, v: unknown) =>
        writeRun(s, e, field, v);
    }
    Object.defineProperty(node, field, {
      enumerable: true,
      configurable: true,
      get: () => uniform(field),
      set: (value: unknown) => {
        writeRun(0, chars.length, field, value);
      },
    });
  }
  return node;
};

export const segmentsOf = (text: Record<string, unknown>): unknown =>
  (text.getStyledTextSegments as (f: string[]) => unknown)([...SEGMENT_FIELDS]);
