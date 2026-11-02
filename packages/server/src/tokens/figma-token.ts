export type FigmaTokenValue = string | number | boolean | null;

export interface FigmaToken {
  readonly name: string;
  readonly value: FigmaTokenValue;
  readonly type: string;
  readonly collection?: string;
  readonly modes?: Readonly<Record<string, FigmaTokenValue>>;
  readonly scopes?: readonly string[];
  readonly source?: 'style';
}
