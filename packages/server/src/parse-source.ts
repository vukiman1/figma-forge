import { type Program, parseSync } from 'oxc-parser';

export interface ParsedSource {
  readonly program: Program;
  readonly hasErrors: boolean;
}

export const parseSource = (filePath: string, code: string): ParsedSource | null => {
  try {
    const result = parseSync(filePath, code);
    return { program: result.program, hasErrors: result.errors.length > 0 };
  } catch {
    return null;
  }
};
