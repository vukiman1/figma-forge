type TokenRef =
  | {
      readonly cssVar: string;
      readonly utility?: string;
      readonly scssVar?: undefined;
      readonly from?: undefined;
    }
  | {
      readonly cssVar?: undefined;
      readonly utility: string;
      readonly scssVar?: undefined;
      readonly from?: undefined;
    }
  | {
      readonly cssVar?: undefined;
      readonly utility?: undefined;
      readonly scssVar: string;
      readonly from: string;
    };

export type ProjectToken = {
  readonly name: string;
  readonly value: string;
  readonly category?: string;
  readonly utilityIsClass?: boolean;
} & TokenRef;

export const refOf = (token: ProjectToken, utilityFirst: boolean): string => {
  if (utilityFirst && token.utilityIsClass === true && token.utility !== undefined) {
    return token.utility;
  }
  if (token.cssVar !== undefined) return token.cssVar;
  return token.utility ?? token.scssVar;
};
