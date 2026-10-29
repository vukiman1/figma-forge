import type { z } from 'zod';

export class InvalidParamsError extends TypeError {
  override readonly name = 'InvalidParamsError';
}

const describeIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.map(String).join('.');
  return path === '' ? issue.message : `${path}: ${issue.message}`;
};

export const parseParams = <S extends z.ZodType>(
  tool: string,
  schema: S,
  raw: unknown,
): z.output<S> => {
  const result = schema.safeParse(raw ?? {});
  if (result.success) return result.data;
  const details = result.error.issues.map(describeIssue).join('; ');
  throw new InvalidParamsError(`${tool}: invalid params — ${details}`);
};
