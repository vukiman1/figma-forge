export interface PropsResult {
  readonly names: string[];
  readonly extracted: boolean;
}

export const UNKNOWN_PROPS: PropsResult = { names: [], extracted: false };
export const NO_PROPS: PropsResult = { names: [], extracted: true };

export const mergeProps = (results: readonly PropsResult[]): PropsResult => ({
  names: [...new Set(results.flatMap(result => result.names))],
  extracted: results.every(result => result.extracted),
});
